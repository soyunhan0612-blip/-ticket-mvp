# Step 2-3: polling-optimistic-rollback

## 읽어야 할 파일

- `/CLAUDE.md` — dynamic='force-dynamic' 규칙, mine boolean 규칙
- `/docs/ARCHITECTURE.md` — 상태 관리, 데이터 흐름, 폴링 페이로드 스키마
- `/docs/UI_GUIDE.md` — 좌석 시각 규칙 (4상태)
- 이전 step 산출물: `src/app/api/holds/route.ts`, `src/app/api/sessions/[id]/snapshot/route.ts`, `src/middleware.ts`, `src/atoms/seat.ts`, `src/components/seat/{SeatMap,Seat,ZoomPanSvg}.tsx`

## 작업

client 좌석맵을 서버와 연결. **탭 2개로 같은 회차를 열고 한쪽에서 잡으면 3~4초 안에 반대편이 회색화**되는 것이 이 step의 결승선.

### 1. Tanstack Query Provider

`src/app/providers.tsx`에 `QueryClientProvider` 추가 (Jotai Provider와 함께 감쌈).

```tsx
'use client';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchIntervalInBackground: false,   // ← 기본값이지만 명시. 심사자 탭 방치 방어
      staleTime: 0,
    },
  },
});
```

### 2. 좌석 페이지 RSC 셸 + prefetch

`src/app/(viewer)/sessions/[id]/seats/page.tsx`:

```tsx
export const dynamic = 'force-dynamic';  // ← CRITICAL. 없으면 옛 스냅샷이 캐시됨

export default async function SeatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;  // Next.js 15: dynamic params는 Promise
  const userId = await getUserId();
  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: ['snapshot', sessionId],
    queryFn: () => seatStore.getSnapshot(sessionId, userId),  // 서버에서 직접 호출
  });
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <SeatsClient sessionId={sessionId} />
    </HydrationBoundary>
  );
}
```

- `dynamic = 'force-dynamic'` 절대 지움 X (CLAUDE.md CRITICAL)
- prefetch에서 store 직접 호출 (같은 프로세스, fetch X)

### 3. `src/components/seat/SeatsClient.tsx`

```tsx
'use client';
export function SeatsClient({ sessionId }: { sessionId: string }) {
  const { data } = useQuery({
    queryKey: ['snapshot', sessionId],
    queryFn: async () => (await fetch(`/api/sessions/${sessionId}/snapshot`)).json() as Promise<SeatSnapshot>,
    refetchInterval: 3000,
  });
  // ... 좌석 페이지 UI: SeatMap + SelectionBar + HoldTimer
}
```

폴링 응답을 atom에 반영:
- `version`이 이전과 같으면 atom 갱신 생략
- 다르면 좌석 상태 diff만 반영 (available → 다른 상태 또는 그 반대만 업데이트)

### 4. 좌석 상태 atom 확장

`src/atoms/seat.ts`에 좌석의 **서버 상태** atom 추가:

```ts
export const seatServerStateAtomFamily = atomFamily((seatId: string) =>
  atom<{ s: 'held' | 'sold'; mine?: boolean; expiresAt?: number } | null>(null)
);
```

- 이전 step의 `seatSelectedAtomFamily`(로컬 선택)는 유지
- Seat 컴포넌트가 두 atom을 함께 구독해서 최종 색을 결정

Seat의 색 로직 (UI_GUIDE 4상태):
- server: null + selected: true → **선택됨(pending)** (강조 테두리)
- server: null + selected: false → **available**
- server.s: 'held', mine: true → **held-mine** (타이머 표시)
- server.s: 'held', mine: false → **held-other** (회색, 클릭 무시)
- server.s: 'sold' → **sold** (짙은 회색, 클릭 무시)

### 5. `src/components/seat/SelectionBar.tsx`

- 선택 좌석 카운트 표시
- **`선택 완료`** 버튼 → 선택 좌석 전체를 하나의 POST `/api/holds` 요청
- **낙관적 업데이트**: 요청 직전에 좌석들을 `held-mine` 상태로 즉시 반영
- 409 응답: 전체 롤백 (해당 좌석들의 선택 해제 + `held-other`로 전환은 다음 폴링이 정리)
  - 실패 좌석 정보(`conflicts`)를 토스트로 표시
- 200 응답: HoldTimer 시작 (`expiresAt`은 다음 폴링 응답에서 확정. 낙관적으로 `now + DEFAULT_HOLD_TTL_MS`로 임시 표시)

Tanstack Query `useMutation` 사용:
```ts
useMutation({
  mutationFn: (seatIds) => fetch('/api/holds', { method: 'POST', body: JSON.stringify({ sessionId, seatIds }) }).then(r => r.ok ? r.json() : Promise.reject(r)),
  onMutate: async (seatIds) => { /* atom 낙관적 held-mine */ return { seatIds }; },
  onError: async (err, seatIds, ctx) => { /* atom 롤백 + 토스트 */ await qc.invalidateQueries(['snapshot', sessionId]); },
  onSuccess: () => { /* HoldTimer 시작 */ },
});
```

### 6. `src/components/seat/HoldTimer.tsx`

- 남은 시간 mm:ss 표시
- **클라이언트 시계 신뢰 X**. 서버 응답의 `serverNow`와 `expiresAt` 차이로 남은 시간 계산 후, 클라이언트에서는 그 값에서 요청 왕복 시간만큼 감산
- 다음 폴링 응답으로 매 3초 보정
- 만료 시 `SelectionBar`에서 선택 해제, 다음 폴링에서 좌석 상태도 available로 정리됨

### 7. 토스트

간단한 상단 alert div 하나. 라이브러리 X (스코프 최소화).

## Acceptance Criteria

```bash
npm run test
npm run build
npm run dev &
sleep 3
# 수동 검증 시나리오:
#   1. 탭 A에서 /sessions/{id}/seats 열기
#   2. 탭 B(다른 브라우저 또는 시크릿)에서 같은 URL 열기 (서로 다른 uid 쿠키가 발급되어야 함)
#   3. A에서 좌석 3개 선택 → '선택 완료'
#   4. 3~4초 안에 B에서 해당 3개 좌석이 held-other 회색으로 변화
#   5. B에서 겹치는 좌석 포함해서 hold 시도 → 409 + 롤백 + 토스트
kill %1
```

## 검증 절차

1. AC + 수동 시나리오 통과.
2. 아키텍처 체크리스트:
   - `dynamic = 'force-dynamic'` 있음?
   - `refetchIntervalInBackground: false` (기본이지만 명시)?
   - `version` 같으면 atom 갱신 skip?
   - Seat이 여전히 `React.memo` + `atomFamily` 구독 격리 (Phase 1의 성능 특성 유지)?
   - 409 롤백 후 부분 hold 없이 원상복구?
   - 시크릿 창에서 좌석 페이지 접근 시 자기 uid 발급 → mine 판정 정상?
3. 결과에 따라 `phases/2-hold-polling/index.json`의 step 3을 업데이트:
   - 성공 → `"summary": "3초 폴링 + 낙관적 hold + 409 롤백 + HoldTimer. 탭 2개 충돌 시나리오 통과"`

## 금지사항

- `dynamic = 'force-dynamic'` 지우지 마라. 이유: RSC 캐시로 옛 스냅샷 노출 (CLAUDE.md CRITICAL)
- `refetchIntervalInBackground: true` 설정 마라. 이유: 심사자 탭 방치 시 API 낭비
- HoldTimer에서 `Date.now()`만으로 남은 시간 계산 마라. 이유: 클라이언트 시계 어긋남
- 좌석 클릭 즉시 hold 요청 보내지 마라. 이유: 4석 상한을 UI에서 인식 못 하고 서버 왕복이 폭발. 반드시 로컬 선택 → `선택 완료`
- 폴링 응답에 없는 좌석을 sold/held로 표시하지 마라. 없으면 available (스키마 계약)
- `useEffect` 의존성에 atom 값 넣어서 무한 루프 만들지 마라. atom 구독은 컴포넌트 리렌더 트리거이지 effect 의존성 아님
- 기존 테스트를 깨뜨리지 마라

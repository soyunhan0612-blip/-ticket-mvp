# Step 3: page-hydration

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 렌더링 경계 섹션 ("RSC 셸 + client 좌석맵, 초기 스냅샷 prefetch → HydrationBoundary")
- `/src/app/(viewer)/sessions/[id]/seats/page.tsx` — 현재 RSC 페이지
- `/src/components/seat/SeatMap.tsx` — 현재 SeatMap 컴포넌트
- `/src/components/seat/SelectionBar.tsx` — sessionId prop 전달 경로 확인
- `/src/components/providers.tsx` — QueryClient 설정 확인
- `/src/hooks/use-seat-snapshot.ts` — Step 1에서 생성됨
- `/src/services/index.ts` — getSeatStore() 팩토리
- `/src/lib/cookie.ts` — USER_ID_COOKIE_NAME

## 작업

### 1. `src/components/seat/SeatMapContainer.tsx` 생성

폴링 훅을 연결하는 클라이언트 래퍼 컴포넌트:

```tsx
"use client";

interface SeatMapContainerProps {
  sessionId: string;
  seats: readonly SeatType[];
}

export function SeatMapContainer({ sessionId, seats }: SeatMapContainerProps): JSX.Element;
```

- `useSeatSnapshot(sessionId)` 호출 — 폴링 시작 + atom 동기화
- `<SeatMap seats={seats} sessionId={sessionId} />` 렌더링

### 2. `src/app/(viewer)/sessions/[id]/seats/page.tsx` 수정

RSC에서 초기 스냅샷을 prefetch하고 `HydrationBoundary`로 클라이언트에 전달:

1. `QueryClient`를 생성하여 `prefetchQuery` 호출
2. `cookies()`에서 userId 쿠키를 읽어 `getSeatStore().getSnapshot(sessionId, userId)` 호출
3. `dehydrate(queryClient)`를 `<HydrationBoundary>`에 전달
4. `<SeatMap>` 대신 `<SeatMapContainer>`를 렌더링
5. `export const dynamic = "force-dynamic"` 유지 필수

쿠키 읽기: RSC에서는 `next/headers`의 `cookies()` API를 사용한다. `await cookies()`를 호출하고 `cookieStore.get(USER_ID_COOKIE_NAME)?.value`로 userId를 가져온다. `lib/cookie.ts`의 `getUserIdFromRequest`는 `Request` 객체용이므로 여기서는 사용하지 않는다.

### 3. `src/components/seat/SeatMap.tsx` 수정

`sessionId` prop을 추가하고 `<SelectionBar>`에 전달:

```tsx
interface SeatMapProps {
  seats: readonly SeatType[];
  sessionId: string;
}
```

`<SelectionBar sessionId={sessionId} />` 로 수정.

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `export const dynamic = "force-dynamic"`이 유지되는가?
   - `HydrationBoundary`가 사용되는가?
   - `getSeatStore().getSnapshot()`을 서버에서 호출하여 prefetch하는가?
   - userId를 `cookies()` API에서 읽는가?
   - SeatMap이 직접 폴링 훅을 호출하지 않고, SeatMapContainer가 담당하는가?
3. 결과에 따라 `phases/5-polling-optimistic/index.json`의 해당 step을 업데이트한다.

## 금지사항

- `export const dynamic = "force-dynamic"`을 제거하지 마라 — RSC 캐시 방지.
- SeatMap이 직접 폴링 훅을 호출하게 만들지 마라 (Container 패턴으로 관심사 분리).
- RSC에서 `getUserIdFromRequest`를 호출하지 마라 (Request 객체가 아닌 cookies() API 사용).
- 기존 테스트를 깨뜨리지 마라.

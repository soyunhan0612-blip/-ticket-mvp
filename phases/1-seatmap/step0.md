# Step 1-0: seatmap-v0-naive

## 읽어야 할 파일

- `/CLAUDE.md` — 개발 프로세스 (Day 3 순진한 구현은 반드시 별도 커밋)
- `/docs/ARCHITECTURE.md` — 좌석 성능 전략 섹션 전체 (before/after 서사)
- `/docs/ADR.md` — ADR-002 (atomFamily before/after 측정)
- `/docs/UI_GUIDE.md` — 좌석 시각 규칙 섹션
- 이전 phase 산출물: `src/types/index.ts`, `src/lib/{mock-data,seat-map,seat-rules}.ts`

## 작업

**이 step의 목적은 성능 서사의 "before"를 만드는 것**. 의도적으로 순진하게 짜서 클릭당 2000 리렌더를 발생시키고 측정한다. 다음 step에서 atomFamily로 개선한다.

### 1. `src/app/(viewer)/sessions/[id]/seats/page.tsx` — 좌석 페이지 셸

- `'use client'` 명시 (이 step은 client 렌더로만. Prefetch는 Phase 2에서 붙임)
- URL params에서 sessionId 읽고 mock-data에서 세션 + 좌석 프리셋 로드
- `<SeatMap seats={seats} />` 렌더

### 2. `src/components/seat/SeatMap.tsx` — 순진한 좌석맵

**의도적으로 최적화 없이**:

```tsx
'use client';
export function SeatMap({ seats }: { seats: Seat[] }) {
  const [selected, setSelected] = useState<string[]>([]);  // ← 전역 상태
  return (
    <svg viewBox="0 0 W H">
      {seats.map(seat => (
        <Seat
          key={seat.id}
          seat={seat}
          selected={selected.includes(seat.id)}   // ← 매 렌더마다 O(n) 검사
          onToggle={() => setSelected(prev => ...)}
        />
      ))}
    </svg>
  );
}
```

- `atomFamily` **금지** (다음 step의 개선 대상)
- `useMemo`로 selection Set 만들지 마라 (일부러 O(n²))
- `React.memo` 붙이지 마라
- `useCallback` 쓰지 마라

이렇게 짜야 **좌석 하나 토글 시 2000개 전부 리렌더** — 이게 서사의 근거.

### 3. `src/components/seat/Seat.tsx`

```tsx
export function Seat({ seat, selected, onToggle }: Props) {
  return <rect x={seat.x} y={seat.y} width={W} height={H} fill={selected ? '#colorA' : '#colorB'} onClick={onToggle} />;
}
```

- 색은 UI_GUIDE.md 좌석 시각 규칙의 4상태 중 available/held-mine 2가지만 이 step에서 사용 (held-other, sold는 Phase 2에서 폴링 붙일 때 등장)

### 4. 성능 측정 스크립트

React DevTools Profiler로 수동 측정은 지속성이 없다. 대신:

**`src/components/seat/__perf__/measure.tsx`** (제외 폴더로 `__perf__` 사용, ESLint에서 무시되도록):
- `wdyr` 없이도 되는 방식: `Seat` 컴포넌트에 `console.count('Seat:' + seat.id)` 임시 삽입 (**이 step 커밋 후 다음 step에서 제거**)
- 또는 렌더 카운터 store를 만들고 `useEffect(() => counter++, undefined)` 방식으로 렌더 수 집계

측정 결과는 `docs/perf/before.md`에 텍스트로 기록:
```
# Before (Step 1-0 naive)
- 좌석 수: 2000
- 초기 마운트: <N>ms (Chrome DevTools Performance 탭 스크린샷: before-mount.png)
- 클릭 1회 시 리렌더된 Seat 컴포넌트 수: 2000
- 커밋: <이 step의 커밋 SHA>
```

스크린샷 캡처는 사용자가 수동. 문서 자리만 만들어두고 값을 채운다.

### 5. **반드시 커밋**

execute.py가 2단계 커밋을 자동으로 하지만, **이 step의 코드 상태 자체가 다음 step에서 개선되는 근거**. 커밋 메시지에 `feat(seatmap): naive v0 for before-measurement (do not squash)` 같은 명확한 표시.

## Acceptance Criteria

```bash
npm run build
npm run test        # 새로 깨진 것 없음
npm run dev &
sleep 3
# 브라우저에서 /sessions/{id}/seats 접근 (수동)
kill %1
```

수동:
- 좌석 페이지에서 2000개 `<rect>`가 실제로 그려짐 (DevTools Elements 탭)
- 좌석 하나 클릭 시 console에 Seat 렌더 로그가 2000줄 근처로 찍힘
- `docs/perf/before.md`에 측정값 기록

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - `SeatMap`에 `atomFamily`, `React.memo`, `useMemo(Set)`, `useCallback`이 **없음**? (일부러 순진해야 함)
   - `Seat`이 `React.memo`로 감싸이지 **않음**?
   - 좌석 4상태 중 이 step에서 available/held-mine 2가지만 다룸? (나머지는 폴링 붙일 때)
   - `docs/perf/before.md`에 측정 결과 자리 있음?
3. 결과에 따라 `phases/1-seatmap/index.json`의 step 0을 업데이트:
   - 성공 → `"summary": "naive SeatMap (2000석 전역 배열 상태). before.md 자리 확보. 다음 step이 atomFamily로 개선"`

## 금지사항

- `atomFamily`를 쓰지 마라. 이유: 다음 step에서 도입해서 before/after 서사를 만든다. 여기서 미리 쓰면 서사 통째로 증발
- `React.memo`, `useMemo(Set)`, `useCallback`을 쓰지 마라. 같은 이유
- 이 step의 SeatMap을 다음 step에서 **삭제하지 말고 수정**한다. 커밋 히스토리에 naive 버전이 남아야 함
- ZoomPanSvg를 이 step에서 만들지 마라. 이유: Phase 1 Step 2 스코프
- Tanstack Query 폴링을 붙이지 마라. 이유: Phase 2 스코프
- 기존 테스트를 깨뜨리지 마라

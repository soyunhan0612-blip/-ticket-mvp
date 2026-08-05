# Step 1-1: atomfamily-optimization

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — 상태 관리 (Jotai atomFamily) + 좌석 성능 전략
- `/docs/ADR.md` — ADR-002 (트레이드오프: 초기 마운트는 개선 아님)
- 이전 step 산출물: `src/components/seat/{SeatMap,Seat}.tsx`, `docs/perf/before.md`

이전 step의 SeatMap을 꼼꼼히 읽어 어떤 부분이 O(n) 리렌더를 유발하는지 이해한 뒤 개선하라.

## 작업

좌석 단위 구독으로 클릭당 리렌더 수를 1~2개로 낮춘다.

### 1. `src/atoms/seat.ts` — atomFamily

```ts
import { atomFamily, atom } from 'jotai/utils';

// 각 좌석 ID마다 별도 atom. selected/unselected boolean만 담는다
export const seatSelectedAtomFamily = atomFamily((seatId: string) => atom(false));

// 선택된 좌석 목록은 별도 atom (SelectionBar에서 사용). 좌석 클릭 시 이 atom도 함께 업데이트
export const selectedSeatIdsAtom = atom<string[]>([]);
```

**`atoms/`는 tdd-guard 통과** (이전 step 0에서 예외 추가함). 단위 테스트가 필요하다고 판단하면 만들되, 필수 아님.

### 2. `src/app/providers.tsx` — Jotai Provider

- `'use client'`
- `<JotaiProvider>{children}</JotaiProvider>`
- `src/app/layout.tsx`에서 감쌈

Tanstack Query Provider는 아직 X (Phase 2 Step 3에서 함께).

### 3. `src/components/seat/SeatMap.tsx` — 개선

- 이제 SeatMap은 **선택 배열을 prop으로 내리지 않는다**
- Seat 컴포넌트 각각이 `useAtom(seatSelectedAtomFamily(seat.id))`으로 자기 상태만 구독

```tsx
export function SeatMap({ seats }: { seats: Seat[] }) {
  return <svg viewBox="..."> {seats.map(seat => <Seat key={seat.id} seat={seat} />)} </svg>;
}
```

### 4. `src/components/seat/Seat.tsx` — memo + atom 구독

```tsx
export const Seat = React.memo(function Seat({ seat }: { seat: Seat }) {
  const [selected, setSelected] = useAtom(seatSelectedAtomFamily(seat.id));
  const setList = useSetAtom(selectedSeatIdsAtom);
  const toggle = () => {
    setSelected(v => !v);
    setList(prev => selected ? prev.filter(id => id !== seat.id) : [...prev, seat.id]);
  };
  return <rect ... onClick={toggle} />;
});
```

- `React.memo`로 감싸서 부모 리렌더 시 skip
- `seat` prop은 불변이므로 얕은 비교 통과

### 5. `docs/perf/after.md`

동일한 측정 방식(이전 step에서 삽입한 console.count 또는 렌더 카운터)으로 재측정:

```
# After (Step 1-1 atomFamily)
- 좌석 수: 2000
- 초기 마운트: <N>ms (개선 없음 — 2000개 노드는 여전히 마운트)
- 클릭 1회 시 리렌더된 Seat 컴포넌트 수: 1~2
- 커밋: <이 step의 커밋 SHA>
```

**서사 정직**: 초기 마운트는 개선되지 않는다. 개선되는 건 업데이트 리렌더 수. after.md에도 명시.

### 6. 측정용 console.count 정리

이전 step에서 넣은 임시 로그를 여기서 제거. 측정은 이미 끝났고, 프로덕션에 남으면 노이즈.

## Acceptance Criteria

```bash
npm run build
npm run test
npm run dev &
sleep 3
# 좌석 페이지 재접근 (수동), 리렌더 수 확인
kill %1
```

수동:
- React DevTools Profiler로 좌석 1개 클릭 시 리렌더 컴포넌트 수 ≤ 2
- `docs/perf/after.md`에 값 기록

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - `Seat`이 `React.memo`로 감싸여 있음?
   - `SeatMap`이 선택 상태를 prop으로 내리지 **않음**?
   - `atoms/seat.ts`가 `atoms/` 폴더에 있음? (`components/` 안이 아니라)
   - after.md에 "초기 마운트는 개선 대상 아님" 문구가 정확히 들어있음? (과장 방지)
   - 임시 console.count 등 측정 로그가 다 제거됨?
3. 결과에 따라 `phases/1-seatmap/index.json`의 step 1을 업데이트:
   - 성공 → `"summary": "atomFamily + memo로 클릭당 리렌더 1~2개. before/after 문서 완료. Jotai Provider 붙임"`

## 금지사항

- 초기 마운트 시간을 "개선됐다"고 쓰지 마라. 이유: 2000개 노드는 여전히 만들어짐. 과장하면 면접에서 그 자리에서 깨짐 (ARCHITECTURE.md 명시)
- 이전 step의 naive SeatMap을 **삭제하지 마라**. 수정만. 이유: 커밋 히스토리에 v0가 남아야 함
- Tanstack Query Provider를 이 step에서 붙이지 마라. 이유: Phase 2 Step 3 스코프
- `atomFamily`에서 반환하는 atom에 큰 객체(전체 좌석 정보)를 담지 마라. boolean만. 이유: 구독 격리의 의미가 사라짐
- 폴링 관련 로직(refetchInterval 등) 넣지 마라. Phase 2 스코프
- 기존 테스트를 깨뜨리지 마라

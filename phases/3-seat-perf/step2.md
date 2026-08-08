# Step 2: seatmap-refactor — SeatMap에서 useState 제거

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — 좌석 성능 전략 섹션
- `/CLAUDE.md` — CRITICAL 규칙
- `/src/atoms/seat.ts` — Step 0에서 생성한 atom 정의
- `/src/components/seat/Seat.tsx` — Step 1에서 수정한 Seat (props 변경 확인)
- `/src/components/seat/SeatMap.tsx` — 현재 SeatMap (수정 대상)
- `/src/components/seat/SelectionBar.tsx` — 현재 SelectionBar (props 인터페이스 확인)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### `src/components/seat/SeatMap.tsx` 수정

SeatMap에서 선택 상태 관리를 완전히 제거하고 순수 레이아웃 컴포넌트로 전환한다.

1. **삭제할 것:**
   - `useState` import 및 `const [selected, setSelected] = useState<string[]>([]);`
   - `toggle(seatId)` 함수 전체
   - `canSelect`, `MAX_SEATS_PER_HOLD` import (atom이 처리)

2. **Seat 렌더링 변경:**
   - 기존: `<Seat key={seat.id} onClick={() => toggle(seat.id)} seat={seat} state={isSelected ? "selected" : "available"} x={x} y={y} />`
   - 변경: `<Seat key={seat.id} seat={seat} x={x} y={y} />`
   - `state`와 `onClick` prop을 제거한다. Seat은 Step 1에서 내부적으로 atom을 구독하도록 수정됨.

3. **SelectionBar 렌더링 변경:**
   - 기존: `{selected.length > 0 ? <SelectionBar onClear={() => setSelected([])} selected={selected} /> : null}`
   - 변경: `<SelectionBar />`
   - props 없이 무조건 렌더한다. SelectionBar는 Step 3에서 atom 직접 구독 + 내부 null 반환으로 수정될 예정이다.
   - **주의**: Step 3 전까지 SelectionBar는 아직 props를 기대하므로, 이 step에서 SelectionBar도 함께 수정해야 빌드가 통과한다. SelectionBar의 변경은 최소한으로: props를 optional로 만들거나, 이 step에서 Step 3 작업을 앞당겨 SelectionBar도 atom 구독으로 전환한다. **가장 깔끔한 방법**: Step 2와 Step 3를 함께 적용한다. SeatMap에서 useState를 제거하면서 동시에 SelectionBar를 atom 구독으로 전환한다.

4. **유지할 것:**
   - `"use client"` 지시문
   - SVG 레이아웃 상수 (SEAT_PITCH, SECTION_WIDTH 등)
   - `getSeatPosition` 함수
   - SVG viewBox, STAGE 텍스트
   - `className="space-y-8"` 래퍼

### 결과 SeatMap 구조 (시그니처)

```tsx
"use client";
import type { JSX } from "react";
import type { Seat as SeatType } from "@/types";
import { Seat } from "./Seat";
import { SelectionBar } from "./SelectionBar";

// 레이아웃 상수 — 전부 그대로 유지
const SEAT_PITCH = 14;
// ...

function getSeatPosition(seat: SeatType): { x: number; y: number } {
  // 기존 로직 그대로
}

export function SeatMap({ seats }: { seats: readonly SeatType[] }): JSX.Element {
  // useState 없음. toggle 없음. 순수 레이아웃.
  return (
    <div className="space-y-8">
      <svg ...>
        <text ...>STAGE</text>
        {seats.map((seat) => {
          const { x, y } = getSeatPosition(seat);
          return <Seat key={seat.id} seat={seat} x={x} y={y} />;
        })}
      </svg>
      <SelectionBar />
    </div>
  );
}
```

### SelectionBar 동시 수정

SelectionBar도 이 step에서 atom 구독으로 전환한다 (원래 Step 3 범위이지만, SeatMap의 props 제거와 동시에 해야 빌드가 통과함):

- `src/components/seat/SelectionBar.tsx` 수정
- props 인터페이스 제거
- `useAtomValue(selectedSeatIdsAtom)` — 선택 좌석 읽기
- `useSetAtom(selectedSeatIdsAtom)` — 초기화 (setSelected([]))
- `selected.length === 0`이면 `null` 반환
- `validateSelection`, `MAX_SEATS_PER_HOLD` import는 유지
- `completeSelection` alert stub 유지

## Acceptance Criteria

```bash
npm run lint   # 린트 에러 없음
npm run test   # 모든 테스트 통과
npm run build  # TS strict 빌드 성공
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - SeatMap에 `useState`가 없는가?
   - SeatMap에 `canSelect`/`MAX_SEATS_PER_HOLD` import가 없는가?
   - Seat에 `state`/`onClick` prop을 전달하지 않는가?
   - SelectionBar에 props를 전달하지 않는가?
   - SelectionBar가 atom을 직접 구독하는가?
   - SVG 레이아웃 로직이 변경되지 않았는가?
3. 결과에 따라 `phases/3-seat-perf/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- SVG 레이아웃 상수(SEAT_PITCH, SECTION_WIDTH 등)와 `getSeatPosition` 함수를 변경하지 마라. 이유: 기하학 로직은 이 phase 범위 밖이며, 줌/팬 phase에서 다룬다
- SeatMap에 atom 구독(useAtomValue 등)을 추가하지 마라. 이유: SeatMap이 selectedSeatIdsAtom을 구독하면 선택 변경마다 SeatMap이 리렌더 → 2000 Seat에 memo 비교 발생. SeatMap은 선택 상태와 무관하게 안정적이어야 한다
- `seats/page.tsx`를 수정하지 마라. 이유: RSC 페이지는 변경 불필요. `<SeatMap seats={seats} />`는 그대로 동작
- 기존 테스트를 깨뜨리지 마라

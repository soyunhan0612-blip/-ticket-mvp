# Step 1: seat-memo — Seat에 React.memo + atom 연결

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — 좌석 성능 전략 섹션
- `/docs/ADR.md` — ADR-002
- `/CLAUDE.md` — CRITICAL 규칙
- `/src/atoms/seat.ts` — Step 0에서 생성한 atom 정의
- `/src/atoms/seat.test.ts` — Step 0에서 생성한 테스트 (atom 인터페이스 확인)
- `/src/components/seat/Seat.tsx` — 현재 Seat 컴포넌트 (수정 대상)
- `/src/types/index.ts` — Step 0에서 추가한 SeatVisualState 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### `src/components/seat/Seat.tsx` 수정

현재 Seat 컴포넌트를 아래와 같이 리팩토링한다:

1. **`SeatVisualState` 타입 정의 제거**: 이 타입은 Step 0에서 `src/types/index.ts`로 이동했다. `Seat.tsx`에서의 정의를 삭제하고 `@/types`에서 import한다.

2. **Props 변경**: `state`와 `onClick` prop을 제거한다. 남는 props는 `seat`, `x`, `y`만.

```ts
interface SeatProps {
  seat: SeatType;
  x: number;
  y: number;
}
```

3. **atom 구독 추가**:
   - `useAtomValue(seatVisualStateAtomFamily(seat.id))` — 이 좌석의 시각 상태 구독
   - `useSetAtom(toggleSeatAtom)` — 클릭 핸들러 (useSetAtom의 반환 함수는 참조가 안정적)

4. **React.memo 래핑**:
   - `memo(function Seat(...) { ... })` 형태로 래핑
   - props가 `seat`(RSC에서 온 안정 참조), `x`(숫자), `y`(숫자)만 남으므로 기본 shallow compare로 충분
   - 커스텀 비교 함수 불필요

5. **onClick 핸들러**:
   - `const toggle = useSetAtom(toggleSeatAtom);`
   - `onClick={isInteractive ? () => toggle(seat.id) : undefined}`
   - 이 클로저는 Seat이 실제로 리렌더될 때만 생성된다. memo가 불필요 리렌더를 막으므로 문제없다.

6. **나머지 로직 유지**: `STATE_CLASS_NAMES` 맵, SVG `<rect>` 렌더링, `<title>`, `isInteractive` 판정은 그대로 유지한다.

7. **`"use client"` 지시문 추가**: atom hook(useAtomValue, useSetAtom)을 사용하므로 클라이언트 컴포넌트여야 한다. 파일 최상단에 `"use client";`를 추가한다.

### 결과 구조 (시그니처)

```tsx
"use client";
import { memo, type JSX } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { Seat as SeatType, SeatVisualState } from "@/types";
import { seatVisualStateAtomFamily, toggleSeatAtom } from "@/atoms/seat";

interface SeatProps {
  seat: SeatType;
  x: number;
  y: number;
}

const STATE_CLASS_NAMES: Record<SeatVisualState, string> = { /* 기존과 동일 */ };

export const Seat = memo(function Seat({ seat, x, y }: SeatProps): JSX.Element {
  // useAtomValue로 시각 상태 구독
  // useSetAtom으로 토글 함수 획득
  // 기존 rect 렌더링 로직 유지
});
```

## Acceptance Criteria

```bash
npm run lint   # 린트 에러 없음
npm run test   # 기존 + atom 테스트 모두 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `Seat.tsx`에 `React.memo` 래핑이 존재하는가?
   - `state`/`onClick` prop이 제거되었는가?
   - `SeatVisualState` 타입이 `@/types`에서 import되는가? (Seat.tsx 내 정의 제거)
   - atom 관련 import가 `jotai`와 `@/atoms/seat`에서 오는가?
   - `"use client"` 지시문이 있는가?
3. 결과에 따라 `phases/3-seat-perf/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `SeatMap.tsx`를 이번 step에서 수정하지 마라. 이유: SeatMap은 Step 2에서 별도로 리팩토링한다. 이번 step에서는 Seat만 atom화한다. SeatMap이 아직 `state`/`onClick`을 내려주므로 Seat의 props 변경으로 **빌드가 깨질 수 있다**. 그런 경우 `npm run build`를 AC에서 제외하고 `lint && test`만 통과시켜라. Step 2에서 SeatMap을 수정하면 build도 통과한다.
- `SelectionBar.tsx`를 이번 step에서 수정하지 마라. 이유: Step 3 범위
- 기존 테스트를 깨뜨리지 마라
- `STATE_CLASS_NAMES`의 색상 값을 변경하지 마라. 이유: UI_GUIDE.md에서 확정된 4색 체계

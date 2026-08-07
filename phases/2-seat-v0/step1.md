# Step 1: seat-components

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 좌석 도메인 규칙을 파악하라:

- `/CLAUDE.md` — 특히 "아키텍처 규칙"과 "개발 프로세스"의 CRITICAL 항목
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/PRD.md` — Day 3 항목("좌석맵 v0 (순진한 구현) + before 측정")
- `/docs/UI_GUIDE.md` — 특히 "좌석 시각 규칙" (Step 0에서 4색 값 확정 완료)
- `/docs/UX_PRINCIPLES.md`
- `/src/types/index.ts` — 도메인 타입 정의
- `/src/lib/seat-map.ts` — 좌석 ID·좌표 유틸
- `/src/lib/seat-rules.ts` — `canSelect`, `validateSelection`, `MAX_SEATS_PER_HOLD`
- `/src/lib/mock-data.ts` — `generateSeats`, `MOCK_SESSIONS` (다음 step에서 사용)

기존 `src/lib/` 3종은 이미 47개 테스트로 검증된 순수 로직이다. 이번 step에서 **새 로직을 만들지 말고 재사용**하라.

## 이 step의 배경 (중요)

이 좌석맵은 **일부러 순진하게** 구현한다. 다음 phase(Day 4)에서 `atomFamily` + `memo`로 리팩토링하면서 "클릭당 리렌더 2000 → 1~2"의 before/after 서사를 만들기 위한 대조군이다. `CLAUDE.md`가 이 순진한 구현 커밋의 존재를 명시적으로 요구한다.

따라서 아래 최적화들을 **의도적으로 사용하지 않는다**:

- `React.memo` / `useMemo` / `useCallback` 금지
- Jotai `atom` / `atomFamily` 금지 (Provider는 이미 부팅되어 있지만 이번엔 사용 X)
- key만 바뀐 렌더 최적화 트릭 금지
- 선택 상태를 좌석별로 쪼개는 리팩토링 금지 — 전체를 하나의 `useState<string[]>`로 관리

주석에 이 의도를 명시하라(파일당 1줄, 짧게).

## 작업

`src/components/seat/` 아래 3개 파일을 만든다.

### 1) `src/components/seat/Seat.tsx`

순수 표현 SVG 컴포넌트. 클라이언트 컴포넌트로 만들 필요 없다(부모가 `"use client"`면 자동 포함).

시그니처:

```tsx
import type { Seat as SeatType } from "@/types";

export type SeatVisualState = "available" | "selected" | "held-other" | "sold";

interface SeatProps {
  seat: SeatType;
  x: number;              // SVG 좌표계에서의 좌상단 x
  y: number;              // 좌상단 y
  state: SeatVisualState;
  onClick: () => void;
}

export function Seat(props: SeatProps): JSX.Element;
```

내부 구현 요건:

- `<rect width={12} height={12} rx={2}>` + `<title>{seat.id}</title>` (호버 툴팁)
- `state`에 따라 `className`으로 `fill-*` 클래스 스위치. Step 0에서 확정한 값을 사용:
  - `available` → `fill-neutral-500` + `cursor-pointer hover:fill-neutral-400`
  - `selected` → `fill-white` + `cursor-pointer`
  - `held-other` → `fill-neutral-700` + `cursor-not-allowed`
  - `sold` → `fill-neutral-800` + `cursor-not-allowed`
- `onClick`은 `available` / `selected` 상태에서만 트리거 (다른 상태는 `pointerEvents="none"` 또는 핸들러에서 조기 return)
- 이 phase에서 `held-other` / `sold`는 실제 렌더되지 않지만 props와 fill을 정의해 Day 5~6에서 그대로 재사용 가능하게 한다

### 2) `src/components/seat/SeatMap.tsx`

`"use client"` 컴포넌트. 2000석을 **한 번에** 렌더하고 선택 상태를 하나의 배열로 관리한다.

시그니처:

```tsx
"use client";

import type { Seat as SeatType } from "@/types";

interface SeatMapProps {
  seats: readonly SeatType[];   // generateSeats() 결과 (2000개)
}

export function SeatMap(props: SeatMapProps): JSX.Element;
```

내부 구현 요건:

- `const [selected, setSelected] = useState<string[]>([])`
- 좌석 좌표 계산은 `seat.section` / `seat.row` / `seat.col`에서 파생:
  - 좌석 크기 12×12, 좌석 간 gap 2
  - 한 구역 = 25행 × 20열 → 폭 `20 * 14 = 280` (마지막 gap 포함 계산은 자유)
  - 구역(A~D) 4개를 2×2 그리드로 배치, 구역 간 gap 40
  - 무대는 상단(y=0 근처)에 `<text>` 라벨 "STAGE" 배치 (장식용, 렌더러가 좌표 감 잡도록)
- `<svg viewBox="0 0 <W> <H>" className="w-full max-w-4xl h-auto bg-neutral-950">` — 컨테이너
- 좌석 렌더는 **평범한 `seats.map`** 으로:
  ```tsx
  {seats.map((seat) => {
    const isSelected = selected.includes(seat.id); // 의도적 O(N)
    return (
      <Seat
        key={seat.id}
        seat={seat}
        x={/* 계산 */}
        y={/* 계산 */}
        state={isSelected ? "selected" : "available"}
        onClick={() => toggle(seat.id)}
      />
    );
  })}
  ```
- 클릭 토글 로직:
  - 이미 `selected`에 있으면 → 제거
  - 아니면 → `canSelect(selected, seatId)` 통과 시 `[...selected, seatId]`. 실패 시 무시(alert 없이 조용히)
  - `canSelect` / `MAX_SEATS_PER_HOLD`는 `@/lib/seat-rules`에서 import
- 컴포넌트 하단에 `<SelectionBar>`를 함께 렌더한다 — SelectionBar가 selected 표시와 확정 버튼을 담당. props로 `selected`와 `onClear`(`() => setSelected([])`) 전달.
- 파일 상단 주석 1줄: `// 의도적 안티패턴: Day 4에서 atomFamily + memo로 리팩토링. before/after 서사의 대조군.`

### 3) `src/components/seat/SelectionBar.tsx`

`"use client"`. 선택 좌석 표시 + 확정 버튼.

시그니처:

```tsx
"use client";

interface SelectionBarProps {
  selected: readonly string[];
  onClear: () => void;
}

export function SelectionBar(props: SelectionBarProps): JSX.Element;
```

내부 구현 요건:

- 선택 좌석 수(`{selected.length} / 4`) 텍스트 표시. `MAX_SEATS_PER_HOLD`를 `@/lib/seat-rules`에서 import해 리터럴 `4` 대신 사용.
- 좌석 ID 목록을 `<ul>` 또는 콤마 join으로 표시 (`gap-2 flex flex-wrap`)
- 두 버튼: `선택 완료` (primary) / `초기화` (text)
- `선택 완료` 클릭 시:
  1. `validateSelection(selected)` 호출 (`@/lib/seat-rules`)
  2. `ok` → `alert(JSON.stringify(selected))` (Day 5에 `POST /api/holds`로 대체될 자리)
  3. `!ok` → `alert("선택 오류: " + reason)`
- `초기화` 클릭 시 → `onClear()`
- 스타일은 `docs/UI_GUIDE.md`의 카드·버튼 클래스 그대로 사용. 새 색·간격 값을 만들지 마라.

## Acceptance Criteria

```bash
npm run lint
npm run test
npm run build
```

세 커맨드 모두 통과해야 한다. `npm run build`는 신규 컴포넌트가 TS strict를 지키는지 확인하기 위해 이 step에서 예외적으로 실행한다.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `src/components/seat/` 아래 3개 파일만 생성되었는가? (다른 디렉토리 손대지 않았는지)
   - `src/lib/` · `src/services/` · `src/app/api/**/route.ts` 는 건드리지 않았는가? (tdd-guard 트리거 방지)
   - Jotai import가 있는지 grep — 있으면 실패. atomFamily는 다음 phase에서만 도입
   - `React.memo` / `useMemo` / `useCallback` 사용이 없는지 grep — 있으면 실패
3. 결과에 따라 `phases/2-seat-v0/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "seat/ 컴포넌트 3종 생성 (Seat/SeatMap/SelectionBar), 의도적 순진한 구현: useState<string[]> 하나로 선택 관리, memo/useMemo/atomFamily 없음"`
   - 실패 → `"status": "error"`, `"error_message": "..."`

## 금지사항

- `React.memo`, `useMemo`, `useCallback`, `atomFamily`, `atom`을 쓰지 마라. 이유: Day 4 리팩토링의 대조군이 필요하다. 여기서 최적화하면 서사가 통째로 죽는다.
- 좌석 선택 상태를 좌석별로 분해(Map/Set/atomFamily)하지 마라. 이유: 위와 같음. 반드시 `useState<string[]>` 하나로 관리.
- `dangerouslySetInnerHTML`을 쓰지 마라. 이유: CLAUDE.md CRITICAL. 셀러 설명 렌더 규칙이 좌석 컴포넌트에도 그대로 적용됨.
- 새 좌석 상태(hovered, disabled 등)를 도입하지 마라. 4색만 사용. 이유: UI_GUIDE 규칙.
- 좌석맵을 `div + CSS transform`으로 그리지 마라. `SVG viewBox`만 사용. 이유: UI_GUIDE의 줌/팬 규칙과 일관성.
- API 호출을 넣지 마라. `POST /api/holds`는 Day 5. 이번 step은 `alert`으로 stub.
- 새 lib 함수를 만들지 마라. 좌표 계산이 필요해도 `SeatMap.tsx` 내부 지역 헬퍼로 두라 (다음 phase에서 최적화와 함께 lib으로 승격 가능).
- 기존 테스트를 깨뜨리지 마라.

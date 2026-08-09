# Step 0: seat-layout-lib

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 특히 "좌석 성능 전략" 절
- `/src/components/seat/SeatMap.tsx` — 현재 좌표 계산이 하드코딩된 위치
- `/src/lib/seat-map.ts` — `SECTIONS`, `Section` 타입, `ROWS_PER_SECTION`, `COLS_PER_ROW`
- `/src/lib/seat-preset.ts` — `SEAT_PRESETS`, `SeatPreset.sections`, `getPreset`
- `/src/lib/seat-rules.test.ts` — 이 저장소의 테스트 작성 스타일 참조
- `/src/types/index.ts` — `Seat` 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

현재 `src/components/seat/SeatMap.tsx`의 `getSeatPosition()`은 좌석 구역 배치를 다음과 같이 하드코딩하고 있다:

```typescript
const sectionIndex = ["A", "B", "C", "D"].indexOf(seat.section);
const sectionColumn = sectionIndex % 2;
const sectionRow = Math.floor(sectionIndex / 2);
```

이 때문에 좌석 프리셋이 small(A구역 1개, 500석)이나 medium(A·B 2개, 1000석)인 공연은 **viewBox 크기는 4구역 기준 그대로인데 좌석은 좌상단에만 몰려 렌더된다.** 화면 대부분이 빈 공간이 된다.

또한 이 좌표 계산은 컴포넌트 안에 있어 테스트가 없다. 순수 함수로 `src/lib/`에 추출하면 TDD 대상이 되고, 다음 step의 `ZoomPanSvg`와 Step 5의 Admin 좌석맵이 같은 함수를 재사용할 수 있다.

## 작업

### 1. 테스트 먼저 작성 (`src/lib/seat-layout.test.ts`)

이 저장소는 TDD를 강제한다. `src/lib/` 편집은 테스트 선행 없이 훅에 의해 차단된다. **반드시 테스트를 먼저 작성하고, 실패를 확인한 뒤 구현하라.**

테스트 케이스:

- `getLayoutBox(["A"])` — 1구역이면 1열 배치, 폭이 구역 하나 + 여백 수준
- `getLayoutBox(["A","B"])` — 2구역이면 가로 2열 배치
- `getLayoutBox(["A","B","C","D"])` — 4구역이면 2×2 배치
- `getSeatPosition`이 같은 구역 안에서 `col`이 1 커지면 x가 `SEAT_PITCH`만큼 증가, `row`가 1 커지면 y가 `SEAT_PITCH`만큼 증가
- **회귀 방지**: `sections`가 `["A","B","C","D"]`일 때 좌표가 기존 `SeatMap.tsx` 구현과 동일해야 한다. 아래 상수를 그대로 유지한 채 계산했을 때의 값을 기대값으로 박아라.
  - `SEAT_PITCH = 14`, `SECTION_GAP = 40`, `SEAT_AREA_TOP = 40`
  - `SECTION_WIDTH = 20 * SEAT_PITCH`, `SECTION_HEIGHT = 25 * SEAT_PITCH`
  - 예: A구역 `{section:"A", row:1, col:1}` → `{x: 0, y: 40}`
  - 예: D구역 `{section:"D", row:1, col:1}` → x는 `SECTION_WIDTH + SECTION_GAP`, y는 `SEAT_AREA_TOP + SECTION_HEIGHT + SECTION_GAP`
- 모든 좌석 좌표가 `getLayoutBox()`가 반환한 박스 안에 들어간다 (프리셋 3종 전부에 대해 검사)
- `getInitialViewBox(box)`가 반환한 사각형이 박스보다 작다 (= 확대된 상태)
- `getInitialViewBox(box)`가 반환한 사각형이 가로 중앙에 있고 상단(무대 쪽)에 붙어 있다

### 2. 구현 (`src/lib/seat-layout.ts`)

```typescript
import type { Seat } from "@/types";

export const SEAT_PITCH: number;
export const SECTION_GAP: number;
export const SEAT_AREA_TOP: number;

export interface LayoutBox {
  width: number;
  height: number;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getSeatPosition(
  seat: Seat,
  sections: readonly string[],
): { x: number; y: number };

export function getLayoutBox(sections: readonly string[]): LayoutBox;

export function getInitialViewBox(box: LayoutBox): ViewBox;
```

동작 규칙:

- **`sections` 인자의 순서와 길이로 그리드를 결정하라.** 구역 개수가 1이면 1열, 2면 2열, 3~4면 2열(2행). 즉 열 개수는 `Math.min(sections.length, 2)`.
- 좌석의 구역 인덱스는 `sections.indexOf(seat.section)`으로 구한다. `["A","B","C","D"]`를 함수 안에 하드코딩하지 마라.
- **`sections`를 `readonly string[]`으로 받는 것은 의도적이다.** `seat-map.ts`의 `Section`(`"A"|"B"|"C"|"D"` 리터럴 유니온)으로 좁히지 마라. `src/types/index.ts`의 `Seat.section`이 `string`이라, 좁은 타입으로 받으면 `sections.indexOf(seat.section)`이 strict 모드에서 컴파일되지 않는다. 또한 이 함수의 책임은 "배열에서 인덱스를 찾아 격자 좌표를 계산"하는 것이지 구역 값의 유효성 검증이 아니다 — 그건 `seat-map.ts`의 `isSection`/`toSeatId`가 맡고, 이 함수는 `sections`에 없으면 `RangeError`로 방어한다.
- `sections`에 없는 구역의 좌석이 들어오면 `RangeError`를 던져라. `seat-map.ts`의 `toSeatId`가 범위 밖 입력에 `RangeError`를 던지는 것과 같은 규약이다.
- `getInitialViewBox`는 ARCHITECTURE.md의 지침대로 **전관이 아니라 무대 앞 중앙부**를 반환한다. 무대는 좌석 영역 위쪽(y가 작은 쪽)에 있다. 전체 폭의 약 절반 정도를 보여주는 배율이면 충분하다 — 정확한 비율은 재량이되, 좌석 하나가 클릭 가능한 크기가 되어야 한다는 목적을 지켜라.

## Acceptance Criteria

```bash
npx vitest run src/lib/seat-layout.test.ts
npm run lint
npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/8-admin/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `src/components/seat/SeatMap.tsx`를 이 step에서 수정하지 마라. 이유: Step 2의 스코프다. 이 step은 `lib/`에 순수 함수와 테스트를 추가하는 것만 한다
- 구역 배열을 함수 내부에 하드코딩하지 마라 (`["A","B","C","D"]`). 이유: 정확히 그 하드코딩이 프리셋 공연의 레이아웃을 깨뜨린 원인이다
- 테스트 없이 `src/lib/` 파일을 만들지 마라. 이유: tdd-guard 훅이 편집을 차단한다. 훅과 싸우지 말고 순서를 지켜라
- 4구역일 때의 기존 좌표를 바꾸지 마라. 이유: 기존 좌석맵의 시각적 결과가 회귀 없이 유지되어야 한다
- React를 import하지 마라. 이유: `lib/`은 순수 로직 계층이다
- 기존 테스트를 깨뜨리지 마라

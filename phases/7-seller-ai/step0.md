# Step 0: seat-preset

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/src/lib/seat-map.ts` — `SECTIONS`, `ROWS_PER_SECTION`, `COLS_PER_ROW`, `toSeatId` 재사용
- `/src/lib/seat-map.test.ts` — 기존 테스트 패턴
- `/src/lib/mock-data.ts` — `generateSeats()` 패턴 참조
- `/src/types/index.ts` — `Seat`, `Session` 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. 테스트 작성 (`src/lib/seat-preset.test.ts` 생성)

좌석 프리셋 로직의 테스트를 먼저 작성한다.

**테스트 케이스:**
- `SEAT_PRESETS` 배열에 정확히 3개 프리셋이 있다
- Small 프리셋: 구역 `["A"]`, 총 좌석 수 500 (25행 x 20열)
- Medium 프리셋: 구역 `["A", "B"]`, 총 좌석 수 1000
- Large 프리셋: 구역 `["A", "B", "C", "D"]`, 총 좌석 수 2000
- `generateSeatsForPreset("small")` — 결과의 모든 좌석이 A 구역이고 500개이다
- `generateSeatsForPreset("medium")` — 결과에 A, B 구역만 있고 1000개이다
- `generateSeatsForPreset("large")` — 결과에 A, B, C, D 구역이 모두 있고 2000개이다
- `isValidPresetId("small")` → true, `isValidPresetId("xxx")` → false
- `generateSessionsForShow(showId, startsAtList)` — 결과의 모든 session이 해당 showId를 가지며, 개수가 startsAtList와 일치하고, ID가 고유하다

### 2. 구현 (`src/lib/seat-preset.ts` 생성)

아래 시그니처를 따르되 내부 구현은 자유롭게 하라:

```typescript
import type { Section } from "@/lib/seat-map";
import type { Seat, Session } from "@/types";

export type SeatPresetId = "small" | "medium" | "large";

export interface SeatPreset {
  id: SeatPresetId;
  label: string;             // 예: "소규모 (500석)"
  sections: Section[];       // seat-map.ts의 Section 타입 재사용
  totalSeats: number;
}

export const SEAT_PRESETS: readonly SeatPreset[];

export function isValidPresetId(id: string): id is SeatPresetId;

export function getPreset(id: SeatPresetId): SeatPreset;

export function generateSeatsForPreset(presetId: SeatPresetId): Seat[];

export function generateSessionsForShow(
  showId: string,
  startsAtList: string[],
): Session[];
```

핵심 규칙:
- `seat-map.ts`의 `ROWS_PER_SECTION`, `COLS_PER_ROW`, `toSeatId`를 import하여 재사용한다
- `mock-data.ts`의 `generateSeats()` 패턴과 유사하되, 프리셋의 sections만 순회한다
- session ID는 `crypto.randomUUID()`로 생성한다

## Acceptance Criteria

```bash
npx vitest run src/lib/seat-preset.test.ts
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/7-seller-ai/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `seat-map.ts`를 수정하지 마라. 기존 상수와 함수를 import하여 재사용한다
- ShowStore를 수정하지 마라. Step 1의 스코프이다
- API route를 만들지 마라
- 기존 테스트를 깨뜨리지 마라

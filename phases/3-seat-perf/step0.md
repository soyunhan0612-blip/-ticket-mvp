# Step 0: atoms-seat — Jotai atom 정의 + 단위 테스트

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — 상태 관리 섹션, 좌석 성능 전략 섹션
- `/docs/ADR.md` — ADR-002 (atomFamily + before/after 측정)
- `/CLAUDE.md` — CRITICAL 규칙
- `/src/types/index.ts` — 기존 타입 정의 (SeatSnapshotEntry, SeatSnapshot 등)
- `/src/lib/seat-rules.ts` — canSelect, MAX_SEATS_PER_HOLD, validateSelection (atom에서 재사용)
- `/src/lib/seat-map.ts` — isValidSeatId (atom에서 재사용)
- `/src/components/seat/Seat.tsx` — 현재 SeatVisualState 타입 정의 위치 (이동 대상)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. `src/types/index.ts`에 `SeatVisualState` 타입 추가

```ts
export type SeatVisualState = "available" | "selected" | "held-other" | "sold";
```

이 타입은 현재 `src/components/seat/Seat.tsx`에 정의되어 있다. **이번 step에서는 types/에 추가만 하고, Seat.tsx에서의 제거는 Step 1에서 한다.** 중복 정의가 일시적으로 존재하지만 이름이 동일하므로 타입 충돌은 없다.

### 2. `src/atoms/seat.ts` 생성

4종 atom을 정의한다:

```ts
// 시그니처만 제시. 내부 구현은 에이전트 재량.

import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { SeatSnapshotEntry, SeatVisualState } from "@/types";
import { canSelect, MAX_SEATS_PER_HOLD } from "@/lib/seat-rules";

// 1. 서버 상태 atom — Day 5 폴링이 갱신할 진입점
export const seatStatusAtomFamily: AtomFamily<string, Atom<SeatSnapshotEntry | null>>;
// 기본값: null (= available)

// 2. 선택 좌석 ID 배열
export const selectedSeatIdsAtom: WritableAtom<string[], ...>;
// 기본값: []

// 3. 토글 write-only atom
export const toggleSeatAtom: WritableAtom<null, [seatId: string], void>;
// 로직:
//   - seatId가 이미 선택돼 있으면 → 제거
//   - canSelect(currentSelected, seatId) && currentSelected.length < MAX_SEATS_PER_HOLD → 추가
//   - 그 외 (상한 초과, 유효하지 않은 ID 등) → 무시

// 4. 시각 상태 derived atom
export const seatVisualStateAtomFamily: AtomFamily<string, Atom<SeatVisualState>>;
// 로직:
//   const status = get(seatStatusAtomFamily(seatId));
//   const selected = get(selectedSeatIdsAtom);
//   - selected.includes(seatId) → "selected"
//   - status === null → "available"
//   - status.s === "held" && status.mine → "selected"  (held-mine = white = selected와 동일)
//   - status.s === "held" → "held-other"
//   - status.s === "sold" → "sold"
//   - fallback → "available"
```

#### 핵심 규칙

- `canSelect`과 `MAX_SEATS_PER_HOLD`는 `@/lib/seat-rules`에서 import하여 재사용한다. 로직을 복제하지 마라.
- `seatVisualStateAtomFamily`에서 `selected.includes(seatId)` 검사는 `seatStatusAtomFamily` 검사보다 **먼저** 한다. 사용자가 로컬에서 선택한 좌석은 서버 hold 전에도 "selected"로 보여야 한다.
- held-mine 상태는 `"selected"`와 시각적으로 동일하다. 별도 SeatVisualState 값을 만들지 마라.
- `atomFamily`의 key 비교는 문자열이므로 기본 동등 비교로 충분하다.

### 3. `src/atoms/seat.test.ts` 생성

Jotai의 `createStore` API를 사용하여 React 없이 순수 atom 로직을 테스트한다.

```ts
import { createStore } from "jotai";
// 사용법:
// const store = createStore();
// store.get(someAtom);
// store.set(writableAtom, value);
```

테스트 케이스:

**toggleSeatAtom:**
- 유효한 좌석 선택 시 selectedSeatIdsAtom에 추가됨
- 이미 선택된 좌석 토글 시 selectedSeatIdsAtom에서 제거됨
- 4석 선택 후 5번째 토글 시 무시됨 (selectedSeatIdsAtom 길이 여전히 4)
- 유효하지 않은 좌석 ID (예: "Z-99-99") 토글 시 무시됨

**seatVisualStateAtomFamily:**
- seatStatus null + 미선택 → "available"
- seatStatus null + 선택됨 → "selected"
- seatStatus {s:"held", mine:true} → "selected" (held-mine = selected)
- seatStatus {s:"held"} (mine 없음 또는 false) → "held-other"
- seatStatus {s:"sold"} → "sold"
- 선택된 상태에서 서버 상태가 held-other로 바뀌면 → 선택이 우선하여 "selected" (로컬 선택이 서버보다 우선)

**selectedSeatIdsAtom:**
- 초기값 빈 배열
- toggleSeatAtom으로 추가 후 반영 확인

## Acceptance Criteria

```bash
npm run lint   # 린트 에러 없음
npm run test   # 기존 47개 + 새 atom 테스트 모두 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가? → `src/atoms/seat.ts` 위치 확인
   - ADR 기술 스택을 벗어나지 않았는가? → Jotai atomFamily 사용 확인
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? → 순수 로직 재사용 확인
3. 결과에 따라 `phases/3-seat-perf/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `canSelect`/`MAX_SEATS_PER_HOLD`/`validateSelection` 로직을 atom 파일에 복제하지 마라. 이유: `lib/seat-rules.ts`에 이미 존재하며 서버와 동일 규칙을 보장해야 한다
- `SeatVisualState`에 "held-mine" 같은 새 값을 추가하지 마라. 이유: held-mine은 시각적으로 "selected"와 동일(white)하며, 별도 값은 UI_GUIDE의 4색 체계를 깨뜨린다
- `src/components/seat/Seat.tsx`에서 `SeatVisualState` 타입을 이번 step에서 제거하지 마라. 이유: Step 1에서 일괄 수정한다. 이번 step에서는 types/에 추가만 한다
- 기존 테스트를 깨뜨리지 마라

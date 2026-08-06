# Step 4: seat-rules

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙, 특히 "좌석 규칙(최대 매수 4석, 좌석 ID 유효성)은 서버에서도 재검증"
- `/docs/ARCHITECTURE.md` — 보안 경계 섹션의 서버 검증 항목
- `/docs/ADR.md` — ADR-005 "좌석 규칙(최대 매수 4석)이 UI에만 있으면 curl로 2000석 hold 가능"
- `/docs/PRD.md` — Day 5의 서버 검증 항목
- `/src/types/index.ts` — Step 2 산출물
- `/src/lib/seat-map.ts` — Step 3 산출물, `isValidSeatId` 재사용

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/lib/seat-rules.ts`를 **TDD**로 구현한다. UI 클릭 판정과 서버 zod 검증 양쪽에서 호출된다. 이 모듈이 순수하지 않거나 UI 전용이면 서버 우회가 가능해진다 (ADR-005).

### 상수와 시그니처

```ts
export const MAX_SEATS_PER_HOLD = 4;

export type SelectionValidation =
  | { ok: true }
  | { ok: false; reason: "empty" | "over-limit" | "duplicate" | "invalid-seat-id" };

// 이미 선택된 목록에 새 좌석을 추가할 수 있는지 판정 (UI에서 클릭 시 사용)
export function canSelect(currentSelected: readonly string[], seatId: string): boolean;

// 최종 선택 목록이 서버로 보내도 되는 형태인지 검증 (route handler에서 사용)
export function validateSelection(seatIds: readonly string[]): SelectionValidation;
```

### 동작 요구

`canSelect(current, seatId)`:
- `seatId`가 유효하지 않으면 `false`.
- `current`에 이미 `seatId`가 포함되어 있으면 `false` (중복 선택 방지).
- `current.length >= MAX_SEATS_PER_HOLD`이면 `false`.
- 그 외 `true`.

`validateSelection(seatIds)`:
- 빈 배열이면 `{ ok: false, reason: "empty" }`.
- `seatIds.length > MAX_SEATS_PER_HOLD`이면 `{ ok: false, reason: "over-limit" }`.
- 중복이 있으면 `{ ok: false, reason: "duplicate" }`.
- 하나라도 `isValidSeatId`가 false이면 `{ ok: false, reason: "invalid-seat-id" }`.
- 모두 만족하면 `{ ok: true }`.
- **체크 순서 우선순위 주의**: `empty` → `over-limit` → `duplicate` → `invalid-seat-id`. 위 우선순위가 테스트로 고정되니 임의로 바꾸지 마라.

### TDD 순서

**반드시 테스트를 먼저 작성**하라. `codex-tdd-guard.cjs`가 `src/lib/` 편집을 테스트 선행 없이 차단한다.

테스트 파일 위치: `src/lib/seat-rules.test.ts`

테스트 케이스 최소 커버리지:
1. `MAX_SEATS_PER_HOLD === 4` 상수 검증
2. `canSelect` 정상: 빈 목록 + 유효 좌석 → true
3. `canSelect` 중복 거부
4. `canSelect` 4석 상한 (3석에서 1개 추가 → true, 4석에서 추가 → false)
5. `canSelect` 잘못된 좌석 ID 거부
6. `validateSelection` empty
7. `validateSelection` over-limit (5석)
8. `validateSelection` duplicate
9. `validateSelection` invalid-seat-id
10. `validateSelection` ok (1~4석 유효 케이스)
11. 우선순위 테스트: 빈 배열이면 `empty`가 다른 reason보다 먼저 나온다 (즉 빈 배열이 invalid-seat-id로 판정되지 않는다)

## Acceptance Criteria

```bash
npm run test    # seat-rules.test.ts를 포함해 전부 통과
npm run lint    # 통과
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `seat-rules.ts`가 순수 함수만 export하는가? (I/O·전역 상태·React import 금지)
   - 좌석 ID 검증에 `isValidSeatId`(`src/lib/seat-map.ts`)를 재사용하는가? 자체 정규식을 다시 짜지 않았는가?
   - `MAX_SEATS_PER_HOLD`가 매직 넘버로 흩어져 있지 않은가?
   - 테스트가 구현 이전 커밋에 있거나 같은 커밋에 함께 존재하는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/lib/seat-rules.ts — MAX_SEATS_PER_HOLD=4, canSelect/validateSelection 구현, seat-map.isValidSeatId 재사용, TDD 완료"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 즉시 중단

## 금지사항

- 좌석 ID 정규식을 이 파일에서 다시 정의하지 마라. 이유: seat-map과 seat-rules가 다른 정규식을 갖는 순간 서버 검증이 자기 자신을 반박한다. `isValidSeatId`를 import해서 쓴다.
- React·Jotai·Tanstack Query를 import하지 마라. 이유: 이 모듈은 서버 route handler에서도 호출된다. UI 의존이 들어가면 서버 우회가 시작된다.
- `console.log`, `throw` 남발하지 마라. 이유: 검증 실패는 `{ ok: false, reason }`으로 반환한다. 예외 던지면 zod 파이프라인이 500으로 튄다.
- `MAX_SEATS_PER_HOLD` 값을 이 파일 밖(UI 컴포넌트, API route)에서 하드코딩하지 마라. 이유: "4석"이 여러 곳에 흩어지면 나중에 값을 바꿀 때 사고가 난다. 항상 이 상수를 import해 쓴다.
- 테스트를 나중에 쓰지 마라. TDD 가드가 차단한다.
- 기존 테스트를 깨뜨리지 마라.

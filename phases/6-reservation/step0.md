# Step 0: seat-store-extend — SeatStore 확장

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — Store 인터페이스 정의, 데이터 흐름, 원자성 요구사항
- `/docs/ADR.md` — 기술 선택 근거
- `/CLAUDE.md` — CRITICAL 규칙 (소유권 검증, TDD 등)
- `/src/services/seat-store.ts` — 현재 SeatStore 인터페이스
- `/src/services/seat-store-memory.ts` — 현재 메모리 구현체 (HoldEntry 구조, hold/release/getSnapshot 로직)
- `/src/services/seat-store-memory.test.ts` — 기존 테스트 패턴 (vi.useFakeTimers, 고유 sessionId 등)
- `/src/lib/hold.ts` — isExpired, HOLD_TTL_MS
- `/src/types/index.ts` — SeatStatus, Hold 등 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

SeatStore 인터페이스에 3개 메서드를 추가하고, 메모리 구현체에서 구현한다.

### 1. 인터페이스 확장 (`src/services/seat-store.ts`)

기존 인터페이스에 아래 시그니처를 추가한다:

```typescript
confirmSeats(sessionId: string, seatIds: string[], userId: string): Promise<void>;
releaseSold(sessionId: string, seatIds: string[], userId: string): Promise<void>;
revertSold(sessionId: string, seatIds: string[]): Promise<void>;
```

### 2. 테스트 작성 (`src/services/seat-store-memory.test.ts`)

기존 테스트 파일에 아래 케이스들을 추가한다. 기존 테스트 패턴(vi.useFakeTimers, 고유 sessionId 사용)을 따른다.

**confirmSeats 테스트:**
- held 좌석을 sold로 전환한다
- 소유자 불일치 시 FORBIDDEN 에러를 던진다
- 만료된 hold에 대해 EXPIRED 에러를 던진다
- 좌석이 없으면(available) EXPIRED 에러를 던진다
- 이미 sold인 좌석에 대해 에러를 던진다
- 부분 실패 시 아무 좌석도 sold로 전환하지 않는다 (원자적)
- version을 증가시킨다
- sold된 좌석의 snapshot에서 expiresAt이 없다

**releaseSold 테스트:**
- sold 좌석을 available로 되돌린다
- 소유자 불일치 시 FORBIDDEN 에러를 던진다
- version을 증가시킨다

**revertSold 테스트:**
- sold 좌석을 소유권 검사 없이 available로 되돌린다
- version을 증가시킨다

### 3. 구현 (`src/services/seat-store-memory.ts`)

테스트가 통과하도록 3개 메서드를 구현한다.

**confirmSeats 핵심 로직:**
1. 대상 좌석 전체를 먼저 검사한다 (all-or-nothing)
2. 각 좌석이 held 상태인지, 소유자가 일치하는지, 만료되지 않았는지 확인
3. 하나라도 불충족이면 **아무 좌석도 변경하지 않고** 에러를 던진다
4. 전부 통과하면 모든 좌석의 status를 `"sold"`로 변경하고 `expiresAt`을 제거한다
5. version을 증가시킨다

**에러 규칙:**
- 소유자 불일치: `throw new Error("FORBIDDEN: ...")`
- 만료/미존재/이미 sold: `throw new Error("EXPIRED: ...")` 또는 적절한 에러

**releaseSold 핵심 로직:**
1. 각 좌석이 sold 상태이고 소유자가 일치하는지 확인
2. 소유자 불일치 시 `throw new Error("FORBIDDEN: ...")`
3. 좌석을 Map에서 삭제(available로 복귀)
4. version 증가

**revertSold 핵심 로직:**
1. 소유권 검사 없이 sold 상태인 좌석을 Map에서 삭제
2. version 증가

## Acceptance Criteria

```bash
npx vitest run src/services/seat-store-memory.test.ts
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/6-reservation/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 기존 hold/release/getSnapshot 테스트를 수정하지 마라. 이유: 기존 기능이 깨지면 안 된다
- ReservationStore를 이 step에서 만들지 마라. 이유: Step 1의 스코프이다
- API route를 수정하지 마라. 이유: Step 2의 스코프이다
- 기존 테스트를 깨뜨리지 마라

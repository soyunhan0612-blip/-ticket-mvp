# Step 1: reservation-store — ReservationStore 구현

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — ReservationStore 인터페이스 정의, 원자적 처리 요구사항
- `/docs/ADR.md` — Store 인터페이스 분리와 팩토리 교체 패턴
- `/CLAUDE.md` — CRITICAL 규칙
- `/src/services/seat-store.ts` — SeatStore 인터페이스 (Step 0에서 confirmSeats/releaseSold/revertSold 추가됨)
- `/src/services/seat-store-memory.ts` — SeatStore 메모리 구현체
- `/src/services/seat-store-memory.test.ts` — confirmSeats/releaseSold/revertSold 테스트 패턴
- `/src/services/show-store.ts` — ShowStore 인터페이스 (패턴 참조)
- `/src/services/show-store-memory.ts` — ShowStore 메모리 구현체 (globalThis 싱글톤 패턴 참조)
- `/src/services/index.ts` — 팩토리 패턴 (getShowStore, getSeatStore)
- `/src/types/index.ts` — Reservation 타입 정의

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. 인터페이스 정의 (`src/services/reservation-store.ts` 생성)

```typescript
import type { Reservation } from "@/types";

export interface ReservationStore {
  create(sessionId: string, seatIds: string[], userId: string): Promise<Reservation>;
  listByUser(userId: string): Promise<Reservation[]>;
  cancel(reservationId: string, userId: string): Promise<Reservation>;
}
```

### 2. 테스트 작성 (`src/services/reservation-store-memory.test.ts` 생성)

테스트에서는 실제 SeatStore 메모리 구현체를 사용한다 (mock 아님). 좌석을 hold한 뒤 ReservationStore를 테스트하는 흐름이다.

**create 테스트:**
- hold된 좌석으로 예매를 생성한다 (held → sold + Reservation 레코드 생성)
- 생성된 Reservation에 id, sessionId, seatIds, userId, status:"confirmed", createdAt이 있다
- 소유자 불일치 시 FORBIDDEN, 좌석 상태 변경 없음
- 만료된 hold에 대해 EXPIRED, 좌석 상태 변경 없음

**listByUser 테스트:**
- 해당 사용자의 예매 목록만 반환한다
- 다른 사용자의 예매는 포함하지 않는다
- 예매가 없으면 빈 배열을 반환한다

**cancel 테스트:**
- 예매를 취소하고 좌석을 available로 되돌린다
- 취소 후 Reservation status가 "cancelled"이다
- 소유자 불일치 시 FORBIDDEN
- 이미 취소된 예매에 대해 ALREADY_CANCELLED
- 존재하지 않는 예매에 대해 에러

### 3. 메모리 구현체 (`src/services/reservation-store-memory.ts` 생성)

기존 show-store-memory.ts의 `globalThis` 싱글톤 패턴을 따른다.

**구현체 생성 함수 시그니처:**
```typescript
export function createReservationStoreMemory(seatStore: SeatStore): ReservationStore
```

**create() 핵심 로직:**
1. `seatStore.confirmSeats(sessionId, seatIds, userId)` 호출
2. confirmSeats 성공 시 Reservation 레코드 생성 (`id: crypto.randomUUID()`, `status: "confirmed"`, `createdAt: Date.now()`)
3. 레코드 생성 과정에서 예외 발생 시 `seatStore.revertSold(sessionId, seatIds)` 호출 (롤백)
4. confirmSeats에서 FORBIDDEN/EXPIRED 에러가 발생하면 좌석 상태 변경 없이 그대로 throw

**cancel() 핵심 로직:**
1. reservationId로 Map에서 조회. 없으면 `NOT_FOUND` 에러
2. userId 불일치 시 `FORBIDDEN` 에러
3. 이미 `cancelled` 상태면 `ALREADY_CANCELLED` 에러
4. `seatStore.releaseSold(sessionId, seatIds, userId)` 호출
5. status를 `"cancelled"`로 변경
6. 변경된 Reservation 반환

**listByUser():** Map에서 userId로 필터링, 전체 상태(confirmed+cancelled) 반환

### 4. 팩토리 등록 (`src/services/index.ts` 수정)

기존 패턴을 따라 `getReservationStore()` 함수를 추가한다. `createReservationStoreMemory(getSeatStore())`로 SeatStore 의존성을 주입한다. `ReservationStore` 타입도 re-export한다.

## Acceptance Criteria

```bash
npx vitest run src/services/reservation-store-memory.test.ts
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 기존 테스트도 깨지지 않았는지 확인한다: `npx vitest run src/services/`
3. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
4. 결과에 따라 `phases/6-reservation/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- SeatStore 인터페이스나 구현을 수정하지 마라. 이유: Step 0에서 완성되었다
- API route를 만들지 마라. 이유: Step 2의 스코프이다
- 클라이언트 컴포넌트나 hooks를 만들지 마라. 이유: Step 3, 4의 스코프이다
- 기존 테스트를 깨뜨리지 마라

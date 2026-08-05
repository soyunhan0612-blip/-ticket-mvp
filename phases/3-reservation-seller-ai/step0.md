# Step 3-0: reservation-store

## 읽어야 할 파일

- `/CLAUDE.md` — CRITICAL 규칙 (소유권 403)
- `/docs/ARCHITECTURE.md` — Store 인터페이스, Redis 자료구조 (confirm/cancel 원자성 규칙)
- `/docs/ADR.md` — ADR-004 (원자적 confirm)
- 이전 phase 산출물: `src/services/{seat-store,seat-store-memory,reservation-store}.ts`, `src/types/index.ts`

이전 phase의 SeatStore 구현을 꼼꼼히 읽고 `confirm()`이 어떻게 좌석을 sold로 전환하는지 이해한 뒤 작업.

## 작업

`ReservationStore`의 인메모리 구현. Phase 2 Step 0에서 이미 `SeatStore.confirmSeats()`(좌석만 sold 전환)로 분리해뒀으므로, 여기서는 `ReservationStore.create()`가 `confirmSeats` 호출 후 자신의 레코드를 생성하고 실패 시 좌석 상태를 롤백하는 흐름을 구현한다.

### 1. `src/services/reservation-store-memory.ts`

**tdd-guard 대상. 테스트 먼저** (`reservation-store-memory.test.ts`).

```ts
// globalThis 싱글톤
export const reservationStoreMemory: ReservationStore = { ... };
```

내부:
```ts
type ReservationRecord = {
  id: string;
  userId: string;
  sessionId: string;
  seatIds: string[];
  createdAt: number;
  cancelledAt?: number;
};
```

**핵심 규칙**:
1. **`create(sessionId, seatIds, userId)`는 SeatStore.confirmSeats와 원자적으로 결합**. 순서:
   - `SeatStore.confirmSeats(sessionId, seatIds, userId)` 호출 → 소유자/만료 검증 + 좌석을 sold로 전환
   - `try { Reservation 레코드 생성 } catch (e) { SeatStore.revertSold(sessionId, seatIds); throw e; }`
   - **중간 실패 시 아무것도 남지 않아야** 한다 (좌석은 원래 상태로 롤백)
2. **`cancel(reservationId, userId)`**: 예약 소유자 검증 → `SeatStore.revertSold(sessionId, seatIds)`로 좌석을 available로 → `cancelledAt` 설정. 이미 cancelled면 `ConflictError` (409로 매핑됨)
3. **`listByUser(userId)`**: 해당 userId의 예약만 반환 (다른 유저 예약 노출 X)

### 2. 롤백 전략 (인메모리)

인메모리라 트랜잭션이 없으므로 `SeatStore.revertSold`(Phase 2 step0에서 정의)를 통해 상태를 되돌린다:
- `confirmSeats` 성공 후 예약 레코드 생성 중 예외 발생 → 즉시 `revertSold` 호출로 좌석을 available로 복구
- `revertSold`는 소유권 검사가 없어 서버 내부 롤백 전용. 절대 route handler에서 직접 노출하지 마라

Redis 구현(Phase 4)에서는 Lua 스크립트가 원자성을 담당하므로 이 롤백 로직은 인메모리 전용.

### 3. 테스트 케이스

- 정상 create: 좌석 sold + 예약 존재 + `listByUser`에 나타남
- 남의 hold를 create 시도 → `OwnershipError`, 좌석 그대로 held
- 이미 sold된 좌석 create 시도 → `ConflictError`, 아무 변화 없음
- 예약 cancel: 좌석 available 복구, `cancelledAt` 설정
- 남의 예약 cancel 시도 → `OwnershipError`
- 이미 cancelled 예약 재cancel → `ConflictError`
- 다른 유저의 `listByUser`에 내 예약이 **없음**

## Acceptance Criteria

```bash
npm run test        # reservation-store-memory.test.ts 통과, 기존 seat-store 테스트 여전히 통과
npm run build
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - create 실패 시 좌석 상태가 롤백됨?
   - `listByUser`가 userId 필터링 정확?
   - `ReservationStore` 구현이 `Reservation` 타입을 정확히 반환 (`types/index.ts` 재사용)?
   - 응답 DTO에서 `userId` 필드가 제거됨? (라우트 계층에서 최종 환원, 여기서는 계약만 확인)
3. 결과에 따라 `phases/3-reservation-seller-ai/index.json`의 step 0을 업데이트:
   - 성공 → `"summary": "ReservationStore memory + SeatStore.confirmSeats 조합 + 원자적 롤백. 소유권/중복취소 케이스 통과"`

## 금지사항

- `SeatStore`와 `ReservationStore` 사이에 상호 참조하지 마라. 이유: 순환 참조. `ReservationStore`가 `SeatStore`를 호출하는 단방향만
- 예약 생성 중 실패에 롤백 안 하지 마라. 이유: 좌석은 sold인데 예약이 없는 불일치 = 좌석 사망
- `listByUser`에서 다른 유저 예약 반환 마라. 이유: IDOR
- Reservation 응답에 userId 필드 노출 마라. 라우트 계층에서 제거하고, 본인 조회이므로 `mine: true`로 대체 (SeatSnapshot 규칙과 동일)
- 기존 테스트를 깨뜨리지 마라

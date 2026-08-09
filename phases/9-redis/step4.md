# Step 4: reservation-store-redis

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — "confirm과 cancel도 중간 상태를 남기지 않도록 원자적으로 처리" 절
- `/src/services/reservation-store.ts` — 구현할 인터페이스 (변경 금지)
- `/src/services/reservation-store-memory.ts` — **동작의 기준이 되는 참조 구현**
- `/src/services/reservation-store-memory.test.ts` — 기존 테스트 11건
- `/src/services/seat-store-redis.ts` — Step 2에서 생성. `confirmSeats`/`releaseSold`/`revertSold`를 호출한다
- `/src/services/redis-client.ts` — Step 1에서 생성
- `/src/app/api/reservations/route.ts` — `FORBIDDEN:`/`EXPIRED:` 프리픽스로 403/410을 가르는 곳
- `/src/app/api/reservations/[id]/route.ts` — `NOT_FOUND:`/`FORBIDDEN:`/`ALREADY_CANCELLED:`로 404/403/409를 가르는 곳
- `/src/types/index.ts` — `Reservation`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/services/reservation-store-redis.ts`를 만든다. `src/services/`는 TDD 강제 구간이므로 **테스트를 먼저 작성하라.**

### 구현할 인터페이스 (시그니처 변경 금지)

```typescript
create(sessionId: string, seatIds: string[], userId: string): Promise<Reservation>
listByUser(userId: string): Promise<Reservation[]>
cancel(reservationId: string, userId: string): Promise<Reservation>
```

인메모리 구현과 마찬가지로 `SeatStore`를 생성자 인자로 받는 팩토리 형태로 만들어라:

```typescript
export function createReservationStoreRedis(seatStore: SeatStore): ReservationStore;
```

### 에러 문자열 프리픽스 규약 — 반드시 지켜라

route handler가 이 프리픽스로 HTTP 상태를 가른다. 다르면 500이 난다:

| 상황 | throw 메시지 | route 응답 |
|---|---|---|
| 좌석 소유자 불일치 (`create`) | `FORBIDDEN: ...` | 403 |
| 홀드 만료·미홀드·이미 sold (`create`) | `EXPIRED: ...` | 410 |
| 예약 없음 (`cancel`) | `NOT_FOUND: ...` | 404 |
| 예약 소유자 불일치 (`cancel`) | `FORBIDDEN: ...` | 403 |
| 이미 취소됨 (`cancel`) | `ALREADY_CANCELLED: ...` | 409 |

### create — 원자성

흐름은 인메모리 구현과 동일하다:
1. `seatStore.confirmSeats(sessionId, seatIds, userId)` — 실패하면 좌석은 하나도 변경되지 않은 상태로 throw된다
2. 예약 레코드 생성
3. 2가 실패하면 `seatStore.revertSold(sessionId, seatIds)`로 롤백

> **sold 좌석만 남거나 예약만 생성되는 불일치가 절대 없어야 한다.** 이 저장소의 코드 리뷰 규칙에서 차단 이슈로 지정된 항목이다.

ARCHITECTURE.md는 Redis에서 이 둘을 "단일 Lua 스크립트로 대체"하는 것을 이상적 형태로 제시한다. 다만 좌석 Hash와 예약 레코드가 서로 다른 키에 있으므로, 단일 스크립트로 묶는 것과 `confirmSeats` + 보상 트랜잭션(`revertSold`) 중 하나를 선택할 수 있다.

- 단일 Lua로 묶으면 진짜 원자적이지만 `SeatStore` 추상화를 뚫고 좌석 Hash를 직접 조작하게 된다
- 보상 트랜잭션은 추상화를 지키지만 롤백 자체가 실패할 수 있는 창이 남는다

**어느 쪽을 택하든 그 근거와 남는 실패 창을 summary에 명시하라.** 판단은 재량이되 침묵하지 마라.

### cancel

1. 예약 조회 → 없으면 `NOT_FOUND:`
2. `reservation.userId !== userId` → `FORBIDDEN:`
3. 이미 `cancelled` → `ALREADY_CANCELLED:`
4. `seatStore.releaseSold(sessionId, seatIds, userId)` — 소유권 재검증(방어 심층화)
5. 예약을 `cancelled`로 전환

### listByUser

- 사용자별 예약을 조회한다. 전체 예약을 스캔하지 않도록 사용자별 인덱스(Set 등)를 두어라
- `KEYS` 명령을 쓰지 마라

### 테스트 (`src/services/reservation-store-redis.test.ts`)

`reservation-store-memory.test.ts`의 시나리오를 커버하고 다음을 반드시 포함하라:
- `create` 성공 후 좌석이 sold이고 예약이 confirmed다
- 남의 좌석으로 `create` → `FORBIDDEN:` throw, **좌석 상태가 변하지 않았다**
- 만료된 홀드로 `create` → `EXPIRED:` throw, **예약이 생성되지 않았다**
- `listByUser`가 남의 예약을 반환하지 않는다
- `cancel` 후 좌석이 available로 돌아온다
- 중복 `cancel` → `ALREADY_CANCELLED:`
- 남의 예약 `cancel` → `FORBIDDEN:`, **예약 상태가 변하지 않았다**
- 재시작(새 store 인스턴스 생성) 후에도 예약이 조회된다 — 영속성 검증

Step 2·3과 마찬가지로 **인메모리 fake Redis 또는 모킹으로 테스트하라.**

## Acceptance Criteria

```bash
npx vitest run src/services/reservation-store-redis.test.ts
npm run lint
npm test
npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/9-redis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 예약 레코드를 먼저 만들고 좌석을 나중에 확정하지 마라. 이유: 중간에 실패하면 좌석은 available인데 예약은 confirmed인 불일치가 남는다. 반드시 `confirmSeats` 먼저다
- 롤백 경로를 생략하지 마라. 이유: sold 좌석만 남고 예약이 없으면 그 좌석은 영영 팔 수 없다
- 에러 프리픽스 규약을 바꾸지 마라. 이유: route handler가 이 문자열로 403/404/409/410을 가른다. 다르면 500이 난다
- `cancel`에서 `releaseSold` 대신 `revertSold`를 쓰지 마라. 이유: `revertSold`는 소유권 검사가 없는 롤백 전용 메서드다. 취소 경로에서 쓰면 남의 예약 좌석을 반환시킬 수 있다
- 응답이나 저장 구조를 통해 남의 `userId`가 노출되게 하지 마라. 이유: CLAUDE.md CRITICAL. route가 `sanitizeReservation`으로 제거하지만 store도 남의 예약을 반환하면 안 된다
- `KEYS` 명령을 쓰지 마라. 이유: 프로덕션 금기이며 커맨드 비용이 예측 불가능해진다
- `ReservationStore` 인터페이스의 시그니처를 바꾸지 마라. 이유: Step 5의 팩토리 교체가 프론트 수정 없이 성립해야 한다
- `src/services/index.ts`나 route handler를 수정하지 마라. 이유: 팩토리 교체는 Step 5의 단일 커밋이다
- 실제 Upstash에 연결하는 테스트를 작성하지 마라. 이유: CI에 키가 없다. 실제 연결 검증은 Step 6이다
- 기존 테스트를 깨뜨리지 마라

# Step 2-0: hold-lib-store

## 읽어야 할 파일

- `/CLAUDE.md` — CRITICAL 규칙 (소유권 403, IDOR)
- `/docs/ARCHITECTURE.md` — Store 인터페이스 섹션, Redis 자료구조 섹션 (인메모리도 원자성 규칙 동일)
- `/docs/ADR.md` — ADR-003 (Store 인터페이스), ADR-004 (원자적 hold 근거)
- 이전 phase 산출물: `src/types/index.ts`, `src/lib/{seat-rules,seat-map,mock-data}.ts`

## 작업

좌석 hold의 순수 로직(`lib/hold.ts`)과 인메모리 Store 구현(`services/seat-store-memory.ts`)을 만든다. Phase 4의 Redis 구현이 동일한 계약을 공유하도록 인터페이스를 여기서 확정.

### 1. `src/services/seat-store.ts` — 인터페이스 + 팩토리 자리

```ts
export interface SeatStore {
  getSnapshot(sessionId: string, userId: string): Promise<SeatSnapshot>;
  hold(sessionId: string, seatIds: string[], userId: string, ttlMs: number): Promise<HoldResult>;
  release(sessionId: string, seatIds: string[], userId: string): Promise<void>;         // 소유자 불일치 시 throw new OwnershipError
  confirmSeats(sessionId: string, seatIds: string[], userId: string): Promise<void>;    // held→sold. 소유자 불일치 OwnershipError. Reservation 생성은 ReservationStore가 담당 (순환 참조 방지)
  releaseSold(sessionId: string, seatIds: string[], userId: string): Promise<void>;     // sold→available. 소유자 불일치 OwnershipError. ReservationStore.cancel 전용 (방어 심층화)
  revertSold(sessionId: string, seatIds: string[]): Promise<void>;                      // sold→available. 소유권 검사 없음. ReservationStore.create 실패 롤백 전용
}

export class OwnershipError extends Error { readonly code = 'OWNERSHIP' as const; }
export class ConflictError extends Error {
  readonly code = 'CONFLICT' as const;
  constructor(public conflicts: string[]) { super('conflict'); }
}
```

`services/seat-store.ts`는 interface 파일이라 tdd-guard 검사 대상이지만 export가 인터페이스·에러 클래스뿐이면 테스트가 필요 없다. **에러 클래스에 로직 없음**을 유지해서 테스트 불필요를 만들거나, 얇은 단위 테스트를 붙여라. **env 기반 분기 팩토리는 아직 만들지 마라** (Phase 4에서 Redis 붙일 때). 다음 step(2-1)에서 단일 구현만 export하는 얇은 `services/index.ts`를 추가하는 것은 허용.

### 2. `src/lib/hold.ts` — 만료 판정 순수 함수

**tdd-guard 대상. 테스트 먼저** (`hold.test.ts`).

```ts
export function isExpired(hold: { expiresAt: number }, now: number): boolean;
export function computeExpiry(now: number, ttlMs: number): number;
export const DEFAULT_HOLD_TTL_MS = 2 * 60 * 1000;  // 2분
```

테스트 케이스:
- `expiresAt < now` → expired
- `expiresAt === now` → expired (경계는 expired 쪽)
- `expiresAt > now` → active

**이 함수는 Phase 4 Redis Lua 스크립트에서도 동일한 규칙을 재현해야 함** (인메모리와 동일 결과). 그래서 순수 함수로 분리.

### 3. `src/services/seat-store-memory.ts` — 인메모리 SeatStore

**tdd-guard 대상. 테스트 먼저** (`seat-store-memory.test.ts`).

내부 구조 (예):
```ts
// globalThis 싱글톤 (Next.js dev 핫리로드 대비)
type SessionState = {
  seats: Map<string, { status: 'held' | 'sold'; userId: string; expiresAt?: number }>;
  version: number;
};
```

**핵심 규칙 (반드시 준수)**:

1. **hold는 전체 성공 또는 전체 실패**. 하나라도 충돌하면 `ConflictError(conflicts: string[])` throw. 이때 **어떤 좌석도 변경되지 않아야** 한다 (부분 hold 금지)
2. **만료된 hold는 hold() 호출 시 정리**. 만료된 필드를 발견하면 제거하고 새 hold 부여 (Redis에서 `HSETNX`가 재hold 막는 문제와 동일 상황을 인메모리에서도 시뮬레이션)
3. **release/confirmSeats/releaseSold은 소유자 검사**. `state.userId !== userId`면 `OwnershipError` throw. `revertSold`는 검사 없이 그대로 available 전환
4. **hold/release/confirmSeats/releaseSold/revertSold/만료 정리 때마다 `version` 증가**
5. `getSnapshot`은 **호출된 시점의 만료 상태를 lazy 정리** 후 스냅샷 반환. `mine` 필드는 `state.userId === userId`를 boolean으로 환원해서 담음 (userId 노출 X)

테스트 케이스 (최소):
- 빈 세션에서 3좌석 hold → ok
- 이미 held된 좌석 포함해서 4좌석 hold → ConflictError, **다른 좌석도 held되지 않음**
- 만료된 hold를 다시 hold → ok, 이전 hold 제거됨
- 남의 hold를 release → OwnershipError
- 남의 hold를 confirmSeats → OwnershipError
- confirmSeats 후 좌석 상태 sold, version 증가
- 남의 sold 좌석을 releaseSold → OwnershipError
- releaseSold 후 좌석 available, version 증가
- revertSold는 소유자 검증 없이 sold→available 처리 (내부 롤백 검증)
- getSnapshot 응답에 다른 사용자의 userId 문자열이 **없음** (직렬화된 JSON 검색으로 검증)

### 4. `src/services/reservation-store.ts` — 인터페이스만

```ts
export interface ReservationStore {
  create(sessionId: string, seatIds: string[], userId: string): Promise<Reservation>;
  listByUser(userId: string): Promise<Reservation[]>;
  cancel(reservationId: string, userId: string): Promise<Reservation>;  // 소유자 불일치 403
}
```

구현체는 Phase 3 Step 0에서.

## Acceptance Criteria

```bash
npm run test        # lib/hold.test.ts, services/seat-store-memory.test.ts 통과
npm run build       # 타입 에러 없음
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - `SeatStore` 인터페이스가 ARCHITECTURE.md와 정확히 일치? (`getSnapshot / hold / release / confirmSeats / releaseSold / revertSold`, userId를 마지막 arg로. `confirmSeats`·`releaseSold`는 소유권 검사 O, `revertSold`는 소유권 검사 없이 롤백 전용)
   - `hold`가 전체 성공/실패 원자성 지킴?
   - `getSnapshot` 응답에 다른 사용자의 `userId`가 없음?
   - `lib/hold.ts`의 만료 판정이 순수 함수 (전역 상태 참조 X)?
   - 만료 재hold 테스트가 있음?
3. 결과에 따라 `phases/2-hold-polling/index.json`의 step 0을 업데이트:
   - 성공 → `"summary": "SeatStore 인터페이스(getSnapshot/hold/release/confirmSeats/releaseSold/revertSold) + memory 구현 + lib/hold.ts. 원자성/소유권/만료재hold 테스트 통과"`

## 금지사항

- `Promise.all`로 좌석마다 개별 hold를 시도하지 마라. 이유: 부분 hold 발생. 반드시 사전 검사 → 일괄 커밋
- `getSnapshot`에서 만료된 hold를 정리 없이 그대로 노출하지 마라. 이유: 죽은 hold가 UI에서 다른 사람 소유로 보이는 사고
- `mine`에 userId 문자열이나 다른 식별자를 담지 마라. 반드시 boolean
- Redis 클라이언트를 이 step에서 import하지 마라. 이유: Phase 4 스코프. 지금 붙이면 팩토리가 필요 이상으로 복잡해짐
- fetch를 이 step에서 쓰지 마라. Store는 route가 직접 호출 (동일 프로세스)
- 기존 테스트를 깨뜨리지 마라

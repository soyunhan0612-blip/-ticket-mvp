# Step 4-1: redis-stores

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — Redis 자료구조 섹션 (전문)
- `/docs/ADR.md` — ADR-003, ADR-004 (세션 Hash 근거, 원자성)
- `/CLAUDE.md` — 아키텍처 규칙 (Store 팩토리 교체)
- 이전 phase 산출물: `src/services/{seat-store-memory,reservation-store-memory,show-store-memory}.ts`, `src/lib/hold.ts`

인메모리 구현을 꼼꼼히 읽고 각 메서드의 원자성 규칙(hold 전체성공/실패, 만료 재hold, 소유권 검증)을 이해한 뒤 Redis 버전을 만들라. **인메모리와 Redis가 동일한 계약을 지켜야 lib/hold.ts의 만료 판정이 양쪽에서 동일하게 검증된다.**

## 작업

3개 Store의 Redis 구현 + 팩토리 교체를 **단일 커밋으로**.

### 1. `@upstash/redis` 설치

`package.json`에 `@upstash/redis` 추가. `REST` 기반이라 서버리스에서 자연스럽게 동작.

### 2. `src/services/redis-client.ts` — 클라이언트 생성

```ts
import { Redis } from '@upstash/redis';
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

`services/index.ts` 등 팩토리에서만 import.

### 3. `src/services/seat-store-redis.ts`

**tdd-guard 대상. 테스트 먼저** (`seat-store-redis.test.ts`).

테스트는 두 가지 방법:
- (A) 실제 Upstash에 테스트 인스턴스 사용 (env 변수로 분리) — 안정적이나 CI 셋업 필요
- (B) `@upstash/redis`를 mock (in-memory Hash 시뮬레이션) — 빠르고 CI 편리

**B를 권장** (`vi.mock` 사용). 다만 Lua 스크립트 로직은 별도의 순수 함수로 분리해서 (`src/lib/lua-simulator.ts` 등) TypeScript로도 검증 가능하게.

Redis 구조:
```
Key:   session:{sessionId}:seats
Type:  Hash
Field: seatId → JSON string { status, userId, expiresAt }

Key:   session:{sessionId}:version
Type:  String (integer)
```

메서드 매핑:

- `getSnapshot(sessionId, userId)` — **Lua 스크립트** (만료 정리 + version 증가 원자화):
  ```lua
  -- KEYS[1] = session:{sessionId}:seats
  -- KEYS[2] = session:{sessionId}:version
  -- ARGV = { now }
  -- 1. HGETALL로 모든 좌석 조회
  -- 2. expiresAt <= now 인 held 필드를 HDEL로 제거하고 카운트
  -- 3. 제거된 개수 > 0 이면 INCR version (hold/release/confirm과 동일 규칙)
  -- 4. 살아있는 필드 배열 + 현재 version 반환
  ```
  **주의**: 만료를 스냅샷 응답에서만 감추고 실제로 HDEL/INCR을 안 하면, 클라이언트는 version 미변경으로 atom 갱신을 스킵해 만료 좌석이 계속 held로 남는다 (ARCHITECTURE.md의 `version` 규칙). Lua 한 번으로 정리+INCR을 처리한다.
  - `mine` boolean 환원은 서버 응답 조립 단계에서 수행 (Lua 밖에서 쿠키 userId와 비교)

- `hold(sessionId, seatIds, userId, ttlMs)` — **Lua 스크립트**:
  ```lua
  -- KEYS[1] = session:{sessionId}:seats
  -- KEYS[2] = session:{sessionId}:version
  -- ARGV = { now, ttlMs, userId, ...seatIds }
  -- 1. 각 seatId에 대해 HGET → 만료 확인 → 만료면 임시 삭제 후보
  -- 2. 활성 held/sold가 있으면 conflicts 배열에 추가
  -- 3. conflicts 있으면 아무것도 변경하지 않고 conflicts 반환
  -- 4. 없으면 만료 필드 삭제 + 새 hold 필드 HSET + version INCR
  ```
  결과 파싱: `{ ok: true }` 또는 `{ ok: false, conflicts: [...] }`

- `release(sessionId, seatIds, userId)` — Lua:
  - 각 seatId에 대해 소유자 검증. 다르면 즉시 에러 반환
  - 모두 소유자 일치 시 HDEL + version INCR

- `confirmSeats(sessionId, seatIds, userId)` — **이 메서드는 SeatStore 인터페이스 호환용으로만 유지**. 실제 예약 확정 흐름은 아래 ReservationStore의 `create()` Lua에서 처리한다. `confirmSeats`를 직접 호출하는 route handler는 없어야 한다.

**핵심 규칙 (Lua 안에서 유지)**:
- `lib/hold.ts`의 `isExpired` 로직과 동일: `expiresAt <= now` → expired
- 어떤 케이스에서도 부분 hold/부분 confirm 발생 X
- version은 반드시 증가

### 4. `src/services/show-store-redis.ts` + `reservation-store-redis.ts`

- Show/Session: `SET show:{id} {json}` + `SADD shows:index {id}` (list용)

- **Reservation `create()` — Lua 스크립트 필수** (ARCHITECTURE.md:109 원자성 요구):
  ```
  -- KEYS[1] = session:{sessionId}:seats
  -- KEYS[2] = session:{sessionId}:version
  -- KEYS[3] = reservation:{reservationId}
  -- KEYS[4] = user:{userId}:reservations
  -- ARGV = { now, userId, reservationId, reservationJson, ...seatIds }
  --
  -- 1. 각 seatId에 대해 HGET → 소유자(userId) 검증 + 만료 확인
  --    실패 시 conflicts 배열 반환, 아무것도 변경하지 않음
  -- 2. 모두 통과 시 HSET: status=sold, expiresAt 제거
  -- 3. SET reservation:{reservationId} = reservationJson
  -- 4. SADD user:{userId}:reservations {reservationId}
  -- 5. INCR session:{sessionId}:version
  -- 6. return { ok: true }
  ```
  이 Lua 스크립트 하나가 "좌석 sold 전환 + 예약 레코드 생성"을 **원자적으로** 처리한다.
  중간 실패 시 "sold 좌석만 있고 예약이 없는" 상태가 절대 생기지 않는다.
  인메모리 구현(`reservation-store-memory.ts`)의 try/catch 롤백을 Redis Lua가 대체한다.

- Reservation `cancel()`: 별도 Lua로 예약 소유자·상태 검증 → sold 좌석 HDEL → cancelledAt 갱신 원자 처리
- Show/listAll/listByUser는 원자성 요구가 낮아 별도 Lua 불필요

테스트 먼저.

### 5. `src/services/index.ts` — 팩토리 스위치

```ts
const backend = process.env.STORE_BACKEND ?? 'memory';
export const seatStore: SeatStore = backend === 'redis' ? seatStoreRedis : seatStoreMemory;
export const showStore: ShowStore = backend === 'redis' ? showStoreRedis : showStoreMemory;
export const reservationStore: ReservationStore = backend === 'redis' ? reservationStoreRedis : reservationStoreMemory;
```

- 개발 로컬은 기본 `memory`
- 배포는 `STORE_BACKEND=redis`

### 6. lib/hold.ts 동일성 검증

`src/lib/hold.ts`의 `isExpired`, `computeExpiry` 규칙을 Redis Lua에서도 그대로 재현. 인메모리 테스트와 Redis-simulator 테스트에서 **같은 케이스 표**로 검증:
- `expiresAt < now` → expired
- `expiresAt === now` → expired
- `expiresAt > now` → active

### 7. `src/lib/rate-limit-redis.ts` — Redis 기반 rate limiter

**tdd-guard 대상. 테스트 먼저** (`rate-limit-redis.test.ts`).

Phase 3 step 4에서 만든 인메모리 `checkRateLimit`은 Vercel 서버리스에서 인스턴스별로 초기화돼 "IP당 분당 3회" 보장 불가. 배포용으로 Redis Sorted Set 슬라이딩 윈도우 구현 필요.

```ts
export async function checkRateLimitRedis(
  key: string,          // 예: `ai:desc:ip:{ip}`
  maxPerMinute: number,
  now: number,
): Promise<RateLimitResult>;
```

구조 (Sorted Set):
- `ZADD ratelimit:{key} now now`
- `ZREMRANGEBYSCORE ratelimit:{key} 0 (now - 60000)` — 1분 이전 제거
- `ZCARD ratelimit:{key}` — 현재 윈도우 내 카운트
- `EXPIRE ratelimit:{key} 120` — 자연 만료
- 위 4개는 하나의 Lua 스크립트로 원자 처리 (경쟁 조건 방지)
- 카운트 > maxPerMinute → `{ ok: false, retryAfterMs }` 반환

`src/lib/rate-limit.ts`에 팩토리 추가:
```ts
export const checkRateLimit =
  process.env.STORE_BACKEND === 'redis' ? checkRateLimitRedis : checkRateLimitMemory;
```

route handler(`/api/ai/description` 등)는 팩토리만 참조. 인메모리 구현은 지우지 마라.

### 8. 단일 커밋

execute.py가 코드/메타 커밋을 분리하지만 이 step 자체의 산출물(Store 파일들 + 팩토리 스위치 + rate limiter)은 하나의 논리 단위. 별도 커밋 분리 하지 마라.

## Acceptance Criteria

```bash
npm run test        # seat-store-redis, show-store-redis, reservation-store-redis, rate-limit-redis + 기존 인메모리 테스트 모두 통과
npm run build
# STORE_BACKEND=redis로 재빌드 및 짧은 스모크 (Upstash 실제 연결이 필요하면 blocked)
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - Redis 구조가 세션 Hash 하나?  (좌석별 키 만들지 않음)
   - Lua 스크립트가 hold/release/confirm 원자성 보장?
   - `lib/hold.ts` 만료 판정 규칙이 Lua와 동일?
   - 팩토리 스위치가 env 변수 하나로?
   - `mine` boolean 규칙이 Redis 구현에서도 유지?
3. 결과에 따라 `phases/4-redis-admin-docs/index.json`의 step 1을 업데이트:
   - `getSnapshot` Lua가 만료 정리와 version INCR을 원자 처리?
   - rate-limit-redis가 Sorted Set 슬라이딩 윈도우 + 단일 Lua로 원자 처리?
   - 성공 → `"summary": "seat/show/reservation Store Redis 구현 + Lua 원자성 + rate-limit-redis. 팩토리 STORE_BACKEND 스위치"`
   - Upstash 실제 인스턴스 없이 결정론적 검증 못 함 → blocked: `"UPSTASH_REDIS_REST_URL/TOKEN 필요. 사용자가 Upstash 프로젝트 생성 후 값 제공"`

## 금지사항

- 좌석별 Redis 키(`session:{id}:seat:{seatId}`)를 만들지 마라. 이유: 폴링당 커맨드 폭발 (ADR-004)
- Redis TTL로 hold 만료 처리 마라. 이유: 만료된 필드가 남아 HSETNX가 재hold 막음. **반드시 Lua에서 만료 정리 + `expiresAt` 필드로 판정** (ARCHITECTURE.md 명시)
- 각 좌석마다 별도 Lua 호출 마라. 반드시 seatIds 전체를 한 번의 Lua로
- `redis.multi()`(트랜잭션)로 hold를 감싸지 마라. 이유: MULTI/EXEC는 판정 후 커밋 사이에 원자성 없음. 반드시 Lua EVAL
- 인메모리 Store 파일 지우지 마라. 이유: 개발 편의 + 팩토리로 스위치
- Redis 클라이언트를 route handler에서 직접 import 마라. 반드시 `services/` 경유
- Lua 스크립트를 route handler 안에 인라인 문자열로 두지 마라. `services/seat-store-redis.ts`의 상수 문자열로 관리
- 기존 테스트를 깨뜨리지 마라

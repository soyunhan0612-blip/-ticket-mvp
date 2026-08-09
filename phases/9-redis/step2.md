# Step 2: seat-store-redis

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — **"Redis 자료구조 — 세션 Hash 하나" 절 전체를 정독하라**
- `/docs/ADR.md` — ADR-004 (좌석별 키를 폐기하고 세션 Hash 하나로 간 근거와 비용 계산)
- `/src/services/seat-store.ts` — 구현할 인터페이스 (변경 금지)
- `/src/services/seat-store-memory.ts` — **동작의 기준이 되는 참조 구현. 정독하라**
- `/src/services/seat-store-memory.test.ts` — 26개 테스트. 이 시나리오를 그대로 커버해야 한다
- `/src/services/redis-client.ts` — 이전 step에서 생성
- `/src/lib/hold.ts` — `isExpired`, `createExpiresAt`, `HOLD_TTL_MS`
- `/src/app/api/holds/route.ts` — `conflict` 반환과 403 분기를 소비하는 곳
- `/src/app/api/reservations/route.ts` — `FORBIDDEN:`/`EXPIRED:` 프리픽스로 403/410을 가르는 곳
- `/src/types/index.ts` — `Hold`, `SeatSnapshot`, `SeatSnapshotEntry`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/services/seat-store-redis.ts`를 만든다. `SeatStore` 인터페이스를 Redis로 구현한다.

`src/services/`는 TDD 강제 구간이다. **테스트를 먼저 작성하라.**

### 자료구조 (ARCHITECTURE.md 확정 설계)

```
Key: session:{sessionId}:seats      Hash. 점유된 좌석만 필드로 존재
     Field: seatId → JSON { status: "held"|"sold", userId, expiresAt }

Key: session:{sessionId}:version    정수. 상태가 바뀔 때마다 증가
```

- **available 좌석은 필드로 만들지 마라.** 2000석을 전부 필드로 넣으면 페이로드와 메모리가 폭발한다. 맵에 없는 좌석이 available이라는 것이 클라이언트와의 약속이다.
- `getSnapshot`은 **`HGETALL` 1회**여야 한다. ADR-004가 계산한 대로, 좌석별 키 설계는 폴링 1회당 2000 커맨드가 되어 Upstash Free 월 50만 한도를 8배 초과한다.

### 원자성 — 이 step의 핵심

`hold` / `release` / `confirmSeats` / `releaseSold` / `revertSold`는 **각각 단일 Lua 스크립트**로 처리하라.

> **여러 좌석 중 일부만 홀드되는 상태가 절대 없어야 한다.** 이것은 이 프로젝트의 코드 리뷰 규칙에서 차단 이슈로 지정된 항목이다.

읽고-판단하고-쓰는 것을 애플리케이션 코드에서 나눠 하면 두 요청이 교차할 때 부분 hold가 발생한다. 판단과 쓰기가 같은 스크립트 안에 있어야 한다.

**hold Lua의 필수 동작 순서** (ARCHITECTURE.md가 명시한 함정):
1. 대상 좌석들을 `HGET`으로 읽는다
2. `status == "held"`이면서 만료된 필드는 **삭제한다**
3. 남은 필드 중 `status == "sold"`이거나 `userId`가 다른 것이 하나라도 있으면 → **아무 좌석도 변경하지 않고** 충돌 좌석 목록을 반환한다
4. 전부 가능하면 모든 좌석을 한꺼번에 `HSET`한다
5. `version`을 증가시킨다

**단순 `HSETNX`에 의존하지 마라.** 만료된 필드가 Hash에 남아 있으면 `HSETNX`가 실패해 좌석을 영영 다시 잡을 수 없다. 만료 정리가 hold 스크립트 안에 있어야 하는 이유가 이것이다.

**만료 판정은 Redis TTL이 아니라 `expiresAt` 필드 비교로 하라.** 판정 규칙은 `src/lib/hold.ts`의 `isExpired`와 **동일해야 한다** — 즉 `expiresAt <= now`이면 만료다. Lua에는 `now`를 인자로 넘겨라 (`TIME` 명령은 스크립트 결정성 문제가 있다).

### 인터페이스 계약 — 인메모리 구현과 동일해야 한다

`src/services/seat-store.ts`의 시그니처를 **바꾸지 마라.** route handler들이 이 계약에 의존한다:

```typescript
hold(sessionId, seatIds, userId): Promise<Hold | { conflict: string[] }>
release(sessionId, seatIds, userId): Promise<void>
getSnapshot(sessionId, userId): Promise<SeatSnapshot>
confirmSeats(sessionId, seatIds, userId): Promise<void>
releaseSold(sessionId, seatIds, userId): Promise<void>
revertSold(sessionId, seatIds): Promise<void>
```

**에러 문자열 프리픽스 규약을 반드시 지켜라.** route handler가 이 프리픽스로 HTTP 상태를 가른다:
- 소유자 불일치 → `throw new Error("FORBIDDEN: ...")` → route가 **403**
- 홀드 없음·만료·이미 sold → `throw new Error("EXPIRED: ...")` → route가 **410**

프리픽스가 다르면 route의 `catch`가 에러를 그대로 재던져 **500**이 난다. 이것이 인메모리 구현과의 계약이다.

`getSnapshot` 응답 규칙:
- `mine`은 **서버가 `userId`와 비교해 만든 불리언**이다. **스냅샷에 `userId`를 절대 싣지 마라** (CLAUDE.md CRITICAL — 좌석 탈취 경로가 된다)
- `expiresAt`은 `held` 상태일 때만 포함한다
- 만료된 좌석은 스냅샷에서 정리하고 `version`을 올린다 (인메모리 구현과 동일)

### 테스트 (`src/services/seat-store-redis.test.ts`)

`src/services/seat-store-memory.test.ts`의 시나리오를 **동일하게 커버하라.** 최소한 다음은 반드시 포함한다:

- 다중 좌석 hold 전체 성공
- 하나가 충돌하면 **아무 좌석도 hold되지 않고** `conflict` 목록이 반환된다 (부분 hold 없음을 명시적으로 검증하라)
- 만료 후 같은 좌석 재hold 성공
- 같은 사용자가 자기 좌석을 다시 hold하면 성공한다
- 남의 좌석 `release` 시도 → `FORBIDDEN:` throw
- `confirmSeats`: 소유자 불일치 → `FORBIDDEN:`, 만료·미홀드·이미 sold → `EXPIRED:`
- `confirmSeats`가 일부만 sold로 바꾸는 일이 없다 (하나라도 실패하면 전부 그대로)
- `releaseSold` 소유권 검증, `revertSold`는 소유권 검사 없음
- `getSnapshot`에 `userId`가 들어 있지 않다 (직렬화 결과를 문자열로 검사하라)
- 상태 변경 시 `version`이 증가한다

**테스트 실행 방식**: CI와 로컬 양쪽에서 네트워크 없이 돌아야 한다. 인메모리 fake Redis(Hash·Lua eval을 흉내내는 테스트 더블)를 만들거나, `@upstash/redis` 클라이언트를 모킹하라. 실제 Upstash 연결에 의존하는 테스트를 만들지 마라 — 실제 연결 검증은 Step 6에서 한다.

fake를 만든다면 Lua 스크립트의 로직 자체를 검증하기 어려울 수 있다. 그 경우 **판단 로직을 Lua 문자열과 별개로 테스트 가능한 형태로 두지 말고**, fake가 Lua를 실제로 해석하도록 만들거나, 최소한 스크립트에 넘기는 인자와 반환값 처리를 검증하라. 어떤 방식을 택했는지 summary에 적어라.

## Acceptance Criteria

```bash
npx vitest run src/services/seat-store-redis.test.ts
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

- 여러 좌석의 hold/confirm을 여러 번의 Redis 왕복으로 나눠 처리하지 마라. 반드시 단일 Lua 스크립트로 하라. 이유: 두 요청이 교차하면 일부만 홀드되는 상태가 생긴다. 이 저장소의 코드 리뷰 규칙에서 차단 이슈로 지정된 항목이다
- 좌석마다 Redis 키를 하나씩 만들지 마라. 이유: ADR-004가 계산한 대로 폴링 1회가 2000 커맨드가 되어 Free 한도를 8배 초과한다. 세션당 Hash 하나가 확정 설계다
- 만료를 Redis TTL로 처리하지 마라. 반드시 `expiresAt` 필드 비교로 하라. 이유: Hash 필드에는 개별 TTL이 없고, 만료 필드가 남으면 `HSETNX`가 재hold를 막는다
- `SeatStore` 인터페이스의 시그니처를 바꾸지 마라. 이유: Step 5의 팩토리 교체가 프론트 수정 없이 성립해야 한다. 인터페이스가 바뀌면 route handler를 고쳐야 하고, 그러면 이 phase의 핵심 주장이 무너진다
- 에러 프리픽스 규약(`FORBIDDEN:`, `EXPIRED:`)을 바꾸지 마라. 이유: route handler가 이 문자열로 403/410을 가른다. 다르면 500이 난다
- 스냅샷에 `userId`를 싣지 마라. 이유: 남의 `userId`를 알면 그 사람 행세를 할 수 있는 구조다 (CLAUDE.md CRITICAL)
- `sessionId`를 검증 없이 키에 넣지 마라. 이유: `session:{sessionId}:seats` 키 인젝션 경로다. route에서 zod로 검증하고 있으나 store도 방어하라
- `src/services/index.ts`나 route handler를 수정하지 마라. 이유: 팩토리 교체는 Step 5의 단일 커밋이다
- 실제 Upstash에 연결하는 테스트를 작성하지 마라. 이유: CI에 키가 없다. 실제 연결 검증은 Step 6이다
- 기존 테스트를 깨뜨리지 마라

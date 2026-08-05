# Step 2-1: hold-api-route

## 읽어야 할 파일

- `/CLAUDE.md` — CRITICAL 규칙 전체 (userId 쿠키 소스, mine boolean, 서버 재검증)
- `/docs/ARCHITECTURE.md` — 데이터 흐름, Store 인터페이스
- 이전 step 산출물: `src/services/{seat-store,seat-store-memory}.ts`, `src/lib/hold.ts`
- Phase 0 산출물: `src/lib/{seat-map,seat-rules}.ts`

## 작업

Store 앞에 route handler 3개를 놓는다. 폴링·hold·release 트래픽이 여기로 들어온다.

### 0. 팩토리 임시 생성

`src/services/index.ts`:
```ts
import { seatStoreMemory } from './seat-store-memory';
export const seatStore: SeatStore = seatStoreMemory;
```

Phase 4에서 env 기반 분기 추가. `services/index.ts`는 tdd-guard 예외 (연결 코드).

### 1. `src/lib/session-user.ts` — 쿠키에서 userId 읽기

**테스트 먼저** (`session-user.test.ts`).

```ts
import { cookies } from 'next/headers';
// Next.js 15에서 cookies()는 비동기 API — 반드시 async/await
export async function getUserId(): Promise<string>;  // 쿠키에 없으면 throw. 발급은 middleware가 담당

// 구현 예시:
// const cookieStore = await cookies();
// const uid = cookieStore.get('uid')?.value;
// if (!uid) throw new Error('uid cookie missing');
// return uid;
```

- 쿠키 이름: `uid`
- 없으면 throw (middleware에서 반드시 발급되므로 이 시점에 없음 = 버그)
- **`cookies()`를 동기 호출하지 마라** — Next.js 15에서 `TypeError: cookies() should be awaited` 발생. 모든 route handler에서 `const userId = await getUserId()`로 호출해야 한다

### 2. `src/app/api/holds/route.ts`

**tdd-guard 대상. 테스트 먼저** (`route.test.ts`).

```ts
// POST /api/holds
// body: { sessionId: string, seatIds: string[] }
// resp 200: HoldResult (ok: true) + Set-Cookie 유지
// resp 409: { conflicts: string[] }
// resp 400: { error: '...' } (zod / seat-rules 위반)
// resp 401: 쿠키 없음
export async function POST(req: Request): Promise<Response>;

// DELETE /api/holds
// body: { sessionId: string, seatIds: string[] }
// resp 200: { ok: true }
// resp 403: OwnershipError
export async function DELETE(req: Request): Promise<Response>;
```

**핵심 규칙**:

1. `userId`는 반드시 **쿠키에서만** 읽기 (`getUserId()`). body에 오면 무시
2. zod schema로 body 검증. `sessionId`는 문자열, `seatIds`는 `string[]` (1~4개, 중복 없음)
3. **서버에서 `canHoldSeats(seatIds)` 재호출** — UI 우회 방어
4. **모든 seatId가 `isValidSeatId`(적절한 프리셋) 통과**해야 함 — Redis 키 인젝션·용량 공격 방어
5. Store에서 `ConflictError` 잡아 409 응답
6. `OwnershipError` 잡아 403 응답

테스트 케이스 (`route.test.ts` — 핸들러 함수에 `Request` 직접 넘김):
- 정상 hold → 200
- 4석 초과 → 400 (seat-rules)
- 유효하지 않은 seatId → 400 (seat-map)
- 이미 held된 좌석 포함 → 409, response에 `conflicts` 배열
- 쿠키 다른 유저가 DELETE 시도 → 403
- 쿠키 없음 → 401

### 3. `src/app/api/sessions/[id]/snapshot/route.ts`

**tdd-guard 대상. 테스트 먼저**.

```ts
// GET /api/sessions/[id]/snapshot
// resp 200: SeatSnapshot
export async function GET(req: Request, { params }: { params: { id: string } }): Promise<Response>;
```

- 쿠키에서 userId 읽어 store.getSnapshot(sessionId, userId)
- Cache-Control: `no-store` (폴링이 캐시되면 안 됨)
- 응답에 다른 유저 userId 문자열이 **없어야 함** — 테스트에서 검증

**dev-latency 호출 금지** (Phase 0 Step 3에서 규칙 확정). 폴링에 지연 섞이면 데모 깨짐.

### 4. rate limit (선택, 이 step에서는 skip 가능)

AI route에서 다룸 (Phase 3 Step 4). 여기서는 hold/snapshot에 별도 rate limit 없음 — 좌석 규칙(4석 상한)이 자연스러운 방어.

## Acceptance Criteria

```bash
npm run test         # route.test.ts, session-user.test.ts 통과
npm run build
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - 어느 route에서도 `req.body.userId` / `req.url userId`를 읽지 **않음**? (grep으로 검증)
   - 모든 route에서 `getUserId()` 사용?
   - `canHoldSeats`와 `isValidSeatId`가 서버에서 호출됨?
   - `snapshot` route가 `no-store`?
   - snapshot response body에 다른 사용자 userId 문자열 없음? (테스트로 검증)
   - `dev-latency` import가 `holds`, `snapshot` route에 **없음**?
3. 결과에 따라 `phases/2-hold-polling/index.json`의 step 1을 업데이트:
   - 성공 → `"summary": "/api/holds POST/DELETE + /api/sessions/[id]/snapshot GET. zod + seat-rules 서버 재검증 + 소유권 403 완료"`

## 금지사항

- `req.body`나 `req.url`에서 userId를 읽지 마라. 이유: IDOR. 반드시 `getUserId()` (CLAUDE.md CRITICAL)
- snapshot response에 `userId` 필드를 담지 마라. `mine: boolean`만
- `Promise.all`로 좌석마다 hold를 호출하지 마라. Store 계약이 이미 다중 좌석 원자적 처리
- `dev-latency`를 이 route에 붙이지 마라. 이유: 폴링/hold 데모 깨짐
- middleware를 이 step에서 만들지 마라. 이유: 다음 step (cookie-middleware)의 스코프
- 기존 테스트를 깨뜨리지 마라

# Step 1: shows-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — 특히 CRITICAL 규칙 섹션
- `/docs/ARCHITECTURE.md` — API route 경계, Store 인터페이스 참조 원칙
- `/docs/ADR.md` — ADR-005 (신뢰 경계 — 익명 쿠키 UUID)
- `/src/services/show-store.ts` — 이전 step에서 만든 인터페이스
- `/src/services/show-store-memory.ts` — 이전 step에서 만든 구현체
- `/src/services/index.ts` — `getShowStore()` 팩토리
- `/src/types/index.ts` — Show, Session

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

공연 목록·상세를 반환하는 API route 두 개와 통합 테스트를 작성한다. 클라이언트 컴포넌트가 외부 API를 직접 호출하는 것을 막고 서버가 데이터 접근을 소유하는 CRITICAL 규칙의 첫 실전 적용이다.

### 파일 1 — `src/app/api/shows/route.ts`

```ts
export async function GET(): Promise<Response>
```

- `getShowStore().list()` 호출
- `Response.json({ shows: Show[] })` 형태로 반환
- HTTP 200

### 파일 2 — `src/app/api/shows/[id]/route.ts`

```ts
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response>
```

- `params.id`로 `getShowStore().get(id)` 호출
- 결과가 있으면 `Response.json({ show, sessions })`, HTTP 200
- `null`이면 HTTP 404, `Response.json({ error: "not found" }, { status: 404 })`

Next.js 15에서 `params`는 Promise다. `await context.params`로 열어라.

### 파일 3 — `src/app/api/shows/route.test.ts` (테스트 먼저)

`app/api/**/route.ts` 편집은 `tdd-guard` 훅이 테스트 선행을 강제한다.

핸들러에 직접 `Request`를 넘기는 얇은 통합 테스트. Next.js runtime을 시뮬레이션하지 마라.

```ts
import { GET } from "./route";

it("returns all shows", async () => {
  const res = await GET();
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body.shows).toHaveLength(8);
});
```

### 파일 4 — `src/app/api/shows/[id]/route.test.ts` (테스트 먼저)

검증할 것:
- 존재하는 id → 200, `body.show.id === id`, `body.sessions`는 그 show의 회차만
- 존재하지 않는 id → 404
- `context.params`는 `Promise.resolve({ id })`로 감싸서 전달

## Acceptance Criteria

```bash
npm run lint
npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - route handler가 `getShowStore()`만 참조하는가? `show-store-memory`를 직접 import하면 안 됨 (팩토리 우회 금지)
   - `userId`를 요청에서 받지 않는가? (지금 스코프엔 필요 없음, IDOR CRITICAL 사전 훈련)
   - 응답에 남의 `userId`가 실리지 않는가? (Show/Session에 원래 userId 필드 없음, 확인만)
   - Next.js 15의 async `params` 시그니처를 지켰는가?
3. 결과에 따라 `phases/1-shows-rsc/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약 (예: /api/shows GET·/api/shows/[id] GET + route tests)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"`

## 금지사항

- 클라이언트 컴포넌트에서 이 endpoint를 호출하는 코드를 지금 만들지 마라. 이유: 다음 step(RSC 페이지)이 처리
- `userId`를 요청 바디·쿼리스트링에서 읽지 마라. 이유: IDOR CRITICAL (ADR-005). 이 endpoint는 원래 userId가 필요 없음
- POST/PUT/DELETE 핸들러를 지금 만들지 마라. 이유: Day 8 스코프 (셀러 등록)
- `show-store-memory.ts`를 route에서 직접 import하지 마라. 반드시 `getShowStore()` 팩토리 경유
- 테스트 없이 route 파일을 작성하지 마라. `tdd-guard` 훅이 차단할 것이다
- 기존 테스트를 깨뜨리지 마라

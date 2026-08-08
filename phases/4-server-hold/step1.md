# Step 1: cookie-helper

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — userId 쿠키 규칙
- `/docs/ADR.md` — ADR-005
- `/src/app/api/shows/[id]/route.ts` — 기존 route handler 패턴
- `/src/app/api/shows/[id]/route.test.ts` — 기존 route test 패턴 (`new Request(...)` 방식)

## 작업

`src/lib/cookie.ts`를 TDD로 구현한다. route handler에서 쿠키로부터 userId를 읽는 공통 헬퍼.

### export할 시그니처

```ts
export const USER_ID_COOKIE_NAME = "userId";

export function getUserIdFromRequest(request: Request): string | null;
// request.headers.get("cookie")에서 USER_ID_COOKIE_NAME 값을 파싱하여 반환
// 쿠키가 없거나 빈 문자열이면 null
```

`Request` 객체의 `headers.get("cookie")` 문자열을 직접 파싱한다. `next/headers`의 `cookies()` API는 vitest 환경에서 Next.js 서버 컨텍스트가 없어 모킹이 필요하고, 기존 route test 패턴(`new Request(...)`)과 맞지 않으므로 사용하지 않는다.

### TDD 순서

테스트 파일 `src/lib/cookie.test.ts`를 **반드시 먼저** 작성한다.

테스트 케이스:
1. Cookie 헤더에 userId가 있으면 값을 반환
2. Cookie 헤더에 userId가 없으면 null 반환
3. Cookie 헤더 자체가 없으면 null 반환
4. 빈 문자열 userId면 null 반환
5. 여러 쿠키가 있을 때 userId만 정확히 파싱

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `cookie.ts`가 순수 함수만 export하는가?
   - `next/headers`를 import하지 않는가?
   - 쿠키 이름이 상수(`USER_ID_COOKIE_NAME`)로 export되는가?
3. 결과에 따라 `phases/4-server-hold/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `next/headers`의 `cookies()`를 사용하지 마라. 이유: vitest 환경에서 Next.js 서버 컨텍스트가 없어 모킹이 필요하고, 기존 route test 패턴과 맞지 않음.
- 쿠키 파싱에 외부 라이브러리를 추가하지 마라. 표준 문자열 파싱으로 충분하다.
- 기존 테스트를 깨뜨리지 마라.

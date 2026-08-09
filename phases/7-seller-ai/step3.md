# Step 3: basic-auth

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/PRD.md` — Day 8 Basic Auth 요구사항
- `/src/middleware.ts` — 현재 userId 쿠키 발급 로직
- `/src/lib/cookie.ts` — USER_ID_COOKIE_NAME
- `/.env.example` — BASIC_AUTH_USER, BASIC_AUTH_PASS

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. 테스트 작성 (`src/lib/basic-auth.test.ts` 생성)

**테스트 케이스:**
- 올바른 credentials의 Authorization 헤더를 통과시킨다
- 잘못된 비밀번호를 거부한다
- Authorization 헤더가 없으면 거부한다
- "Basic" 이외의 스킴 (예: "Bearer")을 거부한다
- 잘못된 base64 인코딩을 거부한다
- expectedUser 또는 expectedPass가 undefined면 거부한다
- `isProtectedPath("/seller/new")` → true
- `isProtectedPath("/admin")` → true
- `isProtectedPath("/admin/dashboard")` → true
- `isProtectedPath("/shows")` → false
- `isProtectedPath("/api/shows")` → false
- `isProtectedPath("/api/admin/something")` → false

### 2. 구현 (`src/lib/basic-auth.ts` 생성)

```typescript
export interface BasicAuthResult {
  authenticated: boolean;
}

export function verifyBasicAuth(
  authorizationHeader: string | null,
  expectedUser: string | undefined,
  expectedPass: string | undefined,
): BasicAuthResult;

export function isProtectedPath(pathname: string): boolean;
```

핵심 규칙:
- `/admin`, `/admin/*`, `/seller`, `/seller/*` → true
- `/api/*` → false (API route는 쿠키 인증만 사용)
- 그 외 → false
- base64 디코딩은 Node.js `Buffer.from(encoded, "base64").toString()` 사용

### 3. middleware.ts 확장 (`src/middleware.ts` 수정)

기존 userId 쿠키 발급 로직을 유지하면서 Basic Auth를 추가한다.

동작 흐름:
1. `isProtectedPath(request.nextUrl.pathname)` 확인
2. 보호 경로이면 `verifyBasicAuth()` 호출
3. 인증 실패 시: `new NextResponse("Unauthorized", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Seller/Admin"' } })` 반환
4. 인증 성공 또는 비보호 경로이면: 기존 쿠키 로직 계속 진행
5. `process.env.BASIC_AUTH_USER`, `process.env.BASIC_AUTH_PASS`를 사용

핵심 규칙:
- 기존 userId 쿠키 발급 로직을 깨뜨리지 마라
- Basic Auth 응답에도 userId 쿠키가 설정되어야 한다 (인증 통과 시)
- `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`를 `NEXT_PUBLIC_`로 노출하지 마라

## Acceptance Criteria

```bash
npx vitest run src/lib/basic-auth.test.ts
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/7-seller-ai/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 기존 userId 쿠키 발급 로직을 깨뜨리지 마라. 이유: 모든 관람객 기능이 이 쿠키에 의존한다
- API route에 Basic Auth를 적용하지 마라. 이유: API는 쿠키 인증만 사용하며, Basic Auth는 페이지 접근 제어용이다
- BASIC_AUTH_USER/PASS를 NEXT_PUBLIC_로 노출하지 마라. 이유: 브라우저 번들에 평문 유출
- 기존 테스트를 깨뜨리지 마라

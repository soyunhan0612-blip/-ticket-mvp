# Step 3: middleware-cookie

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — userId 쿠키 규칙
- `/docs/ADR.md` — ADR-005 (익명 쿠키 UUID)
- `/next.config.ts` — 기존 보안 헤더 설정 참조
- `/src/lib/cookie.ts` — Step 1에서 생성됨. USER_ID_COOKIE_NAME 상수 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/middleware.ts`를 생성한다. 모든 요청에 대해 userId 쿠키가 없으면 `crypto.randomUUID()`로 UUID를 생성하여 Set-Cookie한다.

### 구현 요구사항

- 쿠키 이름: `"userId"` — `lib/cookie.ts`의 `USER_ID_COOKIE_NAME`과 반드시 일치해야 한다
- `httpOnly: true` — 클라이언트 JS가 읽을 필요 없음. XSS 방어.
- `sameSite: "lax"` — CSRF 완화.
- `secure`: `process.env.NODE_ENV === "production"`일 때만 true. 로컬 개발은 HTTP이므로 false.
- `maxAge`: 30일 (30 × 24 × 60 × 60 초)
- `path: "/"`
- `config.matcher`: `_next/static`, `_next/image`, `favicon.ico` 등 정적 리소스 요청은 제외

이미 userId 쿠키가 있으면 `NextResponse.next()`를 그대로 반환한다.

이 step에는 TDD 가드 대상 파일이 없다 (middleware.ts는 `lib/`, `services/`, `app/api/**/route.ts`에 해당하지 않음).

## Acceptance Criteria

```bash
npm run test && npm run lint && npx tsc --noEmit
```

`tsc --noEmit`을 추가한 이유: middleware.ts는 테스트 파일이 없으므로 최소한 타입 체크로 검증.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - middleware.ts가 `src/middleware.ts`에 있는가?
   - `crypto.randomUUID()`를 사용하는가?
   - `httpOnly: true`, `sameSite: "lax"` 설정이 있는가?
   - `secure`가 production에서만 true인가?
   - `_next/static`, `_next/image` 등 정적 리소스는 matcher에서 제외되는가?
   - 쿠키 이름이 `lib/cookie.ts`의 `USER_ID_COOKIE_NAME`과 동일한 값("userId")인가?
3. 결과에 따라 `phases/4-server-hold/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 쿠키 이름을 "userId" 외의 것으로 변경하지 마라. `lib/cookie.ts`의 `USER_ID_COOKIE_NAME`과 일치해야 한다.
- `localStorage`로 userId를 관리하지 마라. 이유: RSC에서 읽을 수 없음.
- Basic Auth 로직을 이번 step에서 추가하지 마라. 이유: Day 8 스코프.
- 기존 테스트를 깨뜨리지 마라.

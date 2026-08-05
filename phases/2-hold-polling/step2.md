# Step 2-2: cookie-middleware

## 읽어야 할 파일

- `/CLAUDE.md` — 아키텍처 규칙 (userId 쿠키 발급 지점)
- `/docs/ARCHITECTURE.md` — 렌더링 경계 (userId 발급 지점 섹션 — middleware/proxy 발급)
- `/docs/ADR.md` — ADR-005 (신뢰 경계)
- 이전 step 산출물: `src/lib/session-user.ts` (쿠키 이름 `uid`)

## 작업

최초 요청 시점에 익명 UUID 쿠키 `uid`를 발급. **RSC prefetch 시점에도 신원이 있어야** 하므로 API route가 아니라 middleware에서.

### 1. `src/middleware.ts`

**tdd-guard 예외** (Phase 0 Step 0에서 middleware.ts 예외 추가함). 테스트 필수 아님이지만 얇게 붙이면 좋음.

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

export function middleware(req: NextRequest) {
  if (req.cookies.has('uid')) {
    return NextResponse.next();
  }

  const uid = randomUUID();

  // 응답 쿠키 + 업스트림 요청 쿠키를 동시에 설정해야
  // 같은 요청의 RSC에서 cookies()로 uid를 즉시 읽을 수 있다.
  // res.cookies.set()만 하면 응답에 Set-Cookie가 실리지만
  // cookies()가 읽는 request cookies에는 uid가 없어 getUserId()가 throw한다.
  const requestHeaders = new Headers(req.headers);
  const existing = req.headers.get('cookie');
  requestHeaders.set('cookie', existing ? `${existing}; uid=${uid}` : `uid=${uid}`);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set({
    name: 'uid',
    value: uid,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,  // 1년
  });
  return res;
}

export const config = {
  matcher: [
    // Next.js 내부 정적/이미지/파비콘 제외
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**핵심 규칙**:
- `httpOnly: true` — XSS로도 세션 못 훔침
- `sameSite: 'lax'` — CSRF 방어 대체 (PRD 명시적 비범위)
- `secure`는 프로덕션에서만. 개발(HTTP)에서 secure를 true로 두면 쿠키 자체가 안 심어짐
- `path: '/'` — 전 경로에서 유효
- Basic Auth는 Phase 3 Step 5에서 이 middleware에 확장. 지금은 쿠키 발급만

### 2. `src/lib/session-user.ts` — 이미 존재. 확인만

이전 step에서 만든 `getUserId()`가 쿠키에서 `uid`를 읽음. 여기서 변경 없음.

### 3. 개발 서버 스팟체크 스크립트

`scripts/verify-cookie.sh`(선택, ChatOps 편의용):
```bash
#!/bin/bash
curl -si http://localhost:3000/ | grep -i 'set-cookie: uid=' && echo OK
```

## Acceptance Criteria

```bash
npm run build
npm run test
npm run dev &
sleep 3
curl -si http://localhost:3000/ | grep -qi 'set-cookie: uid='
# 두 번째 요청에는 발급 안 됨
curl -si -b 'uid=existing' http://localhost:3000/ | (! grep -qi 'set-cookie: uid=')
kill %1
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - middleware가 `/api/`, `/shows`, `/sessions` 등 모든 경로에서 동작 (matcher 확인)?
   - `httpOnly` + `sameSite: 'lax'` + `path: '/'`?
   - `secure`는 `NODE_ENV === 'production'` 조건부?
   - 이미 쿠키 있으면 재발급 **하지 않음**?
   - UUID 생성이 `crypto.randomUUID()` (edge runtime 호환)?
3. 결과에 따라 `phases/2-hold-polling/index.json`의 step 2를 업데이트:
   - 성공 → `"summary": "middleware.ts에서 uid 쿠키 발급. httpOnly + sameSite:lax + secure(prod). 재발급 방지"`

## 금지사항

- `localStorage`/`sessionStorage`에 userId를 저장하지 마라. 이유: RSC prefetch 시점에 못 읽음 + XSS로 탈취 가능 (CLAUDE.md CRITICAL)
- `secure: true`를 개발에서도 켜지 마라. 이유: HTTP 개발서버에서 쿠키가 안 심어짐 → 폴링/hold 다 실패
- 쿠키에 userId 이외의 정보(닉네임 등)를 담지 마라. 이유: 익명 UUID 원칙
- `sameSite: 'none'`을 쓰지 마라. 이유: CSRF 방어 사라짐. lax면 GET 폼 이외 대부분 방어
- API route에서 쿠키를 발급하는 코드를 만들지 마라. 이유: RSC prefetch 시점 문제 재발
- `NextResponse.next()` 만 하고 request headers를 업데이트하지 않으면 첫 RSC가 uid를 못 읽는다. 반드시 `NextResponse.next({ request: { headers: requestHeaders } })`로 수정된 요청을 전달하라
- Basic Auth를 이 step에서 만들지 마라. 이유: Phase 3 Step 5 스코프
- 기존 테스트를 깨뜨리지 마라

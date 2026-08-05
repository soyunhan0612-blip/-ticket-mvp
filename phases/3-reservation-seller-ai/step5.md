# Step 3-5: basic-auth

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — /admin·/seller 섹션
- `/CLAUDE.md` — 아키텍처 규칙 (전역 규칙 재확인)
- 이전 phase 산출물: `src/middleware.ts` (Phase 2 Step 2에서 만든 uid 쿠키 middleware)
- 이전 step 산출물: `src/app/seller/new/page.tsx`

## 작업

`/admin`·`/seller`를 Basic Auth로 보호. 관람객 페이지는 익명 접근 유지.

### 1. `.env.example` 업데이트

이미 Phase 0 Step 0에서 `BASIC_AUTH_USER`, `BASIC_AUTH_PASS` 자리를 잡음. 이 step에서 확인만.

### 2. `src/lib/basic-auth.ts` 신설 (공용 검사기)

middleware와 API route가 **같은 함수를 공유**해야 검사 로직이 갈라지지 않는다.

```ts
// src/lib/basic-auth.ts
export function isValidBasicAuth(header: string | null): boolean {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) throw new Error('BASIC_AUTH_USER/PASS 미설정');
  if (!header?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  return decoded === `${user}:${pass}`;
}

export function unauthorizedResponse(): Response {
  return new Response('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Protected"' },
  });
}
```

### 3. `src/middleware.ts` 확장

기존 uid 쿠키 발급 로직과 **함께**:

```ts
export function middleware(req: NextRequest) {
  // 1. Basic Auth (특정 경로만)
  if (needsBasicAuth(req.nextUrl.pathname)) {
    try {
      if (!isValidBasicAuth(req.headers.get('authorization'))) {
        return unauthorizedResponse();
      }
    } catch {
      return new NextResponse('Auth misconfigured', { status: 500 });
    }
  }
  // 2. uid 쿠키 발급 (기존 로직)
  ...
}

function needsBasicAuth(path: string): boolean {
  return (
    path.startsWith('/admin') ||
    path.startsWith('/seller') ||
    path.startsWith('/api/shows') && path === '/api/shows' || // POST 대상
    path.startsWith('/api/ai/')
  );
}
```

- middleware matcher에 `/api/shows`, `/api/ai/:path*`도 반드시 포함시켜라. 안 그러면 curl로 우회된다
- GET `/api/shows`는 관람객이 쓰는 목록 조회이므로 보호에서 빼야 한다. `needsBasicAuth`에서 `req.method !== 'GET'` 조건을 추가하거나, middleware config matcher에서는 경로만 걸고 GET 통과는 **API route 안의 auth 검사에 위임**한다 (아래 4번)
- 환경변수 미설정 시 500 fail-closed. 로그도 남김

### 4. API route 재검증 (**필수**, 방어 심층화)

middleware를 실수로 우회하는 배포 사고를 막기 위해 route handler 진입부에서도 재검증한다.

- `src/app/api/shows/route.ts`의 **POST 핸들러**만 검사 (GET은 제외)
- `src/app/api/ai/description/route.ts` 전체 검사

```ts
// 예: app/api/shows/route.ts POST
export async function POST(req: Request) {
  if (!isValidBasicAuth(req.headers.get('authorization'))) {
    return unauthorizedResponse();
  }
  // ...기존 로직
}
```

### 5. README에 심사자용 계정 명시

프로젝트 루트 `README.md`에 섹션 추가:
```markdown
## 심사자용 계정

`/admin`, `/seller`는 Basic Auth로 보호. 환경변수로 계정 설정:
- `BASIC_AUTH_USER=demo`
- `BASIC_AUTH_PASS=<실제 배포 시 값>`

배포본 심사 시 계정은 README나 이메일로 별도 전달.
```

Phase 4 Step 3에서 최종 README 정리.

## Acceptance Criteria

```bash
npm run build
npm run test        # 기존 테스트 통과
npm run dev &
sleep 3
# 수동:
BASIC_AUTH_USER=test BASIC_AUTH_PASS=test npm run dev &  # 환경변수 세팅 후 재실행
sleep 3
curl -si http://localhost:3000/admin | grep -q '401 Unauthorized'
curl -si -u test:test http://localhost:3000/admin | grep -qv '401'
curl -si http://localhost:3000/shows | grep -qv '401'    # 관람객 페이지는 무관
# API route도 auth 없이 401
curl -si -X POST http://localhost:3000/api/shows -H 'content-type: application/json' -d '{}' | grep -q '401'
curl -si -X POST http://localhost:3000/api/ai/description -H 'content-type: application/json' -d '{}' | grep -q '401'
# GET /api/shows는 통과 (관람객 목록)
curl -si http://localhost:3000/api/shows | grep -qv '401'
kill %1
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - `/admin` 시크릿 창 접근 시 401?
   - `/seller/new` 시크릿 창 접근 시 401?
   - `/shows`, `/sessions/[id]/seats` 등 관람객 페이지는 401 없음?
   - POST `/api/shows`, POST `/api/ai/description` 무인증 호출이 401?
   - GET `/api/shows`는 401 없음?
   - uid 쿠키 발급이 여전히 동작? (Basic Auth 성공한 세션에서 uid 함께 발급)
   - 환경변수 미설정 시 안전한 실패 (500)?
3. 결과에 따라 `phases/3-reservation-seller-ai/index.json`의 step 5를 업데이트:
   - 성공 → `"summary": "middleware Basic Auth 확장 (/admin, /seller, POST /api/shows, /api/ai/*). API route도 재검증. GET /api/shows는 관람객용. README 심사자 계정 자리"`

## 금지사항

- 관람객 페이지(`/`, `/shows/**`, `/sessions/**`, `/reservations`)에 Basic Auth 걸지 마라. 이유: 심사자가 좌석 데모 못 봄
- Basic Auth 계정을 코드에 하드코딩 마라. 이유: 저장소 공개. 반드시 환경변수
- 환경변수 없을 때 인증 통과시키지 마라. 이유: 실수로 배포하면 관리자 페이지 노출. 반드시 500 fail-closed
- CSRF 토큰 추가 마라. 이유: PRD 명시적 비범위. sameSite:lax로 대체
- 세션 쿠키 만들지 마라 (별도 서버 상태). Basic Auth는 매 요청 헤더 검증
- uid 쿠키 발급 로직 지우지 마라. 이유: 세션 판별의 근거
- 기존 테스트를 깨뜨리지 마라

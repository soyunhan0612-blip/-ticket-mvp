# Step 0: auth-hardening

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙과 TDD 강제 구간
- `/docs/ARCHITECTURE.md` — 「보안 경계」 절, 특히 `/admin`·`/seller` 보호
- `/docs/ADR.md` — ADR-005 (신뢰 경계)
- `/src/lib/basic-auth.ts` — 이번 step의 수정 대상
- `/src/lib/basic-auth.test.ts` — 이번 step에서 먼저 확장할 테스트
- `/src/middleware.ts` — `verifyBasicAuth` 호출 지점 (이번 step에서 수정하지 않음)
- `/.env.example` — `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경 — 고쳐야 할 결함

`src/lib/basic-auth.ts`의 `verifyBasicAuth`는 기대 자격증명이 설정되지 않은 경우를 이렇게 걸러낸다:

```ts
if (!authorizationHeader || expectedUser === undefined || expectedPass === undefined) {
  return UNAUTHENTICATED;
}
```

**`undefined`만 검사한다.** 그런데 `.env.local`이나 Vercel 환경변수에 `BASIC_AUTH_USER=`처럼 이름만 있고 값이 없으면, 이 변수는 `undefined`가 아니라 **빈 문자열 `""`로 로드된다**. 실제로 확인한 결과다:

```
{"user_type":"string","user_len":0,"pass_type":"string","pass_len":0}
```

그러면 위 가드를 통과하고, 함수 끝의 비교가 이렇게 된다:

```ts
return { authenticated: user === expectedUser && password === expectedPass };
// "" === "" && "" === ""  →  true
```

즉 **사용자명과 비밀번호를 둘 다 비운 채 요청하면 인증을 통과한다.** 브라우저에서 Basic Auth 프롬프트에 아무것도 입력하지 않고 확인을 누르면 `Authorization: Basic Og==`가 전송되고(`Og==`는 `":"`의 base64), `curl -u ":"`도 동일하다. `middleware.ts`의 `isProtectedPath`가 보호하는 `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*`, `/seller`, `/seller/*`가 전부 열린다.

기존 테스트 `src/lib/basic-auth.test.ts`의 `it.each([[undefined, "secret"], ["seller", undefined]])` 케이스는 `undefined`만 덮고 있어 이 경로를 잡지 못한다.

**설정되지 않은 자격증명은 열리는 방향이 아니라 닫히는 방향으로 실패해야 한다.** 이것이 이 step의 유일한 목적이다.

## 작업

`src/lib/`은 `tdd-guard` 훅이 테스트 선행을 강제하는 구간이다. **반드시 테스트를 먼저 추가하고 실패를 확인한 뒤** 구현을 고쳐라. 순서를 어기면 훅이 편집을 차단한다.

### 1. `src/lib/basic-auth.test.ts` 확장 (먼저)

아래 케이스를 추가한다. 기존 테스트는 하나도 지우거나 수정하지 마라.

- `expectedUser`가 `""`일 때 거부한다
- `expectedPass`가 `""`일 때 거부한다
- `expectedUser`와 `expectedPass`가 둘 다 `""`이고 헤더가 `"Basic Og=="`(빈 사용자·빈 비밀번호)일 때 거부한다 — 실제 우회 경로를 그대로 재현하는 회귀 테스트다

이 시점에서 `npm test -- src/lib/basic-auth.test.ts`를 실행해 **새 테스트가 실패하는 것을 확인하라.** 실패하지 않으면 테스트가 결함을 재현하지 못하고 있는 것이므로 테스트를 다시 작성한다.

### 2. `src/lib/basic-auth.ts` 수정 (그 다음)

`verifyBasicAuth`의 가드가 빈 문자열까지 거르도록 바꾼다. 시그니처는 그대로 유지한다:

```ts
export function verifyBasicAuth(
  authorizationHeader: string | null,
  expectedUser: string | undefined,
  expectedPass: string | undefined,
): BasicAuthResult
```

`isProtectedPath`는 수정하지 않는다.

### 3. 검증

`npm test -- src/lib/basic-auth.test.ts`로 새 테스트가 통과하는지, 그리고 기존 케이스가 여전히 통과하는지 확인한다.

## Acceptance Criteria

```bash
npm run lint
npm test
```

전체 테스트가 통과해야 한다. 이 step 착수 시점의 테스트 수는 324개이며, 새로 추가한 케이스만큼 늘어야 한다.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 순수 로직이 `src/lib/`에 남아 있는가?
   - `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`에 `NEXT_PUBLIC_` 접두사를 붙이지 않았는가? (CLAUDE.md CRITICAL)
   - 기대 자격증명이 없을 때 fail-closed인가?
3. 결과에 따라 `phases/10-release/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 구현을 먼저 고치고 테스트를 나중에 쓰지 마라. 이유: `tdd-guard` 훅이 `src/lib/` 편집을 차단하며, CLAUDE.md가 TDD를 CRITICAL로 지정했다
- `src/middleware.ts`를 수정하지 마라. 이유: `verifyBasicAuth`가 `false`를 반환하면 middleware가 이미 401과 `WWW-Authenticate` 헤더로 응답한다. 같은 판정을 두 곳에 두면 규칙이 갈라진다
- 자격증명이 없을 때 인증을 건너뛰고 통과시키는 "개발 편의" 분기를 넣지 마라. 이유: 그것이 지금 고치려는 결함 그 자체다
- `.env.local`에 값을 채우거나 읽어서 코드에 넣지 마라. 이유: 이 step은 코드 수정이며, 환경변수 설정은 사람이 배포 환경에서 하는 일이다
- `isProtectedPath`의 보호 경로를 늘리거나 줄이지 마라. 이유: 이 step의 범위 밖이며 기존 테스트가 경로 집합을 고정하고 있다
- README나 문서를 수정하지 마라. 이유: step1·step2의 범위다
- 기존 테스트를 깨뜨리지 마라

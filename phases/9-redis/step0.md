# Step 0: upstash-install

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — 특히 `NEXT_PUBLIC_` 접두사 금지 규칙
- `/docs/ARCHITECTURE.md` — "Redis 자료구조" 절
- `/docs/ADR.md` — ADR-003, ADR-004
- `/package.json` — 현재 의존성
- `/.env.example` — 이미 선언된 Upstash 키 이름

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Upstash Redis 클라이언트를 의존성에 추가한다.

```bash
npm install @upstash/redis
```

확인 사항:
- `@upstash/redis`가 `dependencies`에 들어간다 (`devDependencies`가 아니다 — 런타임에 필요하다)
- `package-lock.json`이 함께 갱신된다
- 다른 의존성 버전이 함께 올라가지 않았는지 확인하라. 올라갔다면 되돌려라

`.env.example`에는 이미 다음 두 키가 선언돼 있다. **새로 추가하거나 이름을 바꾸지 마라**:

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Acceptance Criteria

```bash
npm run lint
npm test
npm run build
```

설치 확인:
```bash
node -e "console.log(require('./package.json').dependencies['@upstash/redis'])"
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

- `NEXT_PUBLIC_UPSTASH_*` 같은 이름의 환경변수를 만들지 마라. 이유: `NEXT_PUBLIC_` 접두사가 붙으면 토큰이 브라우저 번들에 평문으로 들어간다. Redis 토큰이 유출되면 누구나 데이터를 읽고 쓸 수 있다 (CLAUDE.md CRITICAL)
- `ioredis`나 `redis` 같은 TCP 기반 클라이언트를 설치하지 마라. 이유: Vercel 서버리스 환경에서는 HTTP 기반인 `@upstash/redis`를 써야 한다. ADR이 정한 스택이다
- store 구현체를 이 step에서 만들지 마라. 이유: Step 1~4의 스코프다. 이 step은 의존성 추가만 한다
- `.env.local`이나 실제 자격증명을 커밋하지 마라. 이유: `.gitignore`가 `.env*`를 막고 있다. 이를 우회하지 마라
- 기존 테스트를 깨뜨리지 마라

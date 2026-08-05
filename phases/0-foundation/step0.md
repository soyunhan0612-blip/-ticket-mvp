# Step 0: repo-safety

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트 규칙과 사고 방지 배경을 파악하라:

- `/CLAUDE.md`
- `/docs/ADR.md` — 하단 "착수 전 처리 (Day 1 최우선)" 3가지 항목이 이 step의 근거
- `/.claude/settings.json`과 `/.codex/hooks.json` — 이미 정렬된 agent 훅 상태
- `/scripts/hooks/` — Claude/Codex 공유 정책과 역할별 훅
- `/.gitignore` — 현재 무시 목록

## 작업

프로젝트에 코드를 한 줄도 쓰기 전에, 이후 개발 내내 사고를 낼 3가지 함정을 먼저 막는다.

### 1. `.gitignore` 강화
현재 `.gitignore`는 Node/Next 산출물(`node_modules/`, `.next/`, `out/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`), Python 캐시(`__pycache__/`, `.pytest_cache/`, `*.py[cod]`), 하네스 산출물(`phases/**/phase*-output.json`, `phases/**/step*-output.json`)만 막는다. AI API 키와 Upstash 토큰이 `.env.local`에 들어가는 순간 커밋되므로 공개 저장소용 포트폴리오에서 사고다.

다음을 추가하라:
```
.env*
!.env.example
.vercel
```

그리고 프로젝트 루트에 **`.env.example`을 생성**하라 (키 이름만, 값 없음):
```
# Anthropic — AI 공연 설명 생성 (Phase 3)
ANTHROPIC_API_KEY=

# Upstash Redis — Phase 4에서 사용
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# /admin, /seller Basic Auth (Phase 3)
BASIC_AUTH_USER=
BASIC_AUTH_PASS=

# Store 팩토리 스위치 (Phase 4에서 'redis'로)
STORE_BACKEND=memory
```

### 2. Agent 훅 상태 확인

Claude/Codex 훅은 스캐폴딩 전에 이미 정렬되어 있다. 이 step에서는 훅을 다시 작성하지 말고 다음 불변식만 확인한다.

- `package.json`이 없으면 TDD와 Stop 게이트가 통과한다.
- 스캐폴딩 이후 `src/lib/**`, `src/services/**`, `src/app/api/**/route.ts`는 테스트 선행을 강제한다.
- `components/`, `atoms/`, provider, middleware, page/layout, types, 설정 파일은 TDD 가드 대상이 아니다.
- Stop 게이트는 `lint`와 `test`만 실행하고 `build`는 실행하지 않는다.

## Acceptance Criteria

```bash
# 1. .gitignore에 .env* 있음
grep -q '^\.env\*' .gitignore

# 2. .env.example 존재
test -f .env.example

# 3. 역할별 Codex 훅 테스트 통과
node --test scripts/hooks/hook-utils.test.cjs

# 4. Claude/Codex Stop 훅에 build가 없음
! grep -q 'npm run build' .claude/settings.json
! grep -q 'npm run build' scripts/hooks/codex-verify-gate.cjs
```

## 검증 절차

1. 위 AC 커맨드 전부 통과.
2. 아키텍처 체크리스트:
   - ADR "착수 전 처리" 3가지 모두 해결?
   - `.env.example`에 실제 시크릿 값이 들어있지 않음?
   - 훅 테스트에서 `lib/`, `services/`, 중첩된 `app/api/**/route.ts` 차단과 비대상 파일 통과를 검증했는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 0을 업데이트:
   - 성공 → `"status": "completed"`, `"summary": ".gitignore/.env.example 정리와 기존 Claude/Codex 훅 검증 완료. package.json 없음"`
   - 실패 → `"status": "error"`, `"error_message": "..."` (3회 재시도 후)

## 금지사항

- `package.json`을 만들지 마라. 이유: 다음 step(project-setup)의 스코프. 이 step은 사고 방지만 한다
- `next.config`를 만들지 마라. 이유: Next.js 셋업 이후에나 존재 가능
- `.env.local` 실제 값을 넣지 마라. 이유: 개인 시크릿은 심사자 로컬에서 각자 채운다
- `.gitignore`에 이미 있는 `phases/**/phase*-output.json`, `phases/**/step*-output.json` 규칙을 지우지 마라. 이유: execute.py 산출물이다
- 기존 테스트를 깨뜨리지 마라 (현재 테스트가 없어도 하네스가 회귀 검사)

# Step 0: env-hygiene

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙, 특히 `NEXT_PUBLIC_` 접두사 금지
- `/docs/ADR.md` — "착수 전 처리" 섹션의 `.gitignore` 항목
- `/docs/PRD.md` — Day 1 항목과 비용 표 (필요한 외부 서비스 파악)
- `/.gitignore` — 현재 존재하는 항목 확인 (중복 추가 방지)

## 작업

이 프로젝트는 공개 저장소에 올라갈 포트폴리오다. AI API 키와 Upstash 토큰이 실수로 커밋되는 사고를 원천 차단하는 것이 이 step의 목적이다.

### 1) `.gitignore` 보강

현재 `.gitignore`에는 `.env*` 계열이 빠져 있다. 아래 항목을 **추가**하라 (기존 항목은 삭제하지 말 것):

```
# 환경 변수
.env*
!.env.example

# Vercel
.vercel
```

- `!.env.example`은 `.env*` 패턴의 예외로, 심사자가 필요한 키 이름을 확인할 수 있도록 커밋 대상에 남긴다.
- 기존 항목(`node_modules/`, `.next/`, `phases/**/phase*-output.json` 등)을 건드리지 마라.

### 2) `.env.example` 생성

프로젝트 루트에 아래 키 이름만 담긴 파일을 만든다. **값은 비운다.** 각 키의 용도를 한 줄 주석으로 남긴다.

- `ANTHROPIC_API_KEY` — Haiku 4.5 (셀러 등록 AI 설명 생성용, Day 8)
- `UPSTASH_REDIS_REST_URL` — Redis 영속화용 (Day 9)
- `UPSTASH_REDIS_REST_TOKEN` — 같은 용도
- `BASIC_AUTH_USER` — `/admin`·`/seller` 미들웨어 인증 (Day 8)
- `BASIC_AUTH_PASS` — 같은 용도

### 3) 검증

로컬에 임시 `.env.local`을 만들어 gitignore 동작을 확인한다. 검증 후 임시 파일은 삭제.

## Acceptance Criteria

```bash
# .env.local이 무시되는지 확인
echo "TEST=1" > .env.local
git check-ignore -v .env.local   # 매칭 라인이 출력되면 성공
rm .env.local

# .env.example은 tracked (또는 tracked 가능 상태)여야 함
git check-ignore .env.example    # 아무것도 출력되지 않아야 성공 (exit 1)

# 실제 파일 존재 확인
test -f .env.example
```

## 검증 절차

1. 위 AC 커맨드가 모두 예상대로 동작하는지 확인한다.
2. 아키텍처 체크리스트:
   - `.env.example`에 실제 값(진짜 API 키)이 들어가 있지 않은가?
   - `NEXT_PUBLIC_` 접두사가 붙은 키가 있는가? → 절대 금지 (브라우저 번들 유출)
   - 기존 `.gitignore` 항목이 삭제되지 않았는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": ".gitignore에 .env*·.vercel 추가, .env.example 5개 키 이름으로 생성"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 즉시 중단

## 금지사항

- `.env.example`에 진짜 API 키를 넣지 마라. 이유: 커밋되는 파일이라 즉시 유출된다.
- `NEXT_PUBLIC_` 접두사를 어떤 시크릿 키에도 붙이지 마라. 이유: Next.js가 브라우저 번들에 평문으로 임베드한다.
- 기존 `.gitignore` 항목(`node_modules/`, `.next/`, `phases/**/phase*-output.json` 등)을 삭제하거나 재정렬하지 마라. 이유: 하네스와 다른 산출물 무시 규칙을 깨뜨린다.
- `.env.local`이나 `.env` 실제 파일을 커밋하지 마라. 이유: 심사자용은 `.env.example`만 있으면 된다.
- 기존 테스트를 깨뜨리지 마라.

# Step 4: security-headers-deploy

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — 보안 헤더 섹션
- `/CLAUDE.md` — CRITICAL 규칙 전체 (배포 전 마지막 재검토)
- `/docs/PRD.md` — Day 2 "빈 껍데기라도 배포" 원칙
- 이전 step 산출물: `src/app/(viewer)/shows/**`

## 작업

배포 리스크를 마지막 날로 미루지 않는다. 지금 껍데기 상태로 한 번 Vercel에 올려서, Phase 1~4에서 발견될 배포 관련 문제(next.config, 환경변수 누락, Tailwind 프로덕션 정리 등)를 조기에 잡는다.

### 1. `next.config.js` (또는 `.mjs`) — 보안 헤더 3종

```js
// headers()에서 반환
[
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
```

모든 경로(`source: '/:path*'`)에 적용.

이미지 `remotePatterns`는 이 step에서는 비워둔다 (Phase 3에서 포스터 프리셋 URL이 확정되면 화이트리스트 추가).

### 2. `README.md` — 배포 안내

프로젝트 루트에 README 최소본:

```markdown
# 티켓 예매 MVP

## 로컬 실행
1. `.env.example`을 `.env.local`로 복사하고 값 채우기
2. `npm install`
3. `npm run dev`

## 배포
Vercel Hobby. 환경변수는 `.env.example` 참조.
```

Phase 4 Step 3에서 데모 GIF·성능 표·"알고도 제외한 것" 추가.

### 3. Vercel 배포

**이 부분은 대화형 인증이 필요하므로 자동화할 수 없다.** 다음을 시도:

1. `npx vercel --version`으로 Vercel CLI 존재 확인. 없으면 `npm i -g vercel` 안내
2. `vercel link` 및 `vercel --prod`는 로그인·프로젝트 링크 필요 → **사용자 개입 필요**

이 step은 **AC 앞부분(로컬 빌드 통과)까지 자동으로 수행**하고, 배포 자체는 사용자에게 넘긴다.

Store 팩토리는 아직 존재하지 않으므로 환경변수는 이 step에서 설정할 것이 사실상 없다. Phase 3~4에서 채워진다.

## Acceptance Criteria

```bash
npm run lint
npm run build        # 프로덕션 빌드 성공 (이 step은 build를 반드시 돌린다)
npm run test
```

수동:
- 로컬에서 `npm run build && npm run start` → `curl -I http://localhost:3000/shows` 응답 헤더에 `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` 존재
- Vercel 배포는 사용자가 `vercel --prod` 실행

## 검증 절차

1. AC 통과 (npm run build 반드시).
2. 아키텍처 체크리스트:
   - `next.config`의 헤더가 3종 모두 있음?
   - `remotePatterns`가 비어있음? (Phase 3에서 채움 — 미리 열어두면 임의 URL 프록시 위험)
   - `next.config`에 개발 편의 옵션이 프로덕션까지 새어나가지 않음? (예: `reactStrictMode: false` 금지)
3. 결과에 따라 `phases/0-foundation/index.json`의 step 4를 업데이트:
   - Vercel 로그인/배포까지 성공 → `"status": "completed"`, `"summary": "보안 헤더 3종 + Vercel 첫 배포 URL: <url>"`
   - 로컬 빌드까지만 되고 Vercel 배포는 대화형 인증 필요 → `"status": "blocked"`, `"blocked_reason": "Vercel CLI 로그인 필요. 사용자가 'vercel login' 후 'vercel --prod' 실행"`

## 금지사항

- `Content-Security-Policy`를 추가하지 마라. 이유: 이 MVP 범위에서 CSP를 제대로 짜려면 별도 시간 필요. `X-Frame-Options: DENY`만으로도 클릭재킹은 방어됨
- `next.config`의 `images.remotePatterns`를 임의 URL(`*`)로 열지 마라. 이유: 임의 URL 프록시 = 컨텐츠 방어 우회 (CLAUDE.md·ARCHITECTURE.md 명시)
- 배포 자동화를 위해 `.vercel/` 토큰 파일을 커밋하지 마라. 이유: `.gitignore`에 `.vercel` 이미 포함
- 기존 테스트를 깨뜨리지 마라

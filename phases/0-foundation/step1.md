# Step 1: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 스택과 디렉토리 규칙을 파악하라:

- `/CLAUDE.md` — 기술 스택 섹션 전체
- `/docs/ARCHITECTURE.md` — 디렉토리 구조 섹션
- `/docs/ADR.md` — ADR-001, ADR-002 (Tanstack Query·Jotai를 쓰는 근거)
- 이전 step 산출물: `.env.example`, 수정된 `.claude/settings.json` / `scripts/hooks/tdd-guard.sh`

## 작업

Next.js 15 App Router 프로젝트를 셋업한다. **의존성만 넣고 실제 화면·좌석 로직은 다음 step 이후에서**.

### 1. `package.json` 생성

- 이름: `ticket-mvp`
- 스크립트: `dev`, `build`, `start`, `lint`, `test`
- Node 20+
- `test`는 `vitest run` (watch 모드 아님, Stop 훅에서 돌아야 함)
- `lint`는 `next lint`

### 2. 필수 의존성 설치

**dependencies**:
- `next@^15` (App Router)
- `react@^19`, `react-dom@^19`
- `@tanstack/react-query@^5` (서버 상태 + 폴링)
- `jotai@^2` (atomFamily 구독 격리)
- `zod@^3` (route handler 입력 검증)

**devDependencies**:
- `typescript@^5`
- `@types/react`, `@types/react-dom`, `@types/node`
- `tailwindcss@^3`, `postcss`, `autoprefixer`
- `vitest@^2`, `@vitest/coverage-v8`
- `jsdom` (컴포넌트 테스트 필요 시)
- `eslint`, `eslint-config-next`

### 3. `tsconfig.json` — **strict 모드 필수**

`"strict": true`, `"noUncheckedIndexedAccess": true`, `paths` alias `@/*` → `src/*`.

### 4. Tailwind 셋업

`tailwind.config.ts`의 `content`는 `src/**/*.{ts,tsx}`.

### 5. `vitest.config.ts`

- `environment: 'node'` (기본). 컴포넌트 테스트가 필요한 파일만 상단 주석 `// @vitest-environment jsdom`으로 오버라이드
- `alias`로 `@/*` → `src/*` 매핑
- **`passWithNoTests: true` 필수** — Vitest 2의 기본값은 false라 테스트 파일이 없으면 exit 1. 초기 스캐폴딩 단계에서 Stop 훅이 실패한다.

### 6. 디렉토리 스켈레톤

`ARCHITECTURE.md` 디렉토리 구조에 맞춰 빈 폴더가 아닌 **최소 필수 파일만** 생성:

```
src/
├── app/
│   ├── layout.tsx     # <html><body>{children}</body></html> 최소 셸
│   ├── page.tsx       # "Ticket MVP" 정도 문구 하나
│   └── globals.css    # @tailwind base/components/utilities
```

`components/`, `atoms/`, `lib/`, `services/`, `types/`는 파일이 생길 때 자연스럽게 만들어진다. 이 step에서는 만들지 마라.

### 7. `.gitignore` 확인

`.next/`가 이미 있는지, 없으면 추가.

## Acceptance Criteria

```bash
npm install
npm run lint         # Next.js 기본 규칙 통과
npm run build        # 빈 페이지 프로덕션 빌드 성공
npm run test         # 테스트가 0개여도 exit 0 (vitest.config.ts의 passWithNoTests: true 덕분)
```

## 검증 절차

1. 위 AC 커맨드 전부 통과.
2. 아키텍처 체크리스트:
   - `tsconfig.json`에 `"strict": true` 있는가?
   - 스택이 CLAUDE.md와 정확히 일치? (Next.js 15, React 19, Tanstack Query 5, Jotai 2, vitest)
   - `src/` alias가 `@/*`로 잡혔는가?
   - `components/`, `atoms/`, `lib/`, `services/`, `types/`를 미리 만들지 않았는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 1을 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "Next.js 15 + TS strict + Tailwind + Query + Jotai + vitest 셋업. src/app/{layout,page}.tsx만 존재"`
   - 실패 → `"status": "error"`, `"error_message": "..."`
   - blocked (예: 네트워크 문제로 npm install 실패) → `"status": "blocked"`, `"blocked_reason": "..."`

## 금지사항

- Tanstack Query Provider를 이 step에서 셋업하지 마라. 이유: 좌석 페이지 만들 때(Phase 2 Step 3) 함께 붙인다. 지금 provider만 만들면 client 경계가 흐려진다
- Jotai `Provider`를 셋업하지 마라. 같은 이유
- 좌석/공연/hold 관련 파일을 만들지 마라. 이유: 각각 Phase 0 Step 2 이후, Phase 2 등에서 처리
- `src/app/api/`를 미리 만들지 마라. 이유: 첫 route는 Phase 0 Step 3
- 폰트 최적화, 이미지 최적화 라이브러리, 아이콘 라이브러리를 추가하지 마라. 이유: MVP 스코프. 필요해질 때 각 step에서 추가
- 기존 테스트를 깨뜨리지 마라

# Step 1: project-scaffold

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — 기술 스택, 아키텍처 규칙, `NEXT_PUBLIC_` 금지, `dynamic = 'force-dynamic'` 요구사항
- `/docs/ARCHITECTURE.md` — 디렉토리 구조 (`src/app/`, `src/components/`, `src/lib/`, `src/services/`, `src/atoms/`, `src/types/`), 렌더링 경계, 보안 헤더 요구
- `/docs/ADR.md` — Stop 훅에서 `build`를 뺀 이유
- `/docs/PRD.md` — Day 1 스캐폴딩 항목, 검증 커맨드
- `/AGENTS.md` — 개발 워크플로 규정
- `/.gitignore`, `/.env.example` — Step 0 산출물 (덮어쓰지 말 것)
- `/scripts/hooks/claude-verify-gate.cjs` — `npm run lint`와 `npm run test`를 호출하니 두 스크립트가 반드시 존재해야 한다
- `/scripts/hooks/codex-tdd-guard.cjs` — `package.json` 생성 시점부터 TDD 가드가 활성화된다

이전 step에서 만들어진 파일을 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

이 프로젝트를 실제로 빌드/실행/테스트 가능한 상태로 만드는 것이 이 step의 목적이다. **`create-next-app`을 쓰지 말고 수동 구성**하라.

### 1) `package.json`

- name: `ticket-mvp`, private: true, type: `"module"`
- 필수 dependencies:
  - `next@^15`, `react@^19`, `react-dom@^19`
  - `@tanstack/react-query@^5`
  - `jotai@^2`
- 필수 devDependencies:
  - `typescript@^5`, `@types/react`, `@types/react-dom`, `@types/node`
  - `tailwindcss@^3`, `postcss`, `autoprefixer`
  - `vitest`, `@vitejs/plugin-react`, `jsdom`
  - `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
  - `eslint@^8`, `eslint-config-next@^15`
- scripts:
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `lint`: `next lint`
  - `test`: `vitest run`
  - `test:watch`: `vitest`

버전은 위 하한을 만족하는 최신 stable을 선택하되, Next 15 + React 19 + Tanstack Query v5 조합이 호환되어야 한다.

### 2) TypeScript 설정 — `tsconfig.json`

- `strict: true` (필수)
- `moduleResolution: "bundler"`, `module: "esnext"`, `target: "es2022"`
- `paths`: `"@/*": ["./src/*"]`
- `plugins: [{ "name": "next" }]`
- `include`: `["next-env.d.ts", "src/**/*", ".next/types/**/*.ts"]`

### 3) `next.config.ts` (또는 `.mjs`) — 보안 헤더 3종 필수

모든 경로에 아래 헤더를 적용:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

`headers()` async 함수를 export하는 표준 Next 패턴을 사용한다.

### 4) Tailwind — `tailwind.config.ts`, `postcss.config.js`

- content: `["./src/**/*.{ts,tsx}"]`
- 색·간격 커스터마이징은 이 step에서 하지 마라 (Day 2 task에서 확정).
- `darkMode: "class"` 정도만 지정.

### 5) `src/app/` 최소 셸

- `src/app/layout.tsx` (Server Component): `<html lang="ko">`, `<body>`, `Providers`로 children 감싸기, `globals.css` import
- `src/app/page.tsx` (Server Component): placeholder 텍스트 하나 (예: "Ticket MVP")
- `src/app/globals.css`: `@tailwind base; @tailwind components; @tailwind utilities;`

### 6) `src/components/providers.tsx`

- `"use client"` 지시자 필수
- `QueryClient` 인스턴스는 컴포넌트 내부에서 `useState(() => new QueryClient(...))` 패턴으로 생성 (모듈 최상위 금지 — RSC 하이드레이션에서 사용자 간 상태 공유 위험)
- `<QueryClientProvider>`와 Jotai `<Provider>`로 children을 감싼다
- 시그니처:
  ```ts
  export function Providers({ children }: { children: React.ReactNode }): JSX.Element
  ```

### 7) `vitest.config.ts`

- `environment: "jsdom"`, `globals: true`
- alias: `"@": path.resolve(__dirname, "./src")`
- `plugins: [react()]`
- setupFiles: `["./vitest.setup.ts"]` (파일 생성 필요)
- `vitest.setup.ts`에 `import "@testing-library/jest-dom"` 정도

### 8) ESLint — `.eslintrc.json`

- `extends: ["next/core-web-vitals"]` 정도의 최소 설정

### 9) 스모크 테스트

`src/lib/__scaffold-smoke__.test.ts` 같은 위치에 `expect(1 + 1).toBe(2)` 수준의 스모크 테스트 **1개**만 넣어 `npm run test`가 통과 상태로 남도록 한다. (Stop 훅이 `npm run test`를 호출하므로 테스트가 0개면 vitest가 실패 종료할 수 있다.)

> **참고**: `src/lib/` 경로에 파일을 만드는 순간 TDD 가드가 발동한다. 스모크 테스트는 그 자체가 테스트 파일이므로 문제가 없지만, 이후 다른 lib 파일을 추가하려면 반드시 테스트 먼저 작성해야 한다.

## Acceptance Criteria

```bash
npm install
npm run lint      # ESLint 통과 (경고 무시 가능, 에러 없음)
npm run test      # 스모크 테스트 1개 통과
npm run build     # 프로덕션 빌드 성공. 보안 헤더 3종이 output에 포함되는지 확인
```

빌드 후 `.next/` 산출물이 `.gitignore`에 의해 무시되는지도 확인 (`git status`에 `.next/`가 나오면 안 된다).

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `src/` 밑 디렉토리가 ARCHITECTURE.md 구조를 따르는가? (`app/`, `components/`, `lib/`, `services/`, `atoms/`, `types/` — 이 step에서는 `app/`·`components/`·`lib/`만 실제로 존재해도 무방)
   - `next.config`에 보안 헤더 3종이 실제로 들어갔는가?
   - `Providers`가 `"use client"` 지시자를 가지고 있는가?
   - `QueryClient`가 모듈 최상위가 아닌 컴포넌트 내부에서 생성되는가?
   - `NEXT_PUBLIC_` 접두사가 붙은 시크릿이 있는가? (없어야 함)
3. 결과에 따라 `phases/0-foundation/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Next15+TS strict+Tailwind+RQv5+Jotai+vitest 스캐폴딩, next.config에 보안 헤더 3종, Providers 클라이언트 컴포넌트, 스모크 테스트 통과"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 즉시 중단

## 금지사항

- `create-next-app`을 실행하지 마라. 이유: 데모 페이지·불필요한 public 파일·favicon 등이 딸려 들어와 청소 비용이 든다. 수동 구성이 더 깔끔하다.
- Pages Router를 만들지 마라. 이유: 이 프로젝트는 App Router + RSC 기반이다 (ARCHITECTURE.md).
- Tailwind 색·간격 토큰을 확정하지 마라. 이유: UI_GUIDE.md에 "Day 2에 확정"으로 명시되어 있다. 여기서 정하면 Day 2 task와 충돌한다.
- `QueryClient`를 모듈 최상위에서 `new QueryClient()`로 만들지 마라. 이유: 서버에서 사용자 간 캐시가 공유돼 다른 사용자의 폴링 결과가 섞인다.
- `NEXT_PUBLIC_` 접두사를 어떤 시크릿에도 붙이지 마라. 이유: 브라우저 번들에 평문 유출 (Upstash 토큰·AI 키가 통째로 노출된다).
- `.env.local`이나 실제 시크릿 값을 이 step에서 만들지 마라. 이유: Step 0에서 `.env.example`만 관리하기로 정했다.
- 기존 `.gitignore`, `.env.example`, `CLAUDE.md`, `AGENTS.md`, `docs/*`를 수정하지 마라. 이유: 이 step의 범위는 스캐폴딩이지 문서 갱신이 아니다.
- 기존 테스트를 깨뜨리지 마라.

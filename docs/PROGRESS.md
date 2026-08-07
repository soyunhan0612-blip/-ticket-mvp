# Progress Journal

Day별 진행 결과와 결정 근거. 서사 문서.
기계 요약은 `phases/*/index.json`에, 커밋 히스토리는 `git log`에.

---

## Day 0 — Foundation (완료 2026-08-06)

### 기능적 관점
- 좌석 도메인 모델 확정: 4구역(A~D) × 25행 × 20열 = **2000석**, 좌석 ID `A-1-1` 형식
- 좌석 선택 규칙: 1인 최대 **4석 hold**, 중복 · 유효성 · 초과 검증
- 시드 데이터: 공연 8개 · 회차 24개 · 좌석 2000개 결정적 생성
- 도메인 타입 7종 정의, `SeatSnapshot.mine: boolean`으로 userId 노출 차단

### 기술적 관점
- Next.js 15 (App Router) + React 19 + TS strict + Tailwind
- Tanstack Query v5 + Jotai, `Providers` 클라이언트 컴포넌트로 부팅
- vitest + jsdom, TDD로 순수 로직 3종 **47 tests 통과**
- 보안 헤더 3종(X-Frame-Options / X-Content-Type-Options / Referrer-Policy)
- `.env*` gitignore, `.env.example`에 5개 키 이름만 커밋 (AI · Upstash · BasicAuth placeholder)

### 아키텍처 관점
- 순수 로직을 `src/lib/`에 분리 → Day 2+ route handler에서 서버 재검증에 그대로 재사용
- 타입을 `src/types/`에 중앙화 → CRITICAL 룰(mine 필드 등)을 타입 수준에서 강제
- `services/` (Store 인터페이스), `atoms/`, `app/api/`, middleware는 Day 1+ 예정

### 결정 근거
- **스캐폴딩 첫날 좌석 도메인부터 잡은 이유**: 좌석 규칙(4석)이 UI뿐 아니라 서버 재검증 대상. 순수 함수로 미리 확보해야 Day 2 route handler가 그대로 재사용
- ADR-005 참조: userId를 요청 바디·쿼리에서 절대 받지 않는 원칙이 타입에도 반영됨 (`SeatSnapshotEntry`에 userId 필드 없음, 오직 `mine: boolean`)
- vitest 설정을 `import.meta.dirname`으로 통일해 미래 Vite 버전 경고 사전 해소

### 참조
- PR [#1](../../pull/1) — `feat(0-foundation): Day 0 스캐폴딩 + 순수 로직 3종`
- 브랜치 리뷰 결과: CRITICAL 위반 없음, 빌드/린트/테스트 모두 통과

---

## Day 1 — Day 0에 흡수

> PRD의 Day 1 항목(types · lib · 보안 헤더 · tdd-guard 조정)은 phase 0-foundation에서 Day 0과 함께 처리되어 위 Day 0 섹션에 포함됨. 별도 서사 없음.

## Day 2 — 목록/상세 (RSC) + 조기 배포 (완료 2026-08-07)

### 기능적 관점
- `/shows` 카드 그리드 · `/shows/[id]` 상세 페이지 (회차 목록 KST 포맷, 없는 id는 `notFound`)
- `/api/shows` GET · `/api/shows/[id]` GET REST endpoint 2종
- Vercel 프로덕션 배포 완료

### 기술적 관점
- 두 페이지 모두 RSC (`"use client"` 없음), `params`는 Next.js 15 규약대로 `await`
- `services/show-store.ts` 인터페이스 + memory 구현체 + 팩토리 (Day 9 Redis 교체 대비)
- Route handler에서 store를 통해 조회 — 인터페이스 계약이 있어 memory ↔ redis 교체 시 route는 손대지 않음
- Tanstack Query · Jotai는 이번 phase에서 미사용 — 데이터가 정적이고 클라이언트 상태가 아직 없음. 좌석 phase에서 도입
- `docs/UI_GUIDE.md`에 색·간격·컴포넌트 클래스 토큰 확정 (Tailwind 기본 팔레트 유지, 임의값 금지)

### 아키텍처 관점
- Store 인터페이스 팩토리 패턴(`services/show-store.ts`) — Day 9 Redis 전환의 진입점. Route handler는 인터페이스만 참조
- UI 토큰을 UI_GUIDE에 중앙화하여 Day 3의 seat 컴포넌트가 카드·버튼 클래스를 그대로 재사용 가능
- 서버 hold·서버 재검증은 이 phase 밖 — 이 phase는 읽기 전용, 소유권 개념 없음

### 결정 근거
- **왜 서버 hold 없이 shows부터**: PRD 원칙대로 배포 리스크를 조기에 해소. RSC + 정적 데이터 페이지를 먼저 올려 Day 3부터는 좌석 시그니처에만 집중 가능
- **왜 UI 토큰을 이 단계에서 확정**: Day 3의 seat 컴포넌트(카드·버튼 스타일)가 새 값을 만들지 않고 재사용하도록 하기 위해. 뒤로 미루면 seat 구현 도중 토큰이 흔들림
- **왜 memory 구현체부터 인터페이스로 감쌌나**: Day 9의 Redis 교체가 인터페이스 계약만 지키면 되도록. Store 계약이 없으면 route handler에 Redis 지식이 새어들어 교체 비용이 폭발

### 참조
- phase 1-shows-rsc 커밋: `feat(1-shows-rsc): step 0~5` (6개 step)
- Vercel 프로덕션: https://ticket-mvp-eight.vercel.app

## Day 3 — 좌석 최적화 before (예정)

> 이 자리에 순진한 구현의 리렌더 수치 스크린샷 · React Profiler 캡처.
> CLAUDE.md 규칙에 따라 별도 커밋으로 남긴다.

## Day 4 — 좌석 최적화 after (예정)

> 이 자리에 `atomFamily` 적용 후 리렌더 수치 · before/after 대비.
> "클릭당 리렌더 2000 → 1~2"로 한정해 기록, 초기 마운트 비용은 별도로 병기 (과장 금지).

## Day 5~9 — (예정)

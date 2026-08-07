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

## Day 3 — 좌석 최적화 before (구현 완료, 측정 대기)

### 기능적 관점
- `/sessions/[id]/seats` RSC 셸 + 클라이언트 `<SeatMap>` 하이드레이션
- 2000석(4구역 × 25행 × 20열) SVG 렌더, 클릭 토글 선택, **최대 4석 상한** 서버 재검증과 동일 규칙 재사용(`lib/seat-rules.ts`)
- `SelectionBar`에서 선택 좌석 배열 표시 + `선택 완료` alert (Day 5에 `POST /api/holds`로 대체될 자리)

### 기술적 관점
- SeatMap은 `useState<string[]>` 하나로 선택 전체 관리, 2000 Seat에 `selected`·`onClick` **prop drilling**
- `selected.includes(seat.id)`로 좌석별 상태 판정 — 좌석 1회 클릭마다 부모 리렌더 → 2000 자식 리렌더 (의도된 안티패턴)
- **최적화 없음**: `memo` / `useMemo` / `useCallback` / `atomFamily` 전부 미사용 — Day 4에서 도입할 대조군
- `export const dynamic = 'force-dynamic'` 삽입 (CLAUDE.md CRITICAL, 이번엔 스냅샷 없어도 미래 대비)

### 아키텍처 관점
- 순수 로직은 이미 `src/lib/`에 있어 재사용만 함 (`seat-rules.canSelect`, `validateSelection`, `MAX_SEATS_PER_HOLD`)
- 좌석 컴포넌트는 `src/components/seat/`에 3종(Seat/SeatMap/SelectionBar) — Day 4 리팩토링·Day 5~6 서버 상태 통합의 진입점
- 서버 hold·폴링·낙관적 업데이트는 이 phase 범위 밖 (Day 5~6)

### 결정 근거
- **왜 일부러 순진하게 만들었나**: Day 4에 `atomFamily` + `memo`로 리팩토링해 "클릭당 리렌더 2000 → 1~2"의 before/after 서사를 만들기 위한 대조군. CLAUDE.md가 이 커밋의 존재를 명시적으로 요구
- **왜 4색을 monochrome 밝기 대비로만 정했나**: UI_GUIDE AI 슬롭 안티패턴(보라·글로우·그라데이션) 회피. 도구처럼 읽히는 좌석맵이 시그니처가 되도록
- **왜 SelectionBar의 확정 버튼을 alert로 stub했나**: 서버 hold API가 아직 없음. Day 5에 이 자리를 `POST /api/holds` 낙관적 업데이트로 교체 — 이번 phase에 넣으면 서사가 두 곳으로 흩어짐

### before 측정 (React DevTools Profiler)
> 아래는 브라우저에서 수동 측정 후 사람이 채운다. 자동화 X.

- 초기 마운트 시간: **_ ms
- 좌석 1회 클릭 시 리렌더 컴포넌트 수: **_
- 측정 절차: `npm run dev` → `/sessions/session-01/seats` → React DevTools Profiler `Record` → 좌석 하나 클릭 → `Stop` → "Ranked" 뷰의 렌더 개수를 캡처
- 스크린샷: `docs/assets/day3-before-profiler.png` (미첨부 상태로 커밋되었으면 이후 별도 커밋)

### 참조
- 이 phase 커밋(2단계): `feat(2-seat-v0): …` / `chore(2-seat-v0): …`
- 다음: Day 4에서 `atoms/seat.ts` (atomFamily) + `React.memo(Seat)` → after 측정 캡처

## Day 4 — 좌석 최적화 after (예정)

> 이 자리에 `atomFamily` 적용 후 리렌더 수치 · before/after 대비.
> "클릭당 리렌더 2000 → 1~2"로 한정해 기록, 초기 마운트 비용은 별도로 병기 (과장 금지).

## Day 5~9 — (예정)

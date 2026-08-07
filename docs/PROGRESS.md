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

## Day 1 — Foundation에 흡수 (해당 없음)

> PRD Day 1(기반 + 사고 방지)의 산출물(스캐폴딩·mock-data·seat-map/seat-rules·47 tests·보안 헤더 3종·`.env` gitignore)은 사전 준비 단계인 Day 0 — Foundation에서 이미 완료되어 별도 항목으로 남기지 않는다. 세부는 위 Day 0 섹션 참조.

---

## Day 2 — 목록/상세 RSC + 조기 배포 (완료 2026-08-07)

### 기능적 관점
- 공연 목록 `/shows`, 상세 `/shows/[id]` RSC로 구현 (SEO·초기 렌더 성능)
- `GET /api/shows`, `GET /api/shows/[id]` route handler (얇은 위임층)
- 상세 페이지의 회차 카드에서 `/sessions/[id]/seats`로 딥링크 준비 (Day 3 좌석 페이지 진입점 사전 확보)
- `docs/UI_GUIDE.md` 색·간격·타이포 토큰을 확정 → 후속 좌석·셀러·admin 화면이 이 값만 참조
- Vercel에 빈 껍데기 상태로 조기 배포 → 배포 리스크를 마지막 날로 미루지 않음

### 기술적 관점
- Next.js 15 App Router · React 19 · TS strict 그대로 유지, `params`는 Promise로 처리 (Next.js 15 규약)
- `ShowStore` 인터페이스(`src/services/show-store.ts`) + 인메모리 구현체(`show-store-memory.ts`, 테스트 선행) + 팩토리(`src/services/index.ts`) 3층 분리
- Route handler와 RSC page 모두 `getShowStore()`만 부르고 구현체를 몰라 Day 9 Redis 교체 시 팩토리 한 줄만 갈아끼움
- 상세 페이지의 회차 시각은 `Intl.DateTimeFormat` (Asia/Seoul, 오전/오후 로컬라이즈)으로 서버 렌더 — 하이드레이션 미스매치 회피
- PRD가 언급한 개발 전용 지연·5% 실패율 플래그는 **이번 phase에서 도입하지 않음** — 실제로 로딩/에러 UI가 필요해질 좌석 화면(Day 5~6) 시점에 함께 판단

### 아키텍처 관점
- API 로직은 `app/api/**/route.ts`에서만 처리(CLAUDE.md CRITICAL) — RSC page는 route handler를 호출하지 않고 Store를 직접 참조. 서버 컴포넌트가 자기 프로세스의 route handler를 HTTP로 다시 부르는 낭비를 피함
- UI 토큰을 화면 코드가 아니라 문서에 확정한 이유: Day 3+ 좌석 화면이 시각 규칙을 재정의하지 않도록 단일 진실 소스 확보
- 상세→좌석 링크(`/sessions/[id]/seats`)를 미리 하드코딩한 이유: Day 3 좌석 페이지를 만들면 목록→상세→좌석 흐름이 즉시 이어짐. 라우트 계약이 phase 간 접합면 역할

### 결정 근거
- **왜 조기 배포했나**: 배포 파이프라인 문제(환경변수·빌드·라우팅)를 Day 10 버퍼까지 미루면 회복 불가. 빈 껍데기라도 URL이 있어야 이후 매일 verify 가능. PRD Day 2가 이 배포를 명시적으로 요구
- **왜 목록/상세를 RSC로 뽑았나**: SEO 확보와 초기 페인트 성능. 좌석 화면은 인터랙션이 무거워 클라이언트로 갈 예정이라 대비되는 두 축을 프로젝트 안에 함께 보이게 함
- **왜 `ShowStore`를 인터페이스로 분리했나**: Day 9 Redis 교체 시 route handler·page 코드 변경 최소화. 팩토리 교체만으로 스토리지 스왑
- **왜 개발 지연/실패율 플래그를 뒤로 미뤘나**: 이번 phase는 로딩/에러 UI가 있어야 할 만큼 인터랙션이 없음. 좌석 폴링(Day 6)이 실질적 소비자라 그때 함께 도입해야 유지 부담이 적음

### 참조
- PR [#12](../../pull/12) — `feat(1-shows-rsc)` 6개 step 병합 (show-store / shows-api / ui-tokens / shows-page / show-detail-page / deploy-vercel)
- PR [#11](../../pull/11) — 사전 단계 명세 (`chore(phases): 1-shows-rsc 단계 명세 작성`)

---

## Day 3 — 좌석 최적화 before (예정)

> 이 자리에 순진한 구현의 리렌더 수치 스크린샷 · React Profiler 캡처.
> CLAUDE.md 규칙에 따라 별도 커밋으로 남긴다.

## Day 4 — 좌석 최적화 after (예정)

> 이 자리에 `atomFamily` 적용 후 리렌더 수치 · before/after 대비.
> "클릭당 리렌더 2000 → 1~2"로 한정해 기록, 초기 마운트 비용은 별도로 병기 (과장 금지).

## Day 5~9 — (예정)

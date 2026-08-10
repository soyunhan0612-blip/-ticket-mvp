# 티켓 예매 MVP

채용 지원용으로 만든 티켓링크형 예매 서비스 MVP입니다. 공연 탐색부터 회차·좌석 선택, 예매 확정과 취소, 셀러 공연 등록과 AI 설명 생성, Admin 점유 현황까지 핵심 여정을 구현했습니다.

시각적·기술적 중심은 2,000석 SVG 좌석 선택 화면입니다. 단순한 로컬 좌석 셀렉터가 아니라 서버가 좌석 hold와 소유권을 관리하므로, “동시에 두 명이 같은 좌석을 고르면?”이라는 상황에서 한 요청만 성공하고 다른 요청은 선택 좌석 전체가 롤백됩니다.

## 데모

데모 GIF는 아직 첨부하지 않았습니다. 추가 예정 경로는 `docs/assets/two-tab-seat-conflict.gif`입니다.

> 같은 회차를 연 탭 2개에서 한쪽이 좌석을 hold하면, 반대편 좌석이 다음 3초 폴링 주기에 `held-other` 상태로 회색 전환되는 장면을 담을 예정입니다.

프로덕션: https://ticket-mvp-eight.vercel.app

## 기술 스택과 아키텍처

- **Next.js 15 App Router · React 19** — 공연 목록과 상세는 RSC로 렌더링하고, 좌석 페이지는 RSC 셸에서 초기 스냅샷을 prefetch한 뒤 클라이언트 좌석맵을 하이드레이트합니다.
- **TypeScript strict · Tailwind CSS** — 도메인 계약을 타입으로 고정하고, 정해진 UI 토큰 안에서 화면을 구성합니다.
- **TanStack Query** — 좌석 스냅샷을 3초마다 폴링하고 hold 요청을 낙관적으로 반영한 뒤, 충돌 시 선택 묶음 전체를 롤백합니다.
- **Jotai** — `atomFamily(seatId)`로 2,000개 좌석의 구독을 분리하고 실제 변경된 좌석만 갱신합니다.
- **Vitest** — 순수 로직, Store 구현, API route를 테스트 우선으로 검증합니다.
- **Upstash Redis** — 공연·회차·좌석·예약을 영속화합니다. 좌석 상태는 회차별 sparse Hash에 저장하고 다중 좌석 전환은 Lua로 처리합니다.

TanStack Query와 Jotai는 목록에 스택을 더하기 위해 선택한 것이 아닙니다. 서버 hold를 도입하면서 폴링·낙관적 업데이트·롤백과 좌석 단위 구독 격리가 실제 요구사항이 되었고, 두 도구의 역할도 그 경계에 맞춰 나눴습니다. 상세한 결정과 트레이드오프는 [ADR](docs/ADR.md)에 기록했습니다.

## 진행 상황

| Day | 상태 | 주요 산출물 |
|---|---|---|
| 0 Foundation | 완료 | Next.js 15·TS strict·Tailwind·TanStack Query·Jotai·Vitest 기반, 도메인 타입, 좌석 순수 로직, 공연 8개·회차 24개 시드 |
| 1 기반 + 사고 방지 | 완료 (Day 0에 흡수) | `.env*` 차단, 보안 헤더 3종, TDD/Stop 훅 범위 정리 |
| 2 목록·상세 | 완료 | `/shows`, `/shows/[id]` RSC, 조회 API, UI 토큰, Vercel 조기 배포 |
| 3 좌석맵 before | 구현 완료·측정 대기 | 2,000석 SVG와 의도적인 전역 배열/prop drilling 대조군, `force-dynamic` 좌석 route |
| 4 좌석 최적화 | 구현 완료·측정 대기 | Jotai `atomFamily` + `React.memo`로 좌석별 구독 격리; Profiler 실측은 미완료 |
| 5 서버 hold | 완료 | 익명 UUID 쿠키, 5분 hold, 최대 4석·좌석 ID·소유권 서버 검증, 다중 좌석 전체 성공/실패 |
| 6 폴링·롤백 | 완료 | 3초 스냅샷 폴링, 낙관적 hold, 409 전체 롤백, 충돌 토스트, 서버 시각 기반 타이머 |
| 7 예매 | 완료 | 예매 확정·내역·취소, 사용자별 조회와 소유권 검증, 실패 시 보상 롤백 |
| 8 셀러·AI | 완료 | 3종 좌석 프리셋 공연 등록, Haiku 4.5 설명 스트리밍과 키 없는 fallback, Basic Auth |
| 9 Admin·Redis | 로컬 완료·재배포 대기 | 재사용 좌석맵 기반 Admin, SVG `viewBox` 줌/팬, Redis Store·Lua·팩토리 교체와 로컬 영속성/동시성 검증; Vercel 인증이 필요해 Redis 재배포는 blocked |

세부 진행 기록과 아직 남은 수동 검증은 [Progress Journal](docs/PROGRESS.md)과 [`phases/`](phases/)에 있습니다.

## 성능 before / after

React DevTools Profiler로 같은 시나리오를 사람이 측정한 뒤 수치를 채웁니다. 추정값은 기록하지 않습니다.

| 측정 | Day 3 (before) | Day 4 (after) |
|---|---|---|
| 좌석 1회 클릭 시 리렌더 컴포넌트 수 | TBD | TBD |
| 초기 마운트 시간 | TBD | TBD |

`atomFamily` + `React.memo`가 개선하는 것은 **업데이트 시 리렌더 수**이지 **초기 마운트 비용**이 아닙니다. 2,000개 SVG 노드 생성 비용은 구조적으로 남습니다. 이 조건은 [ADR-002](docs/ADR.md#adr-002-atomfamily로-좌석-구독-격리--beforeafter-측정)에 명시했으며, 초기 마운트까지 개선된 것처럼 과장하지 않습니다.

## 알고도 제외한 것

- **좌석 키보드 내비게이션 / 스크린리더** — 2,000석 SVG에 공간 이동 규칙과 정확한 라벨링을 적용하려면 별도 접근성 설계가 필요합니다. 불완전한 지원을 추가하는 대신 MVP에서 명시적으로 제외했습니다.
- **E2E (Playwright)** — 10일 범위에서는 순수 로직·Store·API route 테스트와 배포본 수동 시나리오에 우선순위를 뒀습니다.
- **모바일 터치 제스처 정밀 튜닝** — 줌/팬은 데스크톱의 wheel·pointer와 SVG `viewBox` 기준으로 구현했습니다. 모바일 pinch·관성·경계 처리는 별도 튜닝이 필요합니다.
- **실사용자 인증·결제** — 좌석 경합과 예매 상태 전환 검증에 집중하기 위해 관람객은 HTTP-only 익명 UUID 쿠키, `/admin`·`/seller`는 Basic Auth를 사용합니다.
- **CSRF 토큰** — MVP에서는 `sameSite: 'lax'` 쿠키로 대체했습니다. 실서비스라면 별도 CSRF 토큰이 필요합니다.
- **좌석 배치 에디터** — 드래그 기반 에디터는 일정 대부분을 소비하므로 500·1,000·2,000석 프리셋 3개로 제한했습니다.

같은 기준으로 Admin 차트 라이브러리는 넣지 않고 기존 좌석맵과 숫자 카드 4개를 재사용했습니다. SSE/WebSocket도 Vercel 함수 수명과 연결 유지 범위를 키우는 대신 3초 폴링을 선택했습니다. 완전한 실시간성이 필요한 서비스라면 WebSocket 계열을 다시 검토해야 합니다.

## 로컬 실행

### 요구사항

- Node.js 22 이상 (jsdom/undici 의존성이 `webidl.util.markAsUncloneable` 요구)
- npm 10 이상

### 설치 & 실행

```bash
npm install
cp .env.example .env.local   # 로컬 값 채우기
npm run dev                  # http://localhost:3000
```

`.env.local`은 커밋되지 않습니다 (`.gitignore` 참조). 필요한 변수와 설명은 `.env.example`에서 확인할 수 있습니다.

### 스크립트

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (배포 직전 수동) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest 전체 테스트 |
| `npm run test:watch` | Vitest 워치 모드 |

## 심사자용 계정

`/admin`, `/seller/new`는 환경변수 기반 Basic Auth 뒤에 있습니다. 공개 README에는 실제 자격증명을 기록하지 않습니다.

- 사용자명: `<BASIC_AUTH_USER 값>`
- 비밀번호: `<BASIC_AUTH_PASS 값>`

`.env.example`을 복사만 하고 두 값을 채우지 않으면 `/admin`·`/seller`는 401로 닫힙니다. 빈 값은 인증 통과가 아니라 거부로 처리됩니다.

## 데이터 영속성

Day 9에 인메모리 저장소를 **Upstash Redis**로 교체했습니다. 좌석·공연·회차·예약이 모두 Redis에 저장되므로 **재배포하거나 서버가 재시작돼도 예매 내역과 셀러가 등록한 공연이 그대로 남습니다.** 인메모리였다면 배포마다 전부 사라집니다.

- `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN`이 **둘 다** 설정되면 Redis로, 아니면 인메모리로 동작합니다 (`src/services/index.ts`의 팩토리 한 지점에서 분기).
- 두 토큰은 서버에서만 읽습니다. `NEXT_PUBLIC_` 접두사를 붙이지 않으므로 브라우저 번들에 포함되지 않습니다.
- 좌석 상태 전환(hold/확정/취소)은 Lua 스크립트로 원자 처리해 여러 좌석이 부분만 잡히는 경우가 없습니다.

## 배포

- 프로덕션: https://ticket-mvp-eight.vercel.app
- Redis 환경변수를 적용한 Vercel 재배포는 CLI 인증이 필요해 현재 대기 중입니다. Redis 구현과 재시작 영속성 검증은 로컬 Upstash 연결에서 완료했습니다.

## 문서

- [PRD](docs/PRD.md) — 요구사항·범위·검증 시나리오
- [Architecture](docs/ARCHITECTURE.md) — 렌더링 경계·데이터 흐름·Store 인터페이스
- [ADR](docs/ADR.md) — 기술 선택과 트레이드오프
- [Progress Journal](docs/PROGRESS.md) — Day별 실제 산출물과 남은 검증
- [UX Principles](docs/UX_PRINCIPLES.md) / [UI Guide](docs/UI_GUIDE.md) — UX 원칙과 UI 규칙
- [CLAUDE.md](CLAUDE.md) — 개발 규칙과 CRITICAL 경계

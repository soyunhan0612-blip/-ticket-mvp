# 티켓 예매 MVP

포트폴리오용 티켓링크형 예매 서비스. 10일 MVP.
좌석 선택 화면이 시각적·기술적 시그니처.

## 요구사항

- Node.js 22 이상 (jsdom/undici 의존성이 `webidl.util.markAsUncloneable` 요구)
- npm 10 이상

## 설치 & 실행

```bash
npm install
cp .env.example .env.local   # 로컬 값 채우기
npm run dev                  # http://localhost:3000
```

`.env.local`은 커밋되지 않는다 (`.gitignore` 참조). 값은 `.env.example` 항목 설명 확인.

## 진행 상황

| Day | 상태 | 주요 산출물 |
|---|---|---|
| 0 Foundation | ✅ | 스캐폴딩, 순수 로직 3종(seat-map/rules/mock-data), 47 tests |
| 1~9 | ⏳ | [docs/PROGRESS.md](docs/PROGRESS.md) 참조 |

## 스크립트

| 명령 | 용도 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (배포 직전 수동) |
| `npm run lint` | ESLint |
| `npm run test` | vitest (Stop 훅에서 자동) |
| `npm run test:watch` | 워치 모드 |

## 심사자용 계정

`/admin`, `/seller/new`는 Basic Auth 뒤에 있음 (Day 8 이후 활성화).
- 사용자명: `TBA`
- 비밀번호: `TBA`

## 문서

- `docs/PRD.md` — 요구사항
- `docs/ARCHITECTURE.md` — 아키텍처·데이터 흐름
- `docs/ADR.md` — 기술 선택 근거
- `docs/UX_PRINCIPLES.md` / `docs/UI_GUIDE.md` — UX·UI 가이드
- `CLAUDE.md` — 개발 규칙·CRITICAL 룰

## 데이터 영속성

Day 9에 인메모리 저장소를 **Upstash Redis**로 교체했다. 좌석·공연·회차·예약이 모두 Redis에 저장되므로 **재배포하거나 서버가 재시작돼도 예매 내역과 셀러가 등록한 공연이 그대로 남는다.** 인메모리였다면 배포마다 전부 사라진다.

- `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN`이 **둘 다** 설정되면 Redis로, 아니면 인메모리로 동작한다 (`src/services/index.ts`의 팩토리 한 지점에서 분기)
- 두 토큰은 서버에서만 읽는다. `NEXT_PUBLIC_` 접두사를 붙이지 않으므로 브라우저 번들에 포함되지 않는다
- 좌석 상태 전환(hold/확정/취소)은 Lua 스크립트로 원자 처리해 여러 좌석이 부분만 잡히는 경우가 없다

## 배포

- 프로덕션: https://ticket-mvp-eight.vercel.app

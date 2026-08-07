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

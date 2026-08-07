# Step 0: ui-guide-seat-colors

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 시각 규칙과 안티패턴을 파악하라:

- `/CLAUDE.md`
- `/docs/UI_GUIDE.md`
- `/docs/UX_PRINCIPLES.md`
- `/docs/PRD.md` (Day 3 항목: "SVG 2000석 렌더, 클릭 선택")

`UI_GUIDE.md`의 "좌석 시각 규칙" 섹션 표에는 현재 `available`, `held-mine`, `held-other`, `sold` 4개 상태의 색 지정이 "Day 3에 확정"으로 비어 있다. 이번 step에서 확정한다.

## 작업

`docs/UI_GUIDE.md`의 "좌석 상태 (4색만)" 표를 아래 값으로 채운다. 다크 배경(`bg-neutral-950` = `#0a0a0a`) 기준 밝기 4단계 대비:

| 상태 | 의미 | 색 지정 |
|---|---|---|
| `available` | 빈 좌석 | `fill-neutral-500` (`#737373`) |
| `held-mine` | 내가 잡은 좌석 (타이머 표시) | `fill-white` (`#ffffff`) |
| `held-other` | 남이 잡은 좌석 | `fill-neutral-700` (`#404040`) |
| `sold` | 판매 완료 | `fill-neutral-800` (`#262626`) |

표 아래 기존의 두 bullet(다른 상태 추가 금지 / mine 필드 규칙)은 그대로 유지한다.

표 바로 다음에 아래 문단을 추가한다:

> 4단계 모두 monochrome 밝기 대비로만 구분한다. AI 슬롭 안티패턴(보라·글로우) 회피 및 좌석맵이 도구처럼 읽히도록 하기 위한 결정. Day 5~6에서 실제 서버 상태가 붙었을 때 대비가 부족하면 이 표에서 값을 조정한다 — 새 색을 추가하지 않는다.

## Acceptance Criteria

```bash
npm run lint
npm run test
```

문서만 수정하므로 위 두 커맨드가 기존과 동일하게 통과해야 한다.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `docs/UI_GUIDE.md`의 표에 4개 값이 모두 채워졌는지 시각 확인.
3. 표 앞의 소개 문장("좌석 상태 (4색만)")과 뒤의 두 bullet이 원형 그대로인지 확인.
4. 결과에 따라 `phases/2-seat-v0/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "UI_GUIDE 좌석 4색 확정 (neutral-500/white/neutral-700/neutral-800)"`
   - 실패 → `"status": "error"`, `"error_message": "..."`

## 금지사항

- 표에 없는 새 상태(예: `hovered`, `disabled`)를 추가하지 마라. 이유: PRD의 "다른 상태 추가 금지"와 CLAUDE.md의 상태 최소화 원칙 위반.
- 색을 hex 대신 Tailwind 임의값(`fill-[#737373]`)으로 쓰지 마라. 이유: UI_GUIDE 전체가 Tailwind 토큰 기준이라 후속 컴포넌트가 검색·치환하기 어려워짐.
- 보라·인디고 계열, gradient, blur, glow 계열 값을 제안하지 마라. 이유: UI_GUIDE "AI 슬롭 안티패턴" 표에 명시적으로 금지됨.
- 다른 문서(`UX_PRINCIPLES.md`, `ARCHITECTURE.md`, `ADR.md`, `PROGRESS.md`)는 이 step에서 수정하지 마라.
- 기존 테스트를 깨뜨리지 마라.

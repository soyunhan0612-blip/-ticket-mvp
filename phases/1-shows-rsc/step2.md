# Step 2: ui-tokens

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 디자인 원칙을 파악하라:

- `/docs/UI_GUIDE.md` — 실제 값 확정 대상. 지금은 `{예: ...}` placeholder로 채워져 있음
- `/docs/UX_PRINCIPLES.md` — UI_GUIDE 상단이 참조하는 원칙 문서
- `/CLAUDE.md`
- `/tailwind.config.ts` — 지금은 빈 extend
- `/src/app/globals.css` — Tailwind base/components/utilities만 있음

## 작업

`UI_GUIDE.md`의 placeholder를 실제 값으로 확정하고, `tailwind.config.ts`에 필요한 것만 반영한다. **AI 슬롭 안티패턴은 절대 도입하지 마라** (UI_GUIDE.md 상단 표 참조).

### 방향

- **다크 기본** (라이트 모드 지원 X 이번 스코프)
- **neutral 그레이스케일 + 흰색 primary** 조합. 보라/인디고 브랜드 컬러 금지
- 좌석 4색은 Day 3에 확정하므로 **이번 step에서 확정하지 마라** (UI_GUIDE.md에도 "Day 3에 확정" 표기 유지)
- Tailwind 유틸리티 클래스를 우선 사용. 커스텀 CSS는 최소화

### 파일 1 — `docs/UI_GUIDE.md`

placeholder(`{예: ...}`)를 실제 값으로 대체한다. 대체 대상:
- 배경 색상 (페이지 · 카드)
- 텍스트 색상 (주 · 본문 · 보조 · 비활성)
- 데이터/시맨틱 색상 (긍정 · 부정 · 중립) — 좌석 4색은 제외
- 컴포넌트 스니펫 (카드 · 버튼 primary/text · 입력 필드)
- 레이아웃 (전체 너비 · 정렬 · 간격)
- 타이포그래피 (페이지 제목 · 카드 제목 · 본문)
- 애니메이션 목록
- 아이콘 스타일

**좌석 시각 규칙 섹션은 손대지 마라** — Day 3 결정 사항.

### 파일 2 — `tailwind.config.ts`

UI_GUIDE에서 확정한 값 중 **Tailwind가 표준으로 제공하지 않는 것만** `theme.extend`에 추가한다.
- Tailwind 기본 neutral 스케일이 대부분 커버되므로 대개 아주 얇게 유지
- 필요 시 특정 색상 하나·간격 하나 정도만 추가
- `darkMode: "class"`는 유지

### 검증용 최소 스타일

이 step 자체는 페이지를 만들지 않으므로 UI 스타일이 실제로 적용되는지 검증할 화면이 없다. 대신:
- `tailwind.config.ts`가 컴파일되는지 (`npm run build`)
- 기존 페이지(`/`)가 여전히 렌더되는지 (`npm run build` 시 static export 성공)

## Acceptance Criteria

```bash
npm run lint
npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 문서 체크리스트를 확인한다:
   - `UI_GUIDE.md`에 남은 `{예:` placeholder가 있는가? (좌석 4색 제외) 있으면 안 됨
   - AI 슬롭 안티패턴(gradient-text, backdrop-filter blur, box-shadow glow, 보라/인디고, 배경 gradient orb 등) 도입 여부 확인 — 있으면 안 됨
   - Tailwind 기본으로 커버되는 값을 `tailwind.config.ts`에 중복 정의하지 않았는가?
3. 결과에 따라 `phases/1-shows-rsc/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약 (예: UI_GUIDE 색·간격·컴포넌트 확정 + tailwind extend 반영)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"`

## 금지사항

- 좌석 4색을 확정하지 마라. 이유: Day 3 스코프
- AI 슬롭 안티패턴을 도입하지 마라 (UI_GUIDE.md 상단 표 전 항목). 이유: 프로젝트의 시각적 인상을 결정하는 핵심 규칙
- 애니메이션 라이브러리(framer-motion 등)를 추가하지 마라. 이유: 이번 스코프는 정적 페이지, 번들만 키움
- shadcn/ui 등 UI 컴포넌트 라이브러리를 추가하지 마라. 이유: Tailwind 유틸리티 + 자체 컴포넌트로 충분
- 라이트 모드 지원을 추가하지 마라. 이유: 이번 스코프 밖
- 기존 테스트를 깨뜨리지 마라

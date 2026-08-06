# UI 디자인 가이드

> 실제 색상·간격 값은 Day 2에 확정하고 이 문서에 채운다. 그 후로는 여기 없는 값을 새로 만들지 않고 이 문서만 참조한다.
> 원칙·화면별 적용·접근성 스코프는 `UX_PRINCIPLES.md` 참조.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

## 색상
### 배경
| 용도 | 값 |
|------|------|
| 페이지 | {예: #0a0a0a} |
| 카드 | {예: #141414} |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 | {예: text-white} |
| 본문 | {예: text-neutral-300} |
| 보조 | {예: text-neutral-400} |
| 비활성 | {예: text-neutral-500} |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| {긍정/성공} | {예: #22c55e} |
| {부정/에러} | {예: #ef4444} |
| {중립/기본} | {예: #525252} |

## 컴포넌트
### 카드
```
{예: rounded-lg bg-[#141414] border border-neutral-800 p-6}
```

### 버튼
```
Primary: {예: rounded-lg bg-white text-black hover:bg-neutral-200}
Text:    {예: text-neutral-500 hover:text-neutral-300}
```

### 입력 필드
```
{예: rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3}
```

## 레이아웃
- 전체 너비: {예: max-w-5xl}
- 정렬: {예: 좌측 정렬 기본. 중앙 정렬 금지}
- 간격: {예: gap-3~4, 섹션 간 space-y-8}

## 타이포그래피
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | {예: text-4xl font-semibold text-white} |
| 카드 제목 | {예: text-sm font-medium text-neutral-400} |
| 본문 | {예: text-sm text-neutral-300 leading-relaxed} |

## 애니메이션
- {허용할 애니메이션만 나열. 예: fade-in (0.4s), slide-up (0.5s)}
- {그 외 모든 애니메이션 금지}

## 아이콘
- {예: SVG 인라인, strokeWidth 1.5}
- {예: 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다}

---

## 좌석 시각 규칙 (`components/seat/`)

좌석맵은 이 프로젝트의 시그니처다. 다른 UI 규칙보다 좌석 규칙이 우선한다.

### 좌석 상태 (4색만)
| 상태 | 의미 | 색 지정 |
|---|---|---|
| `available` | 빈 좌석 | Day 3에 확정 |
| `held-mine` | 내가 잡은 좌석 (타이머 표시) | Day 3에 확정 (강조색) |
| `held-other` | 남이 잡은 좌석 | Day 3에 확정 (회색 계열) |
| `sold` | 판매 완료 | Day 3에 확정 (짙은 회색) |

- 다른 상태 추가 금지. 상태를 늘리고 싶어지면 서버 스냅샷 스키마를 먼저 검토
- `mine`은 응답에서 불리언으로만 온다 — 남의 `userId`가 노출되지 않도록 서버가 환원한 결과

### 줌/팬
- **SVG `viewBox` 조작만** 사용. `div + CSS transform` 금지 (히트 영역 계산이 지옥)
- 초기 `viewBox`는 전관이 아니라 **무대 앞 중앙부**. "전체 보기" 버튼으로 전관 복귀
- 마우스 wheel → scale, pointermove → offset

### 설명 렌더 (`components/description/`)
- **plain text + `whitespace-pre-wrap`** 만 사용
- `dangerouslySetInnerHTML` **금지** — 셀러 등록은 누구나 하므로 저장형 XSS의 실제 경로
- AI에게도 마크다운 없이 문단만 쓰도록 프롬프트에서 지시

### Admin
- 좌석맵 컴포넌트를 그대로 재사용 + 숫자 카드 4개
- **차트 라이브러리 금지** — 번들만 키우고 좌석맵 재사용이 훨씬 강한 시각적 증거

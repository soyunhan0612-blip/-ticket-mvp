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
| 페이지 | `bg-neutral-950` (`#0a0a0a`) |
| 카드 | `bg-neutral-900` (`#171717`) |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 | `text-white` (`#ffffff`) |
| 본문 | `text-neutral-300` (`#d4d4d4`) |
| 보조 | `text-neutral-400` (`#a3a3a3`) |
| 비활성 | `text-neutral-500` (`#737373`) |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 긍정/성공 | `text-green-500` (`#22c55e`) |
| 부정/에러 | `text-red-500` (`#ef4444`) |
| 중립/기본 | `text-neutral-600` (`#525252`) |

## 컴포넌트
### 카드
```
rounded-lg border border-neutral-800 bg-neutral-900 p-6 transition-colors duration-150 hover:border-neutral-700
```

### 버튼
```
Primary: rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:bg-neutral-700 disabled:text-neutral-400
Text:    rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:text-neutral-600
```

### 입력 필드
```
rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:border-neutral-800 disabled:text-neutral-500
```

## 레이아웃
- 전체 너비: `mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8`
- 정렬: 좌측 정렬을 기본으로 하고, 중앙 정렬은 빈 상태와 로딩 표시에서만 사용
- 간격: 컴포넌트 내부와 그리드는 `gap-4`, 섹션 사이는 `space-y-8`

## 타이포그래피
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | `text-3xl font-semibold tracking-tight text-white sm:text-4xl` |
| 카드 제목 | `text-lg font-semibold text-white` |
| 본문 | `text-sm leading-6 text-neutral-300` |

## 애니메이션
- hover·focus의 색상 전환만 `transition-colors duration-150`으로 허용
- 좌석 폴링 상태 변경, 진입 효과, 이동·확대 효과를 포함한 그 외 애니메이션은 사용하지 않음

## 아이콘
- 인라인 SVG, 기본 `h-5 w-5`, `stroke="currentColor"`, `strokeWidth={1.5}` 사용
- 둥근 배경 아이콘 컨테이너로 감싸지 않으며, 버튼에서는 항상 텍스트 라벨과 함께 사용

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

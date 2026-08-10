# UI 디자인 가이드

> 값의 단일 소스는 `src/app/globals.css`의 `:root` 토큰이다. `tailwind.config.ts`는 그 변수를 참조만 한다.
> 여기 없는 값을 새로 만들지 않고 이 문서와 토큰만 참조한다.
> 원칙·화면별 적용·접근성 스코프는 `UX_PRINCIPLES.md` 참조.

## 출처

Vodafone Design System(브랜드 가이드라인 기반, 마케팅 사이트용)을 **시각 시스템으로만** 차용했다.

- Vodafone 로고·워드마크·서비스명은 쓰지 않는다. 서비스명은 "티켓 MVP"다.
- 서체는 Inter다. DS 자체가 독점 서체 "Vodafone"의 대체로 지정한 것이며, `next/font/google`로 self-host한다.
- DS의 `templates/`·`ui_kits/`·`support.js`는 프로토타이핑 도구라 가져오지 않았다.

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

DS와 충돌하지 않는다 — DS도 그라데이션·그림자·블러·패턴을 모두 금지한다.

## 밴드 / 표면 정책

DS는 그림자를 쓰지 않는다. **깊이는 표면 극성 반전(dark ↔ light)으로 만든다.** `components/ui/Band.tsx`가 이 단위다.

| 라우트 | 밴드 | 근거 |
|---|---|---|
| `/` | dark 히어로 → light 카드 | 유일한 마케팅 표면 |
| `/shows` | light (`width="wide"`) | 정보 밀도 낮음 |
| `/shows/[id]` | light (`width="tool"`) | |
| `/sessions/[id]/seats` | **dark** | 예매 도구 |
| `/reservations` | light | |
| `/seller/new` | light | |
| `/admin` | **dark** | 예매 도구 |
| NavBar · Footer | ink | nav(dark) → 콘텐츠 → footer(dark) 리듬 |

컨테이너 폭은 `wide`(max-w-7xl, DS의 1400px 근사)와 `tool`(max-w-5xl) 두 가지다. 밀도가 다른 화면에 같은 폭을 강요하지 않는다 (`UX_PRINCIPLES.md` 원칙 3).

## 색상

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-primary` | `#e60000` | 유일한 액센트. Primary CTA 채움 |
| `--color-primary-hover` | `#b30000` | |
| `--color-ink` | `#25282b` | dark 밴드 배경, light 밴드 본문 |
| `--color-ink-deep` | `#0a0a0a` | **좌석 SVG 캔버스 전용** (아래 편차 참조) |
| `--color-canvas` | `#ffffff` | light 밴드 배경 |
| `--color-canvas-soft` | `#f2f2f2` | 인용·프리뷰 박스 |
| `--color-body-aa` | `#6b6b6b` | **light 밴드 본문** (아래 편차 참조) |
| `--color-body` | `#7e7e7e` | 22px 이상 큰 텍스트 전용 |
| `--color-mute` | `#bebebe` | dark 밴드 보조 텍스트, disabled |
| `--color-on-dark` | `#ffffff` | dark 밴드 주 텍스트 |
| `--color-border-hairline` | `#25282b` | light 표면 1px 헤어라인 |
| `--color-border-on-dark` | `rgba(255,255,255,.25)` | dark 표면 1px 헤어라인 |

액센트는 하나뿐이다. 두 번째 색조를 추가하지 않는다.

### DS 대비 의도적 편차 2건

1. **`--color-body-aa` 추가.** DS `--color-body`(#7e7e7e)는 흰 배경 대비 **4.06:1**로 본문 AA(4.5:1)에 미달한다. `UX_PRINCIPLES.md` 접근성 스코프가 본문 4.5:1을 약속했으므로 18px 이하 본문에는 `#6b6b6b`(**5.33:1**)를 쓴다.
2. **`--color-ink-deep` 추가.** DS에 없는 토큰이다. 좌석 `sold`(#262626)를 ink(#25282b) 위에 올리면 배경과 구분되지 않는다. 좌석 캔버스만 2단계 더 어두운 표면을 쓰면 **좌석 4색 값을 하나도 바꾸지 않고** 대비를 유지할 수 있다.

### dark 밴드에서 red를 텍스트로 쓰지 않는다

`--color-primary`는 ink 위에서 **3.08:1**이라 AA 미달이다. dark 밴드의 에러·강조는 red 텍스트가 아니라 **red 채움 + 흰 글씨**(4.81:1)로 표현한다. `Toast`, Admin 에러 배너가 이 규칙을 따른다.

## 타이포그래피

서체는 Inter 하나다. serif·mono와 섞지 않는다.

| 토큰 | 크기/굵기 | 용도 |
|---|---|---|
| `text-display-xl` | 90/800 | 히어로 헤드라인 (`/`만) |
| `text-display-lg` | 48/300 | 히어로 서브헤드. 굵기 300이 "차분한 두 번째 목소리" |
| `text-display-sm` | 32/700 | 페이지 제목 |
| `text-display-xs` | 24/700 | 카드 제목 |
| `text-eyebrow` | 16/800 | 히어로 아이브로 |
| `text-body-sm` | 16/400 | 본문 |
| `text-caption-upper` | 12/600 + 대문자 | 폼 라벨, 섹션 아이브로 |

반응형은 Tailwind 브레이크포인트가 아니라 **토큰 자체를 미디어쿼리로 덮는다** (`globals.css`의 responsive 블록). DS가 반응형을 처리하는 방식이 그것이고, 컴포넌트는 같은 변수를 읽으므로 스케일링이 시스템 전체에 적용된다.

### 한글 줄바꿈

`body`에 `word-break: keep-all`을 건다. 한글 기본 줄바꿈은 글자 단위라 "반영됩니다"가 "반 / 영됩니다"로 쪼개진다. display 스케일에서 특히 눈에 띈다. 좌석 ID 같은 긴 무공백 토큰만 `overflow-wrap: break-word`로 예외 처리한다.

## 컴포넌트

재사용 프리미티브는 **카드·버튼·입력 세 종류**다 (`UX_PRINCIPLES.md` 일관성). `Band`는 레이아웃 래퍼라 별개다. 새 변형을 만들기 전에 기존을 재조합할 수 있는지 먼저 본다.

| 파일 | 비고 |
|---|---|
| `components/ui/Button.tsx` | `primary` / `outline-red` / `outline-dark` / `outline-on-dark` / `text` / `text-on-dark`. `<Link>`에는 `buttonClassName()` 재사용 |
| `components/ui/Card.tsx` | `tone="light" \| "dark"`. `<Link>`·`<button>`에는 `cardClassName()` 재사용 |
| `components/ui/TextInput.tsx` | `id`+`label` 필수. textarea·select에는 `FIELD_CLASS_NAMES` 재사용 |
| `components/ui/Band.tsx` | `tone` × `width` |

화면 전용 조합물은 `components/{home,seat,seller,admin}/`에 둔다. `components/ui/`는 위
프리미티브와 `Band`만 유지한다 — 조합물을 여기에 넣으면 "세 종류" 원칙이 흐려진다.

| 파일 | 비고 |
|---|---|
| `components/home/ShowcaseHero.tsx` | `/` 전용. 포스터 배경 캐러셀 + 미리보기 줄. 카피는 `children`으로 받아 서버에 남긴다 |

- **모든 컨트롤은 pill(60px)**, 카드·입력은 6px, 밴드는 0이다. 라디우스가 요소 종류를 구분한다.
- **그림자 없음.** 경계는 1px 헤어라인뿐이다.
- DS 원본에는 포커스 링이 없다. DS의 공백으로 보고 `focus-visible:ring`을 모든 프리미티브에 추가했다 — 포팅 중 가장 잃기 쉬운 부분이다.
- 배지를 만들지 않는다. 상태는 명도로, 분류는 텍스트로 표현한다.

## 애니메이션

- hover·focus의 색상 전환만 `transition-colors duration-150`
- 좌석 폴링 상태 변경, 진입 효과, 이동·확대 효과를 포함한 그 외 애니메이션은 사용하지 않음

### 예외: 랜딩 히어로 배경 캐러셀

`/`의 히어로 배경만 이 규칙의 예외다. 공연 포스터가 5초 간격으로 루프한다.

예외를 둔 이유는 `/`가 **유일한 마케팅 표면**이기 때문이다(`UX_PRINCIPLES.md` 원칙 1의
예외 조항과 같은 근거). 도구 화면에서 움직이는 것은 작업을 방해하지만, 아직 아무 결정도
하지 않은 사용자에게 "무엇을 파는 곳인지"를 보여주는 자리에서는 포스터가 정보다.

이 예외에 붙는 제약:

- **`/` 히어로에만 적용한다.** 다른 화면으로 확산시키지 않는다
- **`prefers-reduced-motion: reduce`이면 자동 전환을 멈춘다.** 사용자가 명시적으로 누른
  전환은 그때도 동작한다 — 규칙은 "모션 금지"가 아니라 "예고 없는 자동 모션 금지"다
- 마우스가 히어로 위에 있는 동안 전환을 멈춘다
- 이동은 배경 이미지의 가로 슬라이드뿐이다. **확대·페이드·시차(parallax)는 쓰지 않는다**
- 사용자 조작은 미리보기 버튼 클릭뿐이다. 배경 드래그는 비활성이다 — 히어로 위 CTA
  버튼의 클릭이 드래그로 오인되는 것을 막는다 (좌석맵에서 이미 겪은 회귀)
- 미리보기 버튼의 선택 상태는 border 색으로만 표시한다. scale·glow는 쓰지 않는다

구현은 `components/home/ShowcaseHero.tsx`이며 위 제약은 같은 파일의 테스트가 강제한다.

## 이미지 위 텍스트

사진 위에 텍스트를 올릴 때는 **`--color-ink` 단색 오버레이 72%**만 쓴다.

- 그라데이션 오버레이 금지 — DS가 그라데이션을 금지한다
- `backdrop-blur` 금지 — AI 슬롭 안티패턴 1번
- 새 색을 도입하지 않는다. 오버레이는 밴드의 원래 배경색과 같은 `ink`이며,
  사진을 28%만 비쳐 보이게 하는 장치다
- 72%는 계산값이다. 흰 텍스트는 `ink` 위에서 13.4:1이고, 순백 사진이 28% 비쳐도
  약 4.9:1로 본문 AA(4.5:1)를 넘긴다. **이 값을 임의로 내리지 마라**

주의: `--color-ink`는 hex 문자열이라 `bg-ink/72` 같은 투명도 수식어가 동작하지 않는다
(`tailwind.config.ts` 주석 참조). 별도 요소에 `opacity-[0.72]`를 건다.

## 포스터 이미지

| 용도 | 경로 | 비율 | 크기 |
|---|---|---|---|
| 시드 공연 썸네일 | `public/posters/{slug}.jpg` | 3:4 | 800×1067 |
| 시드 공연 히어로 배경 | `public/posters/hero/{slug}.jpg` | 16:9 | 1600×900 |
| 셀러 등록 프리셋 | `public/posters/{concert,musical,theater}.svg` | 3:4 | 400×600 |

- 전부 로컬 자산이다. 외부 URL을 `next/image`에 넘기지 않으므로 `remotePatterns`가 없다
  (`ARCHITECTURE.md` 보안 경계)
- 히어로 경로는 썸네일 경로에서 `lib/poster-image.ts`가 유도한다. 대응 파일이 없는
  공연(셀러 등록물)은 히어로 캐러셀에서 제외된다
- 사진은 Unsplash. 출처는 `public/posters/CREDITS.md`에 기록하고 UI에는 표기하지 않는다
- **보라·인디고 조명 사진을 고르지 않는다** (AI 슬롭 안티패턴). 무대 사진에서 매우 흔하므로
  실질적으로 가장 자주 걸리는 필터다
- 어둡고 대비가 낮은 사진을 우선한다. 히어로는 ink 오버레이 위에 흰 텍스트를 올린다
- 얼굴 클로즈업을 피한다. 3:4와 16:9 두 비율로 잘릴 때 얼굴이 잘리면 즉시 티가 난다
- 파일당 상한: 썸네일 150KB, 히어로 220KB. Unsplash URL의 `q` 파라미터로 맞춘다
- 카드에서는 `object-cover`를 쓴다. 셀러 프리셋 선택 UI만 `object-contain`이다 —
  거기서는 프리셋 전체를 보여줘야 하고 SVG가 이미 3:4라 레터박스가 생기지 않는다

## 아이콘

- DS는 아이콘 세트를 제공하지 않는다. 현재 화면에는 아이콘이 없다.
- 필요해지면 인라인 SVG, 기본 `h-5 w-5`, `stroke="currentColor"`, `strokeWidth={1.5}`
- 둥근 배경 아이콘 컨테이너로 감싸지 않으며, 버튼에서는 항상 텍스트 라벨과 함께 사용

---

## 좌석 시각 규칙 (`components/seat/`)

좌석맵은 이 프로젝트의 시그니처다. 다른 UI 규칙보다 좌석 규칙이 우선한다.

### 좌석 상태 (4색만)

| 상태 | 의미 | 토큰 | 값 |
|---|---|---|---|
| `available` | 빈 좌석 | `--seat-available` | `#737373` |
| `held-mine` | 내가 잡은 좌석 (타이머 표시) | `--seat-mine` | `#ffffff` |
| `held-other` | 남이 잡은 좌석 | `--seat-other` | `#404040` |
| `sold` | 판매 완료 | `--seat-sold` | `#262626` |

4단계 모두 monochrome 밝기 대비로만 구분한다. AI 슬롭 안티패턴(보라·글로우) 회피 및 좌석맵이 도구처럼 읽히도록 하기 위한 결정. **Vodafone DS 적용 후에도 이 4개 값은 바뀌지 않았다** — 캔버스를 `--color-ink-deep`으로 두어 원래 대비를 그대로 보존했다.

- 다른 상태 추가 금지. 상태를 늘리고 싶어지면 서버 스냅샷 스키마를 먼저 검토
- 좌석에는 브랜드 red를 쓰지 않는다. 액센트를 넣으면 4색 모노크롬 규칙이 깨진다
- `mine`은 응답에서 불리언으로만 온다 — 남의 `userId`가 노출되지 않도록 서버가 환원한 결과

### 줌/팬

- **SVG `viewBox` 조작만** 사용. `div + CSS transform` 금지 (히트 영역 계산이 지옥)
- 초기 `viewBox`는 전관이 아니라 **무대 앞 중앙부**. "전체 보기" 버튼으로 전관 복귀
- 마우스 wheel → scale, pointermove → offset

### 설명 렌더

- **plain text + `whitespace-pre-wrap`** 만 사용
- `dangerouslySetInnerHTML` **금지** — 셀러 등록은 누구나 하므로 저장형 XSS의 실제 경로
- AI에게도 마크다운 없이 문단만 쓰도록 프롬프트에서 지시

### Admin

- 좌석맵 컴포넌트를 그대로 재사용 + 숫자 카드 4개
- **차트 라이브러리 금지** — 번들만 키우고 좌석맵 재사용이 훨씬 강한 시각적 증거

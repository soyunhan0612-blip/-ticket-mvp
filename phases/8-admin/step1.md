# Step 1: zoom-pan-svg

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 특히 "좌석 성능 전략" 절의 줌/팬 규칙
- `/docs/UI_GUIDE.md` — 버튼 클래스, 애니메이션 제한
- `/docs/UX_PRINCIPLES.md` — 접근성 스코프
- `/src/lib/seat-layout.ts` — 이전 step에서 생성된 `LayoutBox`, `ViewBox`, `getInitialViewBox`, `getLayoutBox`
- `/src/lib/seat-layout.test.ts` — 이전 step의 테스트
- `/src/components/seat/Seat.tsx` — 좌석이 `onClick`과 `pointerEvents`를 쓰는 방식
- `/src/components/seat/SeatMap.tsx` — 현재 `<svg>` 사용 형태

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

좌석 2000석을 하나의 viewBox에 전부 넣으면 좌석 하나가 몇 px에 불과해 클릭이 사실상 불가능하다. `docs/ARCHITECTURE.md`가 명시한 해법은 **SVG `viewBox` 조작 기반의 줌/팬**이다. 이 컴포넌트는 이번 phase에서 처음 만들어진다.

## 작업

`src/components/seat/ZoomPanSvg.tsx`를 새로 만든다. `viewBox` 상태를 소유하고 children을 감싸는 SVG 래퍼다.

```typescript
"use client";

import type { JSX, ReactNode } from "react";
import type { LayoutBox } from "@/lib/seat-layout";

interface ZoomPanSvgProps {
  box: LayoutBox;
  children: ReactNode;
  className?: string;
}

export function ZoomPanSvg({ box, children, className }: ZoomPanSvgProps): JSX.Element;
```

### 동작 요구사항

**초기 상태** — `getInitialViewBox(box)` 결과를 초기 viewBox로 사용한다 (무대 앞 중앙부 확대 상태).

**줌** — `wheel` 이벤트로 viewBox의 width/height를 조절한다.
- 확대·축소 배율에 **상한과 하한을 반드시 둬라**. 하한 없이 축소하면 좌석이 sub-pixel이 되어 클릭이 불가능해지고, 상한 없이 확대하면 좌석 하나가 화면을 덮는다.
- 축소 하한은 전관(`box` 전체)이 들어오는 크기까지로 제한하라. 그보다 더 축소할 이유가 없다.
- 커서 위치를 기준으로 확대·축소되면 더 좋다(재량). 최소한 viewBox 중심 기준으로는 동작해야 한다.
- 페이지 스크롤이 함께 일어나지 않도록 처리하라.

**팬** — `pointerdown` → `pointermove` → `pointerup`으로 viewBox의 x/y를 이동시킨다.
- 화면상 이동 거리를 viewBox 좌표계로 환산해야 한다. 줌 배율에 따라 1px 드래그가 움직이는 viewBox 거리는 달라진다.
- 팬으로 좌석 영역을 완전히 벗어나 빈 공간만 보이는 상태가 되지 않도록 이동 범위를 제한하라.

**드래그와 클릭의 구분 (중요)** — 이것이 이 step의 핵심 함정이다.

`Seat.tsx`는 `<rect>`에 `onClick`을 직접 달고 있다. 아무 처리 없이 팬을 붙이면 **드래그를 끝낼 때마다 손을 뗀 지점의 좌석이 토글된다.** 좌석맵이 사용 불가능해진다.

- `pointerdown` 시점의 좌표를 기억하고, `pointerup`까지의 이동 거리가 임계값(약 4px) 이상이면 그 뒤에 이어지는 click 이벤트를 무효화하라.
- 구현 방법은 재량이되(예: capture 단계에서 click을 가로채 `stopPropagation`, 또는 드래그 중 좌석의 pointer-events를 끄기), **`Seat.tsx`를 수정하지 않고** 달성해야 한다.
- 반대 방향의 실패도 막아라: 제자리 클릭(이동 거리 0)은 반드시 좌석 토글로 이어져야 한다.

**전체 보기 버튼** — 클릭 시 viewBox를 `box` 전체로 되돌린다. `docs/UI_GUIDE.md`의 버튼 클래스를 사용하고, 텍스트 라벨을 반드시 넣어라(아이콘만 두지 마라 — UX_PRINCIPLES 접근성 규칙).

**성능** — viewBox state 변경이 children(좌석 2000개)의 리렌더를 유발하면 안 된다.
- `children`은 prop으로 받아 그대로 렌더하므로, ZoomPanSvg가 리렌더돼도 children element 참조가 동일하면 React는 좌석 서브트리를 리렌더하지 않는다. 이 성질을 깨는 짓을 하지 마라 — 예를 들어 children을 함수로 받아 매 렌더 호출하거나, 좌석에 viewBox 값을 prop으로 내려보내면 안 된다.

## Acceptance Criteria

```bash
npm run lint
npm test
npm run build
```

컴포넌트 테스트는 이 step의 필수 요구사항이 아니다(`src/components/`는 TDD 강제 구간이 아니며 이 저장소에는 컴포넌트 테스트 선례가 없다). 다만 `npm run build`가 TypeScript strict를 통과해야 한다.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/8-admin/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `div` + CSS `transform`으로 줌/팬을 구현하지 마라. 반드시 SVG `viewBox`만 조작하라. 이유: ARCHITECTURE.md의 명시적 결정이다. CSS transform은 좌석 히트 영역 좌표 계산을 무너뜨린다
- `Seat.tsx`를 수정하지 마라. 이유: `memo` + atom 구독 구조는 phase 3에서 "클릭당 리렌더 2000 → 1~2"를 만든 핵심이다. 드래그/클릭 구분은 래퍼 레벨에서 해결하라
- `SeatMap.tsx`를 이 step에서 수정하지 마라. 이유: 통합은 Step 2의 스코프다. 이 step은 컴포넌트를 새로 만들기만 한다
- 줌 배율에 상·하한 없이 구현하지 마라. 이유: 무제한 축소 시 좌석이 sub-pixel이 되어 클릭 불가, 무제한 확대 시 방향 감각을 잃는다
- 애니메이션 라이브러리를 설치하지 마라. 이유: UI_GUIDE는 `transition-colors duration-150`만 허용한다
- 좌석 SVG에 키보드 내비게이션/스크린리더 지원을 넣지 마라. 이유: PRD가 MVP 범위에서 명시적으로 제외했다. "대충 넣으면 접근성 있음이 아니라 접근성 있는 척이 된다"
- 기존 테스트를 깨뜨리지 마라

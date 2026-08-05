# Step 1-2: zoom-pan-svg

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — 좌석 성능 전략의 "줌/팬" 항목
- `/docs/UI_GUIDE.md` — 좌석 시각 규칙 > 줌/팬 (초기 viewBox 무대 앞 중앙)
- 이전 step 산출물: `src/components/seat/{SeatMap,Seat}.tsx`

## 작업

SVG `viewBox` 조작만으로 줌/팬을 구현. 2000석을 한 화면에 다 넣으면 좌석 하나가 몇 px이라 클릭 불가능하다.

### 1. `src/components/seat/ZoomPanSvg.tsx`

```tsx
'use client';
interface Props {
  contentWidth: number;
  contentHeight: number;
  initialViewBox?: { x: number; y: number; w: number; h: number };
  children: React.ReactNode;
}
export function ZoomPanSvg({ contentWidth, contentHeight, initialViewBox, children }: Props);
```

동작:
- `viewBox` state를 useState로 관리 (`{ x, y, w, h }`)
- `onWheel`: `w`, `h`를 스케일 팩터로 조정 (deltaY < 0이면 확대). 마우스 커서 위치를 기준으로 확대되도록 x, y 보정
- `onPointerDown`/`onPointerMove`/`onPointerUp`: 드래그로 x, y 이동
- 최소/최대 스케일 clamp (예: 원본의 10% ~ 300%)
- `"전체 보기"` 버튼: `initialViewBox`가 없으면 `{ 0, 0, contentWidth, contentHeight }`로 리셋
- **초기 `viewBox`는 무대 앞 중앙부에 맞춤**. `initialViewBox`가 없으면 컨텐츠 크기의 30~40% 정도로 확대된 상태로 시작. 무대 좌표는 y=0 근처라고 가정하고 초기 뷰는 y=0에서 시작

### 2. `SeatMap`이 `ZoomPanSvg`를 감싸도록 수정

```tsx
export function SeatMap({ seats }: { seats: Seat[] }) {
  // 컨텐츠 bounding box 계산
  const bbox = /* min/max of seat.x/y */;
  return (
    <ZoomPanSvg contentWidth={bbox.w} contentHeight={bbox.h} initialViewBox={{...무대 앞 중앙...}}>
      {seats.map(seat => <Seat key={seat.id} seat={seat} />)}
    </ZoomPanSvg>
  );
}
```

### 3. 성능 확인

zoom/pan 조작 중에도 개별 Seat 컴포넌트는 리렌더되지 않아야 한다 (atomFamily 구독 격리 유지). 확인:
- 팬 드래그 시 `ZoomPanSvg`만 리렌더, Seat들은 skip
- `Seat`에 `React.memo` 유지 필수

### 4. UI

- 우상단 소형 버튼 그룹: `[+]` `[-]` `[전체 보기]`
- 좌하단 소형 안내: `휠: 확대/축소 · 드래그: 이동`
- Tailwind 최소한

## Acceptance Criteria

```bash
npm run build
npm run test
npm run dev &
sleep 3
# 좌석 페이지 접근 (수동)
kill %1
```

수동:
- 초기 로드 시 화면에 좌석 몇십 개 정도가 클릭 가능한 크기로 보임 (전관 X)
- 마우스 휠로 확대/축소 동작. 커서 위치가 확대 중심
- 드래그로 팬 동작
- "전체 보기" 버튼으로 전관 표시
- 팬 중 React DevTools Profiler에서 Seat 컴포넌트가 리렌더되지 않음

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - `div + CSS transform`을 쓰지 **않음**? (반드시 `viewBox` 조작만)
   - 초기 viewBox가 전관이 아닌 무대 앞 중앙부?
   - `Seat`의 `React.memo`가 유지되어 팬 중 리렌더 없음?
   - `ZoomPanSvg`가 `components/seat/` 안에 있음?
3. 결과에 따라 `phases/1-seatmap/index.json`의 step 2를 업데이트:
   - 성공 → `"summary": "ZoomPanSvg viewBox 기반. 초기 뷰 무대 앞 중앙. 전체 보기 버튼. Seat memo 유지"`

## 금지사항

- `div + CSS transform`으로 줌/팬을 구현하지 마라. 이유: 히트 영역(클릭 좌표) 계산이 지옥. viewBox는 자연스럽게 처리됨 (ARCHITECTURE.md 명시)
- 초기 viewBox를 전관으로 두지 마라. 이유: 좌석 하나가 몇 px이라 클릭 불가
- 줌/팬 애니메이션 라이브러리(framer-motion 등)를 추가하지 마라. 이유: 번들 증가, UX 이득 없음
- 모바일 터치 제스처(pinch-to-zoom) 정밀 튜닝은 하지 마라. PRD 명시적 비범위
- Seat의 memo를 지우지 마라. 이유: 팬 중 리렌더 폭발
- 기존 테스트를 깨뜨리지 마라

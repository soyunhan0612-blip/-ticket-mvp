# Step 2: seatmap-zoom-integrate

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/src/lib/seat-layout.ts` — Step 0에서 생성. `getSeatPosition(seat, sections)`, `getLayoutBox(sections)`
- `/src/components/seat/ZoomPanSvg.tsx` — Step 1에서 생성
- `/src/components/seat/SeatMap.tsx` — 이 step에서 수정할 대상
- `/src/components/seat/SeatMapContainer.tsx` — SeatMap 호출부
- `/src/components/seat/Seat.tsx` — 건드리지 않을 대상
- `/src/app/(viewer)/sessions/[id]/seats/page.tsx` — seats 배열을 만드는 RSC
- `/src/lib/seat-preset.ts` — `getPreset(presetId).sections`
- `/src/lib/seat-map.ts` — `SECTIONS` (전체 4구역 기본값)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Step 0의 레이아웃 함수와 Step 1의 `ZoomPanSvg`를 실제 좌석맵에 연결한다.

### 1. `src/components/seat/SeatMap.tsx` 수정

- 파일 안에 있는 `getSeatPosition`, `SEAT_PITCH`, `SECTION_WIDTH`, `SECTION_HEIGHT`, `SECTION_GAP`, `SEAT_AREA_TOP`, `MAP_WIDTH`, `MAP_HEIGHT` 정의를 **삭제하고** `@/lib/seat-layout`의 것을 import해 사용한다. 좌표 계산 로직을 두 곳에 두지 마라.
- `sections: readonly Section[]` prop을 추가한다.
- 기존 `<svg viewBox=...>`를 `ZoomPanSvg`로 교체한다. `box`는 `getLayoutBox(sections)` 결과를 넘긴다.
- STAGE 텍스트는 유지한다. 레이아웃 박스 상단 중앙에 오도록 배치하라.
- `SelectionBar`는 지금처럼 SVG 바깥에 유지한다.

인터페이스:

```typescript
interface SeatMapProps {
  seats: readonly SeatType[];
  sessionId: string;
  sections: readonly Section[];
}
```

### 2. 호출부에 `sections` 전달

`SeatMapContainer.tsx`가 `sections`를 받아 `SeatMap`에 그대로 넘기도록 prop을 추가한다.

`src/app/(viewer)/sessions/[id]/seats/page.tsx`에서 실제 값을 결정한다. 현재 이 페이지는 좌석 배열을 이렇게 만들고 있다:

```typescript
const seats = show.presetId
  ? generateSeatsForPreset(show.presetId)
  : generateSeats();
```

`sections`도 **같은 분기 기준**으로 정해야 한다:
- `show.presetId`가 있으면 `getPreset(show.presetId).sections`
- 없으면 `SECTIONS` (전체 4구역)

좌석 배열과 sections가 어긋나면 `getSeatPosition`이 `RangeError`를 던진다. 두 값이 항상 같은 프리셋에서 유래하도록 하라.

### 3. 성능 회귀 방지

`ZoomPanSvg`의 viewBox state 변경이 좌석 2000개의 리렌더로 번지면 이 프로젝트의 핵심 성과가 무너진다.

- 좌석 목록을 렌더하는 부분을 `ZoomPanSvg`의 children으로 넘길 때, 매 렌더마다 새 배열/새 element를 만드는 것 자체는 부모(SeatMap)가 리렌더될 때만 일어난다. 문제는 **ZoomPanSvg 내부 state 변경이 SeatMap을 리렌더시키지 않는다**는 점이 지켜지는지다 — state를 ZoomPanSvg 안에 가뒀다면 자동으로 성립한다.
- 좌석에 viewBox 값이나 줌 배율을 prop으로 내려보내지 마라.

## Acceptance Criteria

```bash
npm run lint
npm test
npm run build
```

빌드 후 개발 서버에서 육안 확인 (에이전트가 자동화할 수 없다면 결과를 summary에 기록하라):

```bash
npm run dev
```

- `/shows`에서 시드 공연(4구역 2000석) 회차로 진입 → 좌석이 기존과 동일한 배치로 보인다
- 휠로 확대·축소, 드래그로 이동이 된다
- 드래그를 끝낸 지점의 좌석이 **토글되지 않는다**
- 제자리 클릭은 좌석을 토글한다
- "전체 보기" 버튼이 전관으로 되돌린다

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

- `Seat.tsx`의 `memo` 래핑과 atom 구독 구조를 수정하지 마라. 이유: phase 3에서 확보한 "클릭당 리렌더 1~2개"가 이 프로젝트의 정량 증거다. 여기가 무너지면 README의 before/after 서사가 통째로 증발한다
- 좌표 계산을 `SeatMap.tsx`에 남겨두지 마라. 이유: Step 0에서 `lib/`로 추출한 목적이 단일 소스와 테스트 가능성이다. 두 벌이 남으면 Step 5의 Admin 좌석맵에서 어긋난다
- `page.tsx`에서 좌석 배열과 sections를 서로 다른 기준으로 만들지 마라. 이유: `getSeatPosition`이 `RangeError`를 던져 페이지가 죽는다
- `export const dynamic = "force-dynamic"`을 제거하지 마라. 이유: 없으면 RSC 결과가 캐시돼 옛 좌석 스냅샷이 보인다 (CLAUDE.md CRITICAL)
- 좌석 4색(`fill-neutral-500` / `fill-white` / `fill-neutral-700` / `fill-neutral-800`)을 바꾸지 마라. 이유: UI_GUIDE에서 다른 UI 규칙보다 우선한다고 못박은 규칙이다
- 기존 테스트를 깨뜨리지 마라

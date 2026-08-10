# Step 1: seat-render-baseline

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` — 특히 ADR-002
- `/docs/PROGRESS.md` — Day 3 절(약 70~104줄). "before 측정" 항목이 왜 비어 있는지 확인
- `/src/lib/render-counter.ts`와 `/src/lib/render-counter.test.ts` — **step 0에서 생성됨.** `createRenderCounter()` 사용법을 여기서 익힌다
- `/src/components/seat/Seat.tsx`, `/src/components/seat/SeatMap.tsx` — **현재(최적화 후) 구현.** 이 step에서 만들 대조군이 무엇과 다른지 파악용
- `/src/lib/seat-layout.ts` — `getLayoutBox`, `getSeatPosition` 시그니처
- `/src/lib/mock-data.ts` — 좌석 생성 함수
- `/src/types/index.ts` — `Seat`, `SeatVisualState` 타입
- `/src/components/seat/ZoomPanSvg.test.tsx` — 이 저장소의 컴포넌트 테스트 작성 스타일 본보기

## 배경

`docs/PROGRESS.md`와 `README.md`의 성능 표에는 Day 3(before) 수치가 비어 있다.
ADR-002는 "클릭당 리렌더 2000 → 1~2"를 이 프로젝트의 정량적 근거로 삼겠다고 선언했지만,
실제로 그 숫자를 재현할 수단이 저장소에 하나도 없다. 이 step은 **before 쪽 숫자**를
테스트로 고정한다.

문제는 Day 3의 순진한 구현이 현재 작업 트리에 존재하지 않는다는 것이다.
그 코드는 git 커밋 `91713d0` (`feat(2-seat-v0): step 1 — seat-components`)에만 있다.
따라서 대조군을 **테스트 픽스처로 재현**해야 한다.

`91713d0` 시점의 구현이 현재와 다른 점 (참고용 요약):

| | Day 3 (`91713d0`) | 현재 |
|---|---|---|
| `Seat` memo | 없음 (`export function Seat`) | `memo(function Seat...)` |
| `Seat` props | `{ seat, x, y, state, onClick }` — 상태·핸들러를 부모가 주입 | `{ seat, x, y }` — 기하 정보만 |
| `Seat` 상태 획득 | props `state` | `useAtomValue(seatVisualStateAtomFamily(seat.id))` |
| `Seat` 클릭 | props `onClick` (부모가 매 렌더 새 클로저 생성) | `useSetAtom(toggleSeatAtom)` |
| `SeatMap` 선택 상태 | `useState<string[]>` 로컬 보유 | 없음 (atom이 담당) |
| `SeatMap` 좌석 판정 | 렌더 중 `selected.includes(seat.id)` | `Seat` 내부 atom 구독 |

Day 3 병목의 인과는 세 가지가 겹친 것이다:
(a) `SeatMap`이 `useState`를 가져 클릭마다 부모가 리렌더되고,
(b) `Seat`에 memo가 없으며,
(c) `onClick` 인라인 클로저가 매 렌더 새 참조라 memo를 넣어도 무력화된다.

## 작업

### 1. Day 3 대조군 픽스처

`src/components/seat/__fixtures__/naive-seat-map.tsx`를 만든다.
(디렉토리 `__fixtures__`가 없으면 생성)

`91713d0`의 `Seat.tsx`·`SeatMap.tsx`를 **구조적으로 동등하게** 재현한다.
필요하면 `git show 91713d0:src/components/seat/Seat.tsx`와
`git show 91713d0:src/components/seat/SeatMap.tsx`로 원본을 확인하라.

시그니처:

```tsx
export interface NaiveSeatProps {
  seat: SeatType;
  x: number;
  y: number;
  state: SeatVisualState;
  onClick: () => void;
}

/** memo 없음 — Day 3 대조군. */
export function NaiveSeat(props: NaiveSeatProps): JSX.Element;

export interface NaiveSeatMapProps {
  seats: readonly SeatType[];
  sections: readonly string[];
  /** 렌더될 때마다 호출된다. 렌더 횟수 계측용 주입 지점. */
  onSeatRender?: (seatId: string) => void;
}

/** 선택 상태를 useState로 보유 — Day 3 대조군. */
export function NaiveSeatMap(props: NaiveSeatMapProps): JSX.Element;
```

**파일 최상단에 반드시 아래 내용의 주석을 넣어라** (문구는 다듬어도 되나 정보는 전부 포함):

```
Day 3(before) 대조군 재현. 출처 커밋: 91713d0 "feat(2-seat-v0): step 1 — seat-components".
재현 범위: memo 부재, state·onClick prop drilling, SeatMap의 useState 선택 상태,
렌더 중 selected.includes() 판정.
재현하지 않은 것: 당시의 Tailwind 기본 팔레트 클래스명(현재는 DS 토큰), ZoomPanSvg 부재.
이 둘은 렌더 횟수에 영향을 주지 않는다.
이 파일은 테스트 전용이다. 프로덕션 코드에서 import하지 마라.
```

`onSeatRender`는 `NaiveSeat`의 렌더 본문에서 호출되어야 한다.
`useEffect`가 아니라 **렌더 중 호출**이어야 한다. 이유: 렌더 함수 호출 횟수를 세는 것이지
커밋된 이펙트 횟수를 세는 것이 아니다.

### 2. before 계측 테스트

`src/components/seat/__tests__/naive-render-count.test.tsx`를 만든다.
(디렉토리가 없으면 생성)

시나리오:

1. `createRenderCounter()`로 카운터 인스턴스 생성
2. 좌석 N석을 만들어 `NaiveSeatMap`을 렌더. `onSeatRender={(id) => counter.bump(id)}`
3. 마운트 직후 카운터를 `reset()` — 초기 마운트 렌더를 제외하고 **클릭에 의한 리렌더만** 센다
4. 좌석 하나를 클릭
5. `counter.total()`이 **좌석 수 N과 같음**을 assert

**좌석 수는 2,000석 전량이 아니라 축소된 규모(예: 한 섹션 200석 이하)를 써라.**
jsdom에서 2,000개 SVG 노드를 렌더하면 테스트가 매우 느려지고 CI 시간이 폭증한다.
대신 **"클릭당 리렌더 수 == 전체 좌석 수"라는 비례 관계**를 assert하라.
이 관계가 성립하면 2,000석에서 2,000이라는 것이 따라 나온다.
테스트 안에 이 근거를 주석으로 남겨라.

추가로 assert할 것:
- 클릭된 좌석뿐 아니라 **클릭과 무관한 좌석도 리렌더됨** (대조군의 병목을 명시적으로 증명)

## Acceptance Criteria

```bash
npm run lint
npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 픽스처가 `__fixtures__`/`__tests__` 아래에만 있고 프로덕션 렌더 경로에 침입하지 않았는가?
   - 새 의존성을 추가하지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. **측정된 실제 수치를 `summary`에 반드시 기록하라.** step 4가 이 숫자를 문서에 옮겨 적는다.
   예: `"summary": "Day 3 대조군 픽스처와 계측 테스트 추가. 좌석 200석에서 클릭 1회당 NaiveSeat 리렌더 200회(= 전체 좌석 수) 확인"`
4. 결과에 따라 `phases/11-perf-metrics/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "…"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "…"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "…"` 후 즉시 중단

## 금지사항

- 픽스처를 `src/components/seat/` 직하(`Seat.tsx` 옆)에 두지 마라. 이유: 현재 구현과 역할이 혼동되고, 빌드 산출물에 죽은 코드가 포함된다. 반드시 `__fixtures__/` 아래에 둔다.
- 프로덕션 `Seat.tsx`·`SeatMap.tsx`를 수정하지 마라. 이유: 이 step은 before 대조군만 다룬다. 현재 구현은 step 2에서 **읽기만** 한다.
- `git revert`나 `git checkout 91713d0 -- <path>`로 옛 파일을 작업 트리에 되살리지 마라. 이유: 현재 구현을 덮어써 프로덕션이 망가진다. 반드시 새 픽스처 파일로 재현하라.
- 2,000석 전량으로 테스트하지 마라. 이유: jsdom 렌더 비용으로 테스트 스위트가 몇 분 단위로 느려진다. 비례 관계로 증명하라.
- 측정 수치를 추정으로 적지 마라. 이유: 이 프로젝트는 "추정값은 기록하지 않는다"를 README에 명시했다. 반드시 테스트가 실제로 출력한 값을 쓴다.
- 기존 테스트를 깨뜨리지 마라.

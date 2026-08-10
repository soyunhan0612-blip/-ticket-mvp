# Step 2: seat-render-current

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` — 특히 ADR-002
- `/src/lib/render-counter.ts` — **step 0에서 생성됨**
- `/src/components/seat/__fixtures__/naive-seat-map.tsx`, `/src/components/seat/__tests__/naive-render-count.test.tsx` — **step 1에서 생성됨.** 이 step의 테스트는 이것과 **같은 시나리오·같은 좌석 수**를 써야 before/after 비교가 성립한다
- `/src/components/seat/Seat.tsx` — 현재 구현. `memo` + `useAtomValue(seatVisualStateAtomFamily(...))`
- `/src/components/seat/SeatMap.tsx` — 현재 구현
- `/src/atoms/seat.ts` — 특히 `seatVisualStateAtomFamily`(52~76줄)와 `selectedSeatIdsAtom`, `toggleSeatAtom`
- `/src/atoms/seat.test.ts` — 이 저장소의 atom 테스트 스타일 (`createStore()` 기반)
- `/src/hooks/use-seat-snapshot.ts` — `SNAPSHOT_REFETCH_INTERVAL = 3_000`
- `/src/components/providers.tsx` — `QueryClientProvider` → `JotaiProvider` 구성

## 배경

step 1이 before 수치를 고정했다. 이 step은 **after 수치**를 고정한다.
단, 측정해야 할 층이 두 개이고 값이 크게 다르다는 점이 핵심이다.

`src/atoms/seat.ts:52-76`을 보면 `seatVisualStateAtomFamily`의 read 함수가
`selectedSeatIdsAtom`을 통째로 구독한다:

```ts
export const seatVisualStateAtomFamily = atomFamily((seatId: string) =>
  atom<SeatVisualState>((get) => {
    const status = get(seatStatusAtomFamily(seatId));
    const selectedSeatIds = get(selectedSeatIdsAtom);   // ← 전 좌석 공유 의존
    const readOnly = get(seatMapReadOnlyAtom);          // ← 전 좌석 공유 의존
    ...
```

따라서 좌석 하나를 클릭하면:

- `selectedSeatIdsAtom`이 바뀐다
- **모든 좌석의 파생 atom이 재계산된다** (좌석 수만큼)
- 그러나 반환값이 이전과 같으면(`"available"` === `"available"`) Jotai가 구독 컴포넌트
  리렌더를 건너뛴다 → **실제 React 리렌더는 1~2개**

ADR-002가 주장하는 "2000 → 1~2"는 **React 리렌더 기준**의 주장이다.
이 프로젝트는 "과장하지 않는다"를 명시적 기조로 삼으므로, 그 아래층인 atom 재계산 횟수도
같이 측정해 문서에 병기한다. 숨기면 코드를 읽는 심사자가 발견했을 때 서사의 허점이 된다.

## 작업

`src/components/seat/__tests__/seat-render-count.test.tsx`를 만든다.

### 측정 1 — React 리렌더 횟수 (after)

현재 `SeatMap`/`Seat`으로 step 1과 **동일한 좌석 수·동일한 클릭 시나리오**를 실행한다.

`Seat`은 props로 계측 콜백을 받지 않으므로, 렌더를 관측하려면 `Seat` 모듈을 목킹해
원본을 감싸는 방식을 쓴다. `vi.mock`으로 `@/components/seat/Seat`을 대체하되,
`vi.importActual`로 원본 `Seat`을 가져와 **`memo` 동작을 보존한 채** 렌더를 계측하라.

**중요**: 목킹이 `memo`를 벗겨내면 측정이 무의미해진다. 원본 `Seat`(memo가 적용된 것)을
그대로 렌더하고, 그 렌더 발생을 세는 형태여야 한다. 예를 들어 원본을 감싼 래퍼에 카운트를
넣으면 래퍼가 memo 바깥이라 매번 호출되어 **틀린 값(= 좌석 수 전체)이 나온다.**
반드시 `memo`의 **안쪽**에서 세야 한다.

구현 방법은 재량이나, 결과가 다음을 만족해야 한다:
- 클릭과 무관한 좌석은 리렌더되지 **않음**
- 클릭된 좌석은 리렌더됨
- 총 리렌더 수가 좌석 수에 **비례하지 않고 상수**임 (step 1의 대조군과 정반대)

이것이 검증하기 어렵다면, 대안으로 `seatVisualStateAtomFamily`의 값 변화를 구독하는
별도 테스트 컴포넌트로 "값이 실제로 바뀐 좌석 수"를 세는 방식도 허용한다.
단 그 경우 테스트 주석에 "React 리렌더의 상한을 측정한 것"이라고 정확히 적어라.

### 측정 2 — 파생 atom 재계산 횟수

`seatVisualStateAtomFamily`의 read 함수 진입 횟수를 센다.
프로덕션 `src/atoms/seat.ts`에 카운터를 심지 마라. 대신 테스트 안에서
`createStore()`로 Jotai 스토어를 만들고, 좌석 N개의 `seatVisualStateAtomFamily(id)`를
모두 구독(`store.sub`)한 뒤 `toggleSeatAtom`을 한 번 실행해 재계산이 몇 번 일어나는지 센다.

재계산 관측은 `store.sub` 콜백 횟수가 아니라 **read 함수 진입 횟수**여야 한다.
Jotai는 값이 같으면 sub 콜백을 호출하지 않으므로 둘은 다른 숫자다.
read 진입을 직접 세려면, 동일한 의존 구조를 갖는 **테스트 전용 파생 atomFamily**를
테스트 파일 안에 정의해 `counter.bump()`를 넣는 방식이 가장 단순하다.
그 경우 프로덕션 atom과 의존 관계가 동일함을 주석으로 명시하라
(`seatStatusAtomFamily(id)` + `selectedSeatIdsAtom` + `seatMapReadOnlyAtom` 세 개 구독).

기대 결과: 재계산 횟수 == 구독 중인 좌석 수.

### 폴링 격리 (반드시)

`useSeatSnapshot`은 `refetchInterval: 3_000`으로 3초마다 새 `data` 참조를 만들고,
그 결과 `SeatMapContainer` → `SeatMap` → `ZoomPanSvg`가 클릭과 무관하게 리렌더된다.
이 노이즈가 섞이면 측정값이 오염된다.

따라서 이 테스트에서는 다음 중 하나로 폴링을 반드시 차단하라:
- `SeatMapContainer`가 아니라 `SeatMap`을 직접 렌더 (폴링 훅을 타지 않음) — **권장**
- 또는 테스트 전용 `QueryClient`에 `refetchInterval: false` 기본값 설정

테스트 주석에 "3초 폴링을 배제한 상태에서 측정했다"고 남겨라.

## Acceptance Criteria

```bash
npm run lint
npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 프로덕션 `src/atoms/seat.ts`, `src/components/seat/Seat.tsx`, `SeatMap.tsx`가 **무수정**인가?
   - 새 의존성을 추가하지 않았는가?
   - step 1과 좌석 수·시나리오가 동일해 before/after 비교가 성립하는가?
3. **측정된 실제 수치 두 개를 `summary`에 반드시 기록하라.** step 4가 이 숫자를 문서에 옮겨 적는다.
   예: `"summary": "현재 구현 계측 테스트 추가. 좌석 200석 기준 클릭 1회당 Seat React 리렌더 2회, 파생 atom 재계산 200회(= 좌석 수). 3초 폴링 배제 상태"`
4. 결과에 따라 `phases/11-perf-metrics/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "…"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "…"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "…"` 후 즉시 중단

## 금지사항

- 프로덕션 `src/atoms/seat.ts`에 카운터·계측 코드를 심지 마라. 이유: 사용자가 "테스트 전용 계측"을 선택했다. 프로덕션 번들에 측정 코드가 들어가면 안 된다.
- 프로덕션 `Seat.tsx`에서 `memo`를 제거하거나 계측 props를 추가하지 마라. 이유: 측정 대상 자체를 변형하면 측정이 무의미해진다.
- `memo` 바깥에서 렌더를 세지 마라. 이유: 래퍼가 memo 밖이면 매 렌더 호출되어 좌석 수 전체가 나온다 — 최적화가 안 된 것처럼 보이는 틀린 값이다.
- 폴링을 켠 채로 측정하지 마라. 이유: 3초마다 `SeatMapContainer`/`SeatMap`/`ZoomPanSvg`가 리렌더되어 클릭 기인 렌더와 구분되지 않는다.
- 초기 마운트 "시간"을 측정하려 하지 마라. 이유: jsdom에는 실제 레이아웃·페인트가 없어 숫자가 무의미하다. 시간은 step 3의 브라우저 절차로 사람이 잰다.
- 측정 수치를 추정으로 적지 마라.
- 기존 테스트를 깨뜨리지 마라.

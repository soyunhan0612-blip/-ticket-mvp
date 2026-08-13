# Step 0: render-counter

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — 디렉토리 경계와 `lib/` 순수 로직 규약
- `/docs/ADR.md` — 특히 ADR-002 (atomFamily 좌석 구독 격리 + before/after 측정)
- `/CLAUDE.md`, `/AGENTS.md` — TDD 강제 구간과 CRITICAL 규칙
- `/vitest.config.ts`, `/vitest.setup.ts` — 테스트 환경 설정
- `/src/lib/seat-rules.ts`와 `/src/lib/seat-rules.test.ts` — 이 저장소의 `lib/` 모듈 작성 스타일과 테스트 스타일의 본보기

## 배경

이 phase의 목적은 `docs/PROGRESS.md`와 `README.md`에 비어 있는 성능 수치를,
**추정이 아니라 `npm test`로 재현 가능한 근거**로 채우는 것이다.

측정해야 할 층은 두 개이고, 둘은 서로 다른 값이다:

1. **React 리렌더 횟수** — 좌석 1회 클릭 시 실제로 렌더 함수가 호출된 `Seat` 컴포넌트 수
2. **파생 atom 재계산 횟수** — 같은 클릭에서 `seatVisualStateAtomFamily`의 read 함수가 진입한 횟수

`seatVisualStateAtomFamily`는 `selectedSeatIdsAtom` 전체를 구독하므로 클릭 한 번에
2,000개 파생 atom이 모두 재계산되지만, Jotai가 반환값이 같으면 리렌더를 건너뛴다.
따라서 (1)은 작고 (2)는 크다. 이 단계에서는 두 층을 **같은 도구로 셀 수 있는 유틸**만 만든다.

## 작업

`src/lib/render-counter.ts`를 새로 만든다. **TDD 강제 구간이므로 `src/lib/render-counter.test.ts`를 먼저 작성하라.**

### 인터페이스

```ts
export interface RenderCounter {
  /** label의 카운트를 1 증가시킨다. 최초 label은 0에서 시작해 1이 된다. */
  bump(label: string): void;
  /** label의 현재 카운트. 한 번도 bump되지 않은 label은 0. */
  countOf(label: string): number;
  /** 현재까지 집계된 전체 카운트의 읽기 전용 사본. */
  snapshot(): Readonly<Record<string, number>>;
  /** 모든 카운트를 버린다. */
  reset(): void;
  /** 집계된 모든 카운트의 합. */
  total(): number;
}

export function createRenderCounter(): RenderCounter;
```

### 핵심 규칙 (반드시 지킬 것)

- **모듈 스코프 가변 상태를 두지 마라.** 카운터는 반드시 `createRenderCounter()` 호출마다
  독립된 인스턴스여야 한다. 이유: `Seat` 컴포넌트는 뷰어(`SeatMapContainer`)와
  관리자(`AdminSeatMap`) 두 렌더 트리에서 공유된다. 모듈 전역 카운터를 쓰면 두 경로의
  렌더가 같은 숫자에 누적되어 측정값이 오염된다. 또한 vitest는 한 파일 안의 여러 테스트가
  같은 모듈 인스턴스를 공유하므로 테스트 간 격리도 깨진다.
- **`snapshot()`이 반환한 객체를 바깥에서 수정해도 내부 상태가 바뀌면 안 된다.** 사본을 반환하라.
- **의존성을 추가하지 마라.** 순수 TypeScript만 쓴다. React를 import하지 마라 —
  이 모듈은 `lib/`의 순수 로직이고, React에 의존하는 순간 `lib/` 경계가 무너진다.

### 테스트가 반드시 덮어야 할 것

- 새 인스턴스의 임의 label은 `countOf` 0
- `bump` 3회 후 `countOf` 3
- 서로 다른 label이 독립적으로 집계됨
- `createRenderCounter()` 두 인스턴스가 서로 간섭하지 않음 (모듈 전역 금지의 회귀 방어)
- `reset()` 후 전부 0, `total()` 0
- `snapshot()` 결과를 변형해도 원본 불변
- `total()`이 여러 label 합계와 일치

## Acceptance Criteria

```bash
npm run lint
npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가? (`src/lib/` 아래 순수 로직)
   - ADR 기술 스택을 벗어나지 않았는가? (새 의존성 0)
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
   - 테스트를 구현보다 먼저 작성했는가?
3. 결과에 따라 `phases/11-perf-metrics/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 모듈 스코프 가변 상태(전역 `Map`, 전역 객체)를 두지 마라. 이유: 위 "핵심 규칙" 참조 — 뷰어와 관리자 트리가 `Seat`을 공유해 측정값이 오염된다.
- `src/components/` 아래 프로덕션 컴포넌트를 이 step에서 수정하지 마라. 이유: 이 step은 유틸 레이어만 다룬다. 컴포넌트 계측은 step 1·2에서 테스트 파일 안에서만 한다.
- `performance.now()` 기반 시간 측정 API를 추가하지 마라. 이유: 테스트 환경이 jsdom이라 실제 레이아웃·페인트 비용이 없어 시간 측정이 무의미하다. 시간은 브라우저에서 사람이 잰다(step 3).
- 기존 테스트를 깨뜨리지 마라.

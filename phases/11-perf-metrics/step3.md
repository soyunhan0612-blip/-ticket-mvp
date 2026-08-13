# Step 3: measurement-guide

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` — 특히 ADR-002, 그리고 **ADR-004(32~55줄). 51줄의 "Upstash 콘솔 실측은 아직 못 했다" 문단이 이 step의 두 번째 측정 대상이다**
- `/docs/PROGRESS.md` — Day 3 절의 "before 측정"(94~100줄), Day 4 절의 "after 측정"(129~135줄). 두 절이 참조하는 스크린샷 경로를 확인하라
- `/README.md` — "성능 before / after" 절(52~61줄)
- `/src/components/seat/__tests__/naive-render-count.test.tsx` — **step 1에서 생성됨**
- `/src/components/seat/__tests__/seat-render-count.test.tsx` — **step 2에서 생성됨**
- `/src/hooks/use-seat-snapshot.ts` — 폴링 주기(`SNAPSHOT_REFETCH_INTERVAL`, 11줄)
- `/src/services/seat-store-redis.ts` — `getSnapshot`(227~260줄). 폴링 1회가 실제로 어떤 Redis 커맨드를 쏘는지의 유일한 근거
- `/src/services/index.ts` — `hasRedisConfig()`로 memory ↔ redis 구현이 갈리는 지점
- `/src/lib/hold.ts` — `HOLD_TTL_MS`(hold 만료까지의 시간)
- `/.env.example` — Upstash 환경변수 이름
- `/src/lib/mock-data.ts` — 시드 세션 ID 확인 (측정 절차에 실제 존재하는 URL을 적어야 한다)
- `/.gitignore` — `docs/assets/`가 무시되지 않는지 확인

## 배경

step 1·2로 **리렌더 횟수**는 `npm test`로 재현 가능해졌다.
그러나 `docs/PROGRESS.md`가 요구하는 값 중 **초기 마운트 시간**은 여전히 비어 있고,
이것은 자동화할 수 없다. 테스트 환경이 jsdom이라 실제 레이아웃·페인트 비용이 없기 때문이다.
PROGRESS.md 95줄이 이미 "브라우저에서 수동 측정 후 사람이 채운다. 자동화 X"라고 선언해 두었다.

이 step의 목적은 그 수동 측정을 **"열고, 누르고, 숫자 읽어 적기"** 수준으로 축소하는 것이다.
현재는 사람이 무엇을 어떤 순서로 재야 하는지조차 문서에 없어서 `10-release/step2`가
blocked 상태다.

`10-release/step2`의 `blocked_reason`이 요구한 값은 네 가지이고, 그중 **네 번째가
Upstash 콘솔 기준 스냅샷 폴링 1회의 실제 커맨드 수(Lua `EVAL` 과금 단위 포함)**다.
이것도 브라우저·외부 콘솔이 필요한 수동 측정이고, 절차가 문서에 없다는 점에서 초기 마운트
시간과 사정이 같다. 따라서 이 step에서 함께 절차화한다 — 그러지 않으면 phase 11이 끝나도
`10-release/step2`는 같은 이유로 blocked에 남는다.

또한 `docs/assets/` 디렉토리가 아예 존재하지 않아 PROGRESS.md가 참조하는 스크린샷 경로
(`docs/assets/day3-before-profiler.png`, `docs/assets/day4-after-profiler.png`)가
깨진 링크다. 이것도 이 step에서 해결한다.

## 작업

### 1. `docs/assets/` 디렉토리 생성

`docs/assets/.gitkeep`을 만들어 빈 디렉토리가 커밋되게 한다.
`.gitignore`가 이 경로를 무시하지 않는지 확인하라. 무시한다면 예외 규칙을 추가한다.

### 2. `docs/PERF_MEASUREMENT.md` 작성

성능 측정 절차서. 아래 구조를 따르되 문장은 이 저장소의 한국어 문서 톤(간결한 서술체)에 맞춘다.

**포함해야 할 절:**

**(a) 무엇이 자동이고 무엇이 수동인가**

표로 정리한다. 각 항목이 어디서 나오는지 정확히 가리켜라.

| 측정 항목 | 방식 | 근거 위치 |
|---|---|---|
| 좌석 클릭당 React 리렌더 수 (before/after) | 자동 | `npm test` — step 1·2의 테스트 파일 경로 |
| 파생 atom 재계산 수 | 자동 | 같음 |
| 초기 마운트 시간 | **수동** | 브라우저 Profiler (아래 (b)·(c) 절차) |
| 폴링 1회당 Upstash 커맨드 수 | **수동** | Upstash 콘솔 (아래 (f) 절차) |

자동 항목은 "추정이 아니라 테스트가 출력한 값"이라는 점을 명시하라.
수동 항목 두 개는 성격이 다르다는 점도 적어라 — 초기 마운트 시간은 **아직 잰 적이 없는 값**이고,
폴링 커맨드 수는 **코드로 세어 둔 값(ADR-004)이 콘솔 과금 단위와 일치하는지 확인하는 검증**이다.

**(b) 수동 측정 절차 — 초기 마운트 시간**

번호 매긴 단계로 적는다. 반드시 포함할 것:

- 사전 준비: React DevTools 확장 설치, `npm run dev`
- 접속할 정확한 URL (`src/lib/mock-data.ts`에서 실제 존재하는 세션 ID를 확인해 적어라. 추측하지 마라)
- **측정 전 폴링 영향 제거 안내**: 좌석 페이지는 3초마다 스냅샷을 폴링하며
  `SeatMapContainer`/`SeatMap`/`ZoomPanSvg`가 함께 리렌더된다. 초기 마운트 커밋만
  읽어야 하므로 Profiler의 첫 커밋(마운트)만 보고, 이후 3초 간격 커밋은 폴링으로
  간주해 제외한다고 명시하라.
- Profiler `Record` → 페이지 새로고침 → `Stop`
- 첫 커밋의 duration을 읽는 위치 (Flamegraph 상단 커밋 선택 → 커밋 duration)
- 스크린샷 저장 경로: `docs/assets/day4-after-profiler.png`
- 3회 측정해 중앙값을 쓰라는 안내 (단일 측정은 편차가 크다)

**(c) Day 3(before) 초기 마운트 시간은 어떻게 재는가**

이건 함정이 있으므로 정직하게 적어야 한다.
Day 3의 순진한 구현은 현재 작업 트리에 없고 커밋 `91713d0`에만 있다.
브라우저로 재려면 그 커밋을 체크아웃해야 하는데, 그 시점에는 `ZoomPanSvg`도 없고
서버 hold·폴링도 없어서 **현재와 동일 조건이 아니다**.

두 가지 선택지를 제시하고 트레이드오프를 적어라:

1. **`git worktree`로 `91713d0`을 별도 디렉토리에 체크아웃해 측정** — 조건이 다름을 각주로 병기
2. **before 초기 마운트 시간을 측정하지 않고 공란으로 남김** — 리렌더 횟수만으로 서사 유지

어느 쪽을 택하든 **"초기 마운트 비용은 atomFamily로 개선되지 않는다"**는 것이
ADR-002의 기존 입장이므로, before/after 시간 비교가 서사의 핵심이 아니라는 점을 적어라.
즉 이 값은 "개선을 증명하는 수치"가 아니라 "개선되지 않았음을 정직하게 보여주는 수치"다.

**(d) 측정값을 어디에 적는가**

- `docs/PROGRESS.md` 97·98줄(Day 3), 132·133줄(Day 4)
- `README.md` 58·59줄 표
- `docs/ADR.md` ADR-004 51줄 — (f)의 Upstash 실측 결과가 들어갈 자리

각 위치의 현재 플레이스홀더 형태가 다르다는 점을 명시하라:
PROGRESS.md는 `**_ ms` / `**_` / `**_ ms**` 형태가 섞여 있고, README.md는 `TBD`이며,
ADR-004는 플레이스홀더가 아니라 "아직 못 했다"는 **문장**이다.

**(e) 재현 방법**

자동 측정 항목을 다시 확인하는 커맨드를 적는다:

```bash
npm test -- src/components/seat/__tests__
```

(실제로 동작하는 커맨드인지 실행해 확인하고, 아니면 동작하는 형태로 고쳐 적어라)

**(f) 수동 측정 절차 — 폴링 1회당 Upstash 커맨드 수**

`docs/ADR.md`의 ADR-004는 "폴링 1회 = 2커맨드"를 **코드 경로를 읽어 센 값**이라고 명시하고,
Lua `EVAL`이 콘솔에서 몇 커맨드로 과금되는지는 확인이 필요하다고 적어 두었다.
이 절은 그 확인 절차를 적는다.

먼저 **무엇을 확인하는 측정인지**를 코드 근거와 함께 밝혀라.
`src/services/seat-store-redis.ts`의 `getSnapshot`(227~260줄)이 폴링 1회에 쏘는 커맨드는
두 갈래다. 실제 줄 번호와 조건을 파일에서 확인해 적어라:

1. `HGETALL session:{id}:seats` — 항상 1회
2. 만료된 hold 좌석이 **없으면** `GET session:{id}:version`,
   **있으면** 대신 `CLEANUP_EXPIRED` Lua `EVAL` 1회

즉 확인해야 할 것은 두 가지다. **(가)** 만료 좌석이 없는 평상시 경로가 콘솔에서 실제로
2커맨드로 집계되는가. **(나)** `EVAL` 1회가 1커맨드로 집계되는가, 아니면 스크립트 내부의
`redis.call`(`HDEL`·`INCR`·`GET` 등)까지 각각 집계되는가.

절차는 번호 매긴 단계로 적되, 아래를 반드시 포함하라:

- **사전 조건**: `.env.local`에 `UPSTASH_REDIS_REST_URL`·`UPSTASH_REDIS_REST_TOKEN`이 있어야
  `src/services/index.ts`의 `hasRedisConfig()`가 참이 되어 Redis 구현이 선택된다.
  값이 없으면 인메모리 Store가 쓰여 커맨드가 아예 발생하지 않는다는 점을 명시하라
  (측정이 조용히 0으로 나오는 함정이다)
- **다른 트래픽 차단**: 좌석 페이지 탭 **1개만** 열고 Admin·다른 좌석 탭·다른 브라우저를 모두 닫는다.
  배포본이 아니라 로컬 `npm run dev`에서 재는 편이 통제하기 쉽지만, 로컬과 배포본이 **같은 Upstash
  DB를 공유하면** 배포본 접속자의 폴링이 그대로 섞인다는 점을 경고하라
- **측정 창**: Upstash 콘솔의 커맨드 카운터 기준값을 적고 → 좌석 페이지를 정해진 시간(예: 60초)
  열어 둔 뒤 → 증가분을 적는다. 폴링 주기는 `src/hooks/use-seat-snapshot.ts`의
  `SNAPSHOT_REFETCH_INTERVAL`(11줄)에서 실제 값을 확인해 적고, 그 값으로 폴링 횟수를 계산하는
  식을 함께 적어라 (증가분 ÷ 폴링 횟수 = 폴링 1회당 커맨드 수)
- **(나) `EVAL` 과금 단위 측정**: 만료 좌석이 생기기를 기다리면 `HOLD_TTL_MS`(`src/lib/hold.ts`)
  만큼 대기해야 한다. 실제 값을 확인해 적고, **더 짧은 대안**을 함께 제시하라 —
  좌석을 1회 hold하면 `HOLD_SCRIPT` `EVAL`이 1회 발생하므로(같은 파일의 `holdSeats`),
  그 조작 전후 증가분만으로도 `EVAL`의 과금 단위를 확인할 수 있다
- **콘솔 지표 반영 지연**: 카운터가 즉시 갱신되지 않으면 몇 분 기다렸다 읽는다
- **측정 후 정리**: 좌석 페이지를 열어 두면 3초마다 커맨드가 계속 소모되므로 탭을 닫는다

마지막으로 **결과를 어떻게 기록하는가**를 적어라:

- 기록 위치는 `docs/ADR.md` ADR-004 51줄의 "Upstash 콘솔 실측은 아직 못 했다" 문단이다
- 실측이 코드로 센 값과 **다르면 원래 추정이 틀렸다는 기록을 지우지 말고 병기**한다.
  ADR은 결정과 근거의 이력 문서이지 결과만 남기는 문서가 아니다
- 폴링 1회당 커맨드 수가 바뀌면 ADR-004의 Free 한도 비율 표(36~39줄)도 함께 갱신 대상이 된다
- **이 phase에서는 기록하지 않는다.** 값이 없기 때문이며, ADR 갱신은 `phases/10-release/step2.md`의
  작업 범위다. 이 step은 "재는 방법"까지만 만든다

## Acceptance Criteria

```bash
npm run lint
npm test
```

추가로, 문서에 적은 커맨드와 URL이 실제로 유효한지 확인하라:
- `npm test -- src/components/seat/__tests__` (또는 대체 커맨드)가 실제로 step 1·2 테스트를 실행하는가
- 문서에 적은 세션 URL의 세션 ID가 `src/lib/mock-data.ts`에 실재하는가
- (f)에 적은 환경변수 이름이 `.env.example`과 **글자 단위로** 일치하는가
- (f)에 적은 상수 값(`SNAPSHOT_REFETCH_INTERVAL`, `HOLD_TTL_MS`)과 줄 번호가 실제 파일과 일치하는가
- (f)와 (d)가 가리키는 `docs/ADR.md` ADR-004의 줄 번호가 실제 문단을 가리키는가

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 문서만 추가/수정했고 `src/` 프로덕션 코드는 무수정인가?
   - `docs/assets/`가 git에 실제로 추가되는가? (`.gitignore` 확인)
   - 문서에 적은 모든 경로·줄 번호·커맨드가 실재하는가? 추측으로 적은 것이 없는가?
3. 결과에 따라 `phases/11-perf-metrics/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "…"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "…"` 후 즉시 중단

## 금지사항

- 측정 절차에 존재하지 않는 URL·커맨드·파일 경로를 적지 마라. 이유: 이 문서의 목적은 사람이 그대로 따라 하는 것이다. 틀린 경로 하나가 blocked를 재발시킨다. 반드시 실제 파일을 열어 확인하고 적어라.
- 스크린샷 이미지를 생성하거나 위조하지 마라. 이유: 실제 Profiler 화면이어야 한다. `.gitkeep`만 두고 이미지는 사람이 채운다.
- 성능 수치를 이 문서에 적지 마라. 이유: 수치를 문서에 반영하는 것은 step 4의 일이다. 이 step은 "재는 방법"만 적는다.
- Upstash 커맨드 수를 코드 경로에서 유추해 실측값처럼 적지 마라. 이유: ADR-004가 "코드로 센 값"과 "콘솔 과금 단위"를 일부러 구분해 두었고, (f)가 존재하는 이유가 정확히 그 구분이다. 코드로 센 값은 이미 ADR-004에 있으므로 다시 적을 필요도 없다.
- `docs/ADR.md`를 수정하지 마라. 이유: ADR-004 51줄의 갱신에는 실측값이 필요하고, 그 작업은 `phases/10-release/step2.md`의 범위다. 이 step은 그 자리를 **가리키기만** 한다.
- Upstash 콘솔에 접속하거나 개발 서버를 Redis에 붙여 커맨드를 직접 재려 시도하지 마라. 이유: 실행 세션에는 콘솔 자격 증명이 없고, 붙는 데 성공하더라도 측정 트래픽이 Free 한도를 소모하며 사람이 재려는 기준값을 오염시킨다.
- `src/` 아래 프로덕션 코드를 수정하지 마라. 이유: 이 step은 문서 레이어만 다룬다.
- 기존 테스트를 깨뜨리지 마라.

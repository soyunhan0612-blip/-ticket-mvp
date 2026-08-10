# Step 3: measurement-guide

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` — 특히 ADR-002
- `/docs/PROGRESS.md` — Day 3 절의 "before 측정"(94~100줄), Day 4 절의 "after 측정"(129~135줄). 두 절이 참조하는 스크린샷 경로를 확인하라
- `/README.md` — "성능 before / after" 절(52~61줄)
- `/src/components/seat/__tests__/naive-render-count.test.tsx` — **step 1에서 생성됨**
- `/src/components/seat/__tests__/seat-render-count.test.tsx` — **step 2에서 생성됨**
- `/src/hooks/use-seat-snapshot.ts` — 폴링 주기
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
| 초기 마운트 시간 | **수동** | 브라우저 Profiler (아래 절차) |

자동 항목은 "추정이 아니라 테스트가 출력한 값"이라는 점을 명시하라.

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

각 위치의 현재 플레이스홀더 형태가 다르다는 점을 명시하라:
PROGRESS.md는 `**_ ms` / `**_` / `**_ ms**` 형태가 섞여 있고, README.md는 `TBD`다.

**(e) 재현 방법**

자동 측정 항목을 다시 확인하는 커맨드를 적는다:

```bash
npm test -- src/components/seat/__tests__
```

(실제로 동작하는 커맨드인지 실행해 확인하고, 아니면 동작하는 형태로 고쳐 적어라)

## Acceptance Criteria

```bash
npm run lint
npm test
```

추가로, 문서에 적은 커맨드와 URL이 실제로 유효한지 확인하라:
- `npm test -- src/components/seat/__tests__` (또는 대체 커맨드)가 실제로 step 1·2 테스트를 실행하는가
- 문서에 적은 세션 URL의 세션 ID가 `src/lib/mock-data.ts`에 실재하는가

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
- `src/` 아래 프로덕션 코드를 수정하지 마라. 이유: 이 step은 문서 레이어만 다룬다.
- 기존 테스트를 깨뜨리지 마라.

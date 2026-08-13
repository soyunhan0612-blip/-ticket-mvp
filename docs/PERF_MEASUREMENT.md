# 성능 측정 절차

이 문서는 아직 남은 수동 측정을 재현하고 결과를 기록하는 절차만 정의한다. 실측값은 이 문서에 적지 않는다.

## 1. 자동 측정과 수동 측정

| 측정 항목 | 방식 | 근거 위치 |
|---|---|---|
| 좌석 클릭당 React 리렌더 수(before/after) | 자동 | `npm test` — `src/components/seat/__tests__/naive-render-count.test.tsx`, `src/components/seat/__tests__/seat-render-count.test.tsx` |
| 파생 atom 재계산 수 | 자동 | `npm test` — `src/components/seat/__tests__/seat-render-count.test.tsx` |
| 초기 마운트 시간 | **수동** | 브라우저 React DevTools Profiler — 아래 2·3절 |
| 폴링 1회당 Upstash 커맨드 수 | **수동** | Upstash 콘솔 — 아래 6절 |

자동 항목은 예상 규모를 문서에 옮긴 추정값이 아니다. 테스트가 실행 중 렌더와 atom read를 직접 계측하고 assertion으로 검증한 결과다. 초기 마운트 시간은 jsdom에 실제 레이아웃·페인트 비용이 없어 브라우저에서 아직 측정해야 한다. Upstash 커맨드 수 측정은 새 값을 추정하는 작업이 아니라, ADR-004에서 코드 경로로 센 값이 콘솔의 실제 과금 단위와 일치하는지 확인하는 작업이다.

## 2. 현재 구현의 초기 마운트 시간

1. Chrome 또는 Edge에 React DevTools 확장을 설치한다.
2. 저장소 루트에서 `npm run dev`를 실행한다.
3. `http://localhost:3000/sessions/session-01/seats`에 접속한다. `session-01`은 `src/lib/mock-data.ts` 104줄에 있는 시드 세션이다.
4. 개발자 도구의 React `Profiler` 탭에서 `Record`를 누르고 페이지를 새로고침한 뒤 `Stop`을 누른다.
5. 좌석 페이지는 `src/hooks/use-seat-snapshot.ts` 11줄의 설정에 따라 3초마다 스냅샷을 폴링한다. 이때 `SeatMapContainer`·`SeatMap`·`ZoomPanSvg`가 함께 리렌더될 수 있다. 초기 마운트 측정에는 Profiler의 첫 번째 커밋만 사용하고, 이후 약 3초 간격의 커밋은 폴링 영향으로 보고 제외한다.
6. Flamegraph 상단에서 첫 번째 커밋 막대를 선택하고 해당 커밋의 `duration`을 읽는다.
7. 같은 절차를 3회 반복하고 세 값의 중앙값을 사용한다. 단일 측정은 개발 서버 상태와 브라우저 스케줄링에 따른 편차가 크다.
8. 중앙값을 낸 회차의 첫 커밋과 duration이 함께 보이도록 캡처해 `docs/assets/day4-after-profiler.png`에 저장한다. 실제 Profiler 캡처만 저장하며 이미지를 임의로 만들지 않는다.

## 3. Day 3(before) 초기 마운트 시간

Day 3의 순진한 구현은 현재 작업 트리에 없고 커밋 `91713d0`에만 있다. 다음 두 선택지 중 하나를 택한다.

1. 별도 worktree에서 측정한다.

   ```bash
   git worktree add ../ticket-mvp-day3 91713d0
   cd ../ticket-mvp-day3
   npm ci
   npm run dev
   ```

   현재 개발 서버가 실행 중이면 먼저 종료해 포트 충돌을 피한다. 2절과 같은 URL과 3회 중앙값 절차를 사용하고 캡처는 `docs/assets/day3-before-profiler.png`에 저장한다. 측정이 끝난 뒤 원래 저장소에서 `git worktree remove ../ticket-mvp-day3`로 별도 worktree를 정리할 수 있다.

   다만 이 커밋에는 현재 구현의 `ZoomPanSvg`, 서버 hold, 3초 폴링이 없다. 따라서 두 초기 마운트 시간은 동일 조건 비교가 아니며, 결과를 기록할 때 이 차이를 각주로 함께 남긴다.

2. Day 3 초기 마운트 시간을 측정하지 않고 공란으로 둔다.

   조건이 다른 값을 before/after 비교처럼 보이게 하는 대신, 자동화된 클릭당 리렌더 횟수만으로 업데이트 성능 서사를 유지한다.

어느 선택지를 택하든 초기 마운트 비교는 최적화를 증명하는 핵심 수치가 아니다. ADR-002의 입장은 `atomFamily`가 업데이트 시 리렌더 범위를 줄이지만 2,000개 SVG 노드의 초기 마운트 비용은 개선하지 않는다는 것이다. 초기 마운트 시간은 개선을 주장하기 위한 값이 아니라, 개선되지 않은 비용을 정직하게 드러내기 위한 값이다.

## 4. 측정값 기록 위치

줄 번호는 문서를 고칠 때마다 어긋나므로 검색으로 찾는다. 초기 마운트 시간 자리는 세 곳 모두 `TBD` 문자열을 포함한다.

```bash
rg "TBD" README.md docs/PROGRESS.md
```

- `docs/PROGRESS.md` — Day 3 절 "before 측정"의 `초기 마운트 시간` 항목
- `docs/PROGRESS.md` — Day 4 절 "after 측정"의 `초기 마운트 시간` 항목
- `README.md` — "성능 before / after" 표의 `초기 마운트 시간` 행
- `docs/ADR.md` — ADR-004의 “Upstash 콘솔 실측은 아직 못 했다” 문단에 6절 결과를 기록

클릭당 리렌더 수와 파생 atom 재계산 수는 자동 계측값으로 이미 채워져 있으므로 수동 측정의 갱신 대상이 아니다. `docs/ADR.md`에는 플레이스홀더가 없고 위 문장이 그 자리를 대신한다.

## 5. 자동 측정 재현

저장소 루트에서 다음 명령을 실행한다.

```bash
npm test -- src/components/seat/__tests__
```

이 명령은 before와 현재 구현의 계측 테스트를 함께 실행한다. 통과 결과는 추정치가 아니라 각 테스트가 직접 수집한 렌더·atom read 계측값을 검증한 결과다.

## 6. 폴링 1회당 Upstash 커맨드 수

### 확인 대상

`src/services/seat-store-redis.ts`의 `getSnapshot`은 227~260줄에 있다. 코드 경로는 다음 두 갈래다.

1. 230줄의 `HGETALL session:{id}:seats`는 항상 1회 실행된다.
2. 만료된 hold 좌석이 없으면 246줄의 `GET session:{id}:version`이 실행된다. 만료 좌석이 있으면 242줄의 `CLEANUP_EXPIRED_SCRIPT` Lua `EVAL`이 대신 실행된다.

따라서 콘솔에서 확인할 것은 두 가지다.

- 만료 좌석이 없는 평상시 스냅샷 경로가 ADR-004에서 코드로 센 것처럼 실제 2커맨드로 집계되는가
- `EVAL` 1회가 콘솔에서 1커맨드로 집계되는가, 아니면 스크립트 내부의 `redis.call`까지 각각 집계되는가. cleanup 스크립트는 같은 파일 147~167줄에서 `HGET`·`HDEL`·`INCR`·`GET`을 호출한다.

### 사전 조건과 트래픽 격리

1. `.env.local`에 `.env.example` 5·8줄과 글자 단위로 같은 `UPSTASH_REDIS_REST_URL`·`UPSTASH_REDIS_REST_TOKEN`을 설정한다. 둘 다 있어야 `src/services/index.ts` 19줄의 `hasRedisConfig()` 결과로 Redis 구현이 선택된다. 하나라도 없으면 인메모리 Store가 선택되어 Upstash 커맨드가 조용히 0으로 나온다. 환경변수를 바꿨다면 개발 서버를 다시 시작한다.
2. 좌석 페이지는 한 탭만 열고 Admin, 다른 좌석 탭, 다른 브라우저를 모두 닫는다. 로컬 `npm run dev`에서 측정하는 편이 트래픽을 통제하기 쉽다. 단, 로컬과 배포본이 같은 Upstash DB를 사용하면 배포본 방문자의 폴링도 같은 카운터에 섞이므로 사용자가 없는 DB나 시간대를 선택한다.
3. 측정 중 좌석 탭을 전면에 둔다. 백그라운드 탭에서는 폴링이 중단될 수 있다.

### 평상시 폴링 경로 측정

1. `http://localhost:3000/sessions/session-01/seats`를 열고 초기 로드와 기존 만료 좌석 정리가 끝날 때까지 기다린다.
2. 좌석 탭을 백그라운드로 보내 예약된 폴링을 멈추고, 초기 로드 커맨드가 Upstash 콘솔에 반영될 때까지 기다린다. 카운터 반영이 늦으면 몇 분 기다린 뒤 기준값을 적는다. 브라우저 Network 패널도 비우고 `snapshot`으로 필터링한다.
3. 좌석 탭을 다시 전면에 둔 시점부터 정확히 60초 동안 추가 조작 없이 유지하고, 그 구간의 `/api/sessions/session-01/snapshot` 요청 수를 센다. `SNAPSHOT_REFETCH_INTERVAL`은 `src/hooks/use-seat-snapshot.ts` 11줄의 3,000ms이므로 예정된 폴링 횟수는 `60,000ms ÷ 3,000ms = 20회`다. 탭 복귀 시 즉시 재조회가 있으면 그 요청도 Network 패널에서 센 실제 요청 수에 포함한다.
4. 60초가 끝나면 좌석 탭을 바로 닫아 추가 폴링을 멈춘다. 콘솔 지표가 즉시 갱신되지 않으면 몇 분 기다린 뒤 최종 카운터를 읽는다.
5. `최종 카운터 - 기준 카운터`로 증가분을 구하고, `증가분 ÷ Network 패널에서 센 스냅샷 요청 수`로 폴링 1회당 커맨드 수를 계산한다.

### `EVAL` 과금 단위 측정

만료 정리 경로를 그대로 재현하려면 좌석을 hold한 뒤 `src/lib/hold.ts` 1줄의 `HOLD_TTL_MS = 300_000`, 즉 5분을 기다려야 한다. 다음 스냅샷에서 만료 좌석을 발견하면 cleanup `EVAL` 경로가 실행된다. 이 방법을 쓰면 대기 중 평상시 폴링 커맨드가 함께 발생하므로 Network 요청 수와 평상시 측정 결과를 분리해 계산한다.

더 짧게는 `HOLD_SCRIPT`의 `EVAL` 1회를 별도 측정한다. `src/services/seat-store-redis.ts` 199~205줄의 `hold` 구현은 유효한 hold 요청마다 204줄에서 `HOLD_SCRIPT`를 한 번 실행한다. 좌석 화면의 `선택 완료`는 성공 후 스냅샷을 즉시 재조회하므로 단순 카운터 증가분에 그 조회까지 섞인다. `EVAL`만 격리하려면 다음 순서를 사용한다.

1. 좌석 폴링이 없는 `http://localhost:3000/shows`를 열어 익명 사용자 쿠키를 받은 뒤 Upstash 콘솔 기준값을 적는다.
2. 브라우저 Console에서 다음 요청을 한 번만 실행한다. 요청 본문에는 `userId`를 넣지 않으며 기존 HTTP-only 쿠키가 요청에 자동 포함된다.

   ```js
   await fetch("/api/holds", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       sessionId: "session-01",
       seatIds: ["A-1-1"],
     }),
   });
   ```

3. 다른 요청이 없었는지 Network 패널에서 확인한다. 콘솔 반영이 늦으면 몇 분 기다린 뒤 증가분을 읽는다. 좌석 충돌 응답이어도 Redis의 `HOLD_SCRIPT` `EVAL` 자체는 실행된다.
4. 성공한 hold를 정리하려면 결과 기록을 끝낸 뒤 같은 endpoint에 같은 본문으로 `DELETE`를 한 번 보낸다. 이 정리 요청의 커맨드는 측정 구간 밖으로 분리한다.

### 결과 기록

실측 결과는 `docs/ADR.md` ADR-004 51줄의 “Upstash 콘솔 실측은 아직 못 했다” 문단에 기록한다. 실측이 코드로 센 값과 다르면 원래 추정이 틀렸다는 이력을 지우지 않고 두 결과를 함께 남긴다. ADR은 최종 결과만 남기는 문서가 아니라 결정과 근거의 이력이다.

폴링 1회당 커맨드 수가 바뀌면 ADR-004 36~39줄의 Free 한도 비율 표도 함께 갱신한다. 현재 phase에서는 실측값이 없으므로 ADR을 수정하지 않는다. 값 반영은 `phases/10-release/step2.md`의 작업 범위다.

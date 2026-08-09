# Step 6: redis-verify-local

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/PRD.md` — "검증" 절의 수동 시나리오 9종, 특히 8번(Upstash 커맨드 사용량)과 9번(보안 점검)
- `/docs/ARCHITECTURE.md` — Redis 자료구조, 보안 경계
- `/docs/ADR.md` — ADR-004의 커맨드 비용 계산 표, ADR-004a의 잔여 실패 창
- `/src/services/index.ts` — Step 5에서 교체된 팩토리
- `/src/services/seat-store-redis.ts` — Step 2
- `/src/services/show-store-redis.ts` — Step 3
- `/src/services/reservation-store-redis.ts` — Step 4
- `/.env.example` — 필요한 키 이름

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 이 step의 범위

**로컬에서 실제 Upstash에 붙여 검증한다. 배포는 하지 않는다.**

Vercel 배포와 그 검증은 Step 7의 스코프다. **`vercel` CLI를 이 step에서 호출하지 마라.** Vercel 인증 상태와 무관하게 이 step은 끝까지 수행 가능해야 한다.

## 사전 조건

`.env.local`에 다음 두 값이 실제 Upstash 자격증명으로 설정돼 있어야 한다:

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**둘 중 하나라도 없거나 연결이 실패하면 즉시 `status: "blocked"`로 표시하고 중단하라.** `blocked_reason`에 어떤 키가 없는지 또는 어떤 연결 에러가 났는지 구체적으로 적어라. 추측으로 진행하지 마라.

연결 확인은 `PING` 1회로 충분하다.

## 작업

### 1. 실제 Upstash 연결 검증

```bash
npm run dev
```

브라우저를 직접 조작할 수 없으면 `curl`로 대체하라. 어느 쪽이든 **실제로 실행한 결과만** 기록한다.

- `/shows`에 시드 공연 8개가 보인다 (Redis 시드 주입 성공)
- 회차 → 좌석 페이지 진입, 좌석 선택 → `선택 완료` → 홀드 성립
- 예매 확정 → `/reservations`에 예매가 보인다
- 취소 → 좌석맵에서 해당 좌석이 다시 선택 가능해진다

**`/shows`를 먼저 방문하지 않은 상태에서** `/api/sessions/session-01/snapshot`을 직접 쳐라. Step 3의 시드 지연 초기화가 `getBySessionId` 경로에서도 동작하는지 확인하는 것이다.

### 2. 영속성 검증 — 인메모리와의 결정적 차이

**개발 서버를 완전히 종료했다가 다시 띄운 뒤** 확인한다:

- `/reservations`의 예매 내역이 **그대로 남아 있다**
- 셀러가 등록했던 공연이 `/shows`에 **그대로 남아 있다**
- 홀드 중이던 좌석이 만료 전이라면 여전히 홀드 상태다

인메모리 구현에서는 이 모든 것이 사라진다. 남아 있다면 교체가 실제로 동작한 것이다.

**시드 멱등성도 함께 확인하라.** 재시작 후 `/shows`의 공연이 8개 + 셀러 등록분이어야 한다. 16개로 늘었다면 시드가 중복 주입된 것이다.

### 3. 동시성 검증 — Lua 원자성의 실증

탭 2개(또는 서로 다른 쿠키를 쓴 `curl` 두 세션)로 같은 회차를 연다:

- A에서 좌석 3개를 홀드 → 3~4초 안에 B의 스냅샷에서 회색으로 바뀐다
- B에서 **겹치는 좌석을 포함해** 여러 좌석을 홀드 시도 → 409 → 전체 롤백
- **겹치지 않은 좌석도 부분 홀드되지 않았는지 스냅샷으로 확인하라.** 이것이 Lua 원자성의 실증이며 이 phase의 핵심 주장이다

`curl`로 할 경우 쿠키 두 개를 각각 `-b "userId=..."`로 나눠 쓰면 된다.

### 4. Upstash 커맨드 사용량 확인 (PRD 검증 시나리오 8)

Upstash 콘솔에서 커맨드 사용량을 확인한다:

- 좌석 페이지를 열어둔 채 폴링이 몇 회 돌게 두고, 스냅샷 폴링 1회가 **`HGETALL` 1회** 수준인지 본다
- Lua 내부 명령을 포함한 실제 과금 단위가 ADR-004의 예상(폴링 1회 = 1 커맨드)과 맞는지 확인한다
- **실측치를 summary에 기록하라. 예상과 다르면 그 사실을 정직하게 적어라**

콘솔 UI에 접근할 수 없으면 폴링 전후의 커맨드 카운터 차이를 다른 방법으로 재거나, 잴 수 없었다고 정직하게 기록하라. **추정치를 실측인 것처럼 쓰지 마라.**

### 5. 보안 점검 (PRD 검증 시나리오 9)

```bash
# 남의 userId가 응답에 없는지
curl -s -b "userId=test-user" http://localhost:3000/api/sessions/session-01/snapshot | grep -o userId || echo "OK: no userId"

# 4석 상한이 서버에서 강제되는지 (10석 요청 → 400)
curl -s -X POST http://localhost:3000/api/holds \
  -H "Content-Type: application/json" -b "userId=test-user" \
  -d '{"sessionId":"session-01","seatIds":["A-1-1","A-1-2","A-1-3","A-1-4","A-1-5","A-1-6","A-1-7","A-1-8","A-1-9","A-1-10"]}'

# 클라이언트 번들에 자격증명 문자열이 없는지
npm run build
grep -rl "UPSTASH\|ANTHROPIC" .next/static/ && echo "!!! LEAK !!!" || echo "OK: no leak in client bundle"
```

- 시크릿 창에서 `/admin`과 `/seller/new` 접근 시 Basic Auth를 요구하는지 확인
- 남의 홀드를 release 시도 → 403인지 확인
- 남의 예약을 cancel 시도 → 403인지 확인

## Acceptance Criteria

```bash
npm run lint
npm test
npm run build
```

수동 검증 결과는 summary에 기록한다. **위 1~5의 각 항목에 대해 통과/실패/미확인을 명시하라.** 미확인 항목이 있어도 그 사실을 적으면 `completed`로 처리할 수 있다 — 단, 무엇을 확인하지 못했는지 반드시 남겨라.

## 검증 절차

1. 위 AC 커맨드를 실행하고 수동 시나리오를 수행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/9-redis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - **Upstash 자격증명이 없거나 연결 실패** → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 자격증명이 없는 상태에서 검증을 통과한 것처럼 기록하지 마라. 이유: 이 step의 존재 이유가 "실제로 붙는지" 확인하는 것이다. 확인하지 못했으면 `blocked`가 정직한 결과다
- 실측하지 않은 커맨드 사용량 수치를 지어내지 마라. 이유: ADR-004의 비용 계산이 이 프로젝트의 판단 근거로 문서화돼 있다. 검증되지 않은 숫자를 적으면 문서 전체의 신뢰가 무너진다
- `vercel` CLI를 호출하지 마라. 이유: 배포는 Step 7의 스코프다. 이 step은 Vercel 인증 없이도 완주 가능해야 한다
- Vercel 인증 불가를 이유로 이 step을 `blocked`로 만들지 마라. 이유: 이 step에는 Vercel이 전혀 필요 없다
- `NEXT_PUBLIC_UPSTASH_*`로 환경변수를 설정하지 마라. 이유: 브라우저 번들에 토큰이 평문으로 들어간다 (CLAUDE.md CRITICAL)
- `.env.local`이나 실제 자격증명을 커밋하지 마라. 이유: `.gitignore`가 `.env*`를 막고 있다. 우회하지 마라
- 검증 중 발견한 버그를 이 step에서 대규모로 고치지 마라. 이유: 이 step은 검증이다. 버그를 발견하면 summary에 기록하고, 사소한 수정이 아니면 별도 작업으로 남겨라
- 소스 코드의 store 구현을 크게 바꾸지 마라. 이유: Step 2~5에서 확정된 산출물이다. 변경이 필요하면 그 step의 계약 위반이므로 원인을 기록하라
- 기존 테스트를 깨뜨리지 마라

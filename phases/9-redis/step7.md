# Step 7: redis-deploy

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/PRD.md` — Day 9의 최종 검증 조건
- `/docs/ARCHITECTURE.md` — 보안 경계
- `/README.md` — 배포 URL과 심사자 안내
- `/.env.example` — 필요한 키 이름
- `/phases/9-redis/step6.md` — Step 6에서 이미 검증한 항목 (중복 수행하지 않기 위해)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 이 step의 범위

**Vercel 배포와 배포본 검증, README 갱신.** 로컬 기능 검증은 Step 6에서 이미 끝났다. 여기서는 **배포본에서도 같은 결과가 나오는지**만 확인한다.

## 사전 조건

Vercel CLI 인증이 완료돼 있어야 한다:

```bash
vercel whoami
```

**`Not authorized`가 반환되면 즉시 `status: "blocked"`로 표시하고 중단하라.** `blocked_reason`에 `vercel login`이 필요하다고 적어라. 사용자가 직접 인증해야 하는 항목이며 추측으로 우회할 수 없다.

Step 6이 `completed`가 아니면 이 step을 시작하지 마라.

## 작업

### 1. Vercel 프로젝트 환경변수 설정

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`을 Vercel 프로젝트 환경변수로 설정한다
- **`NEXT_PUBLIC_` 접두사를 붙이지 마라** (CLAUDE.md CRITICAL — 브라우저 번들에 평문 유출)
- Production 환경에 설정한다. Preview에도 넣을지는 판단에 맡긴다
- 기존 AI 키(`ANTHROPIC_API_KEY` 등)와 Basic Auth 관련 변수가 이미 설정돼 있는지 함께 확인하라. 없으면 배포본에서 셀러 AI 설명과 `/admin`이 동작하지 않는다

### 2. 재배포

```bash
vercel --prod
```

배포가 실패하면 빌드 로그를 읽고 원인을 기록하라. 환경변수 누락이 원인이면 1번으로 돌아간다.

### 3. 배포본 검증

배포 URL에서 확인한다:

- `/shows`에 시드 공연 8개가 보인다
- 좌석 페이지 진입 → 홀드 → 예매 확정 → `/reservations`에 보인다
- 취소 → 좌석이 다시 선택 가능해진다
- `/admin`과 `/seller/new`가 Basic Auth를 요구한다

### 4. 배포 간 영속성 검증 (PRD Day 9의 최종 검증 조건)

**한 번 더 재배포한 뒤** 확인한다:

- 앞 단계에서 만든 예매가 **그대로 남아 있다**
- 셀러가 등록한 공연이 **그대로 남아 있다**
- 시드 공연이 8개 그대로다 (재배포로 중복 주입되지 않았다)

이것이 Day 9의 핵심 주장이다. **인메모리였다면 배포마다 전부 사라진다.** 남아 있다면 Redis 전환이 실제로 완결된 것이다.

### 5. 배포본 보안 점검

```bash
# 남의 userId가 응답에 없는지
curl -s -b "userId=test-user" https://<배포URL>/api/sessions/session-01/snapshot | grep -o userId || echo "OK: no userId"

# 4석 상한이 서버에서 강제되는지
curl -s -X POST https://<배포URL>/api/holds \
  -H "Content-Type: application/json" -b "userId=test-user" \
  -d '{"sessionId":"session-01","seatIds":["A-1-1","A-1-2","A-1-3","A-1-4","A-1-5","A-1-6","A-1-7","A-1-8","A-1-9","A-1-10"]}'
```

배포본 클라이언트 번들에 자격증명이 없는지도 확인하라. 브라우저 devtools의 Sources에서 `UPSTASH`를 검색하거나, 배포된 정적 청크를 받아 `grep`한다.

### 6. README 갱신

- 심사자용 Basic Auth 계정 안내가 있는지 확인하고, 없으면 추가한다
- **영속성이 Redis로 전환됐음을 반영한다.** 재배포해도 데이터가 남는다는 점을 명시하라
- 배포 URL이 최신인지 확인한다
- Day 3의 순진한 좌석 구현 → atomFamily 최적화 서사가 README에 있다면, 커밋 해시가 여전히 유효한지 확인하라

## Acceptance Criteria

```bash
npm run lint
npm test
npm run build
```

배포 URL과 수동 검증 결과는 summary에 기록한다. **위 1~6의 각 항목에 대해 통과/실패/미확인을 명시하라.**

## 검증 절차

1. 위 AC 커맨드를 실행하고 배포 검증을 수행한다.
2. 아키텍처 체크리스트를 확인한다:
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (특히 `NEXT_PUBLIC_` 접두사)
3. 결과에 따라 `phases/9-redis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "배포 URL과 검증 결과"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - **Vercel 인증 필요** → `"status": "blocked"`, `"blocked_reason": "vercel login 필요"` 후 즉시 중단

## 금지사항

- `NEXT_PUBLIC_UPSTASH_*`로 환경변수를 설정하지 마라. 이유: 브라우저 번들에 토큰이 평문으로 들어간다 (CLAUDE.md CRITICAL)
- 배포하지 않고 배포에 성공한 것처럼 기록하지 마라. 이유: 이 step의 존재 이유가 배포본 검증이다
- 실제로 확인하지 않은 배포본 동작을 통과로 적지 마라. 이유: Step 6의 로컬 결과와 배포본 결과는 다를 수 있다. 환경변수 누락은 로컬에서 드러나지 않는다
- `.env.local`이나 실제 자격증명을 커밋하지 마라. 이유: `.gitignore`가 `.env*`를 막고 있다. 우회하지 마라
- 배포 중 발견한 버그를 이 step에서 대규모로 고치지 마라. 이유: 이 step은 배포와 검증이다. 버그는 summary에 기록하고 별도 작업으로 남겨라
- 소스 코드의 store 구현을 크게 바꾸지 마라. 이유: Step 2~5에서 확정된 산출물이다
- 기존 테스트를 깨뜨리지 마라

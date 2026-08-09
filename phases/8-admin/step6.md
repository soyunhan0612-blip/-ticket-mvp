# Step 6: progress-backfill

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/PROGRESS.md` — 수정 대상. 특히 Day 3·Day 4 섹션의 구조와 문체
- `/docs/ADR.md` — ADR-002 (before/after 서사의 정직성 규칙)
- `/docs/PRD.md` — Day 5~9 계획
- `/phases/4-server-hold/index.json` — Day 5 서사의 1차 소스 (step summary 7건)
- `/phases/5-polling-optimistic/index.json` — Day 6 서사의 1차 소스 (step summary 7건)
- `/phases/6-reservation/index.json` — Day 7 서사의 1차 소스 (step summary 5건)
- `/phases/7-seller-ai/index.json` — Day 8 서사의 1차 소스 (step summary 7건)
- `/phases/8-admin/index.json` — Day 9 서사의 1차 소스 (이번 phase의 step summary)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

`docs/PROGRESS.md`는 Day 4(phase 3)까지만 기록돼 있고 마지막 줄이 `## Day 5~9 — (예정)`이다. 그 사이 phase 4~7(Day 5~8)이 모두 완료됐고, 이번 phase에서 Day 9의 Admin 부분까지 끝났다. 서사 저널이 4일치 뒤처져 있다.

## 작업

### 1. Day 5~8 backfill

`## Day 5~9 — (예정)` 줄을 실제 섹션들로 교체한다. Day 3·Day 4 섹션의 구조를 그대로 따르라:

```
## Day N — 제목

### 기능적 관점
### 기술적 관점
### 아키텍처 관점
### 결정 근거
### 참조
```

각 Day의 내용은 해당 phase의 `index.json` step summary와 실제 소스 코드에서 끌어와라. **추측하지 마라 — 코드를 읽고 써라.**

- **Day 5 (phase `4-server-hold`)**: `lib/hold.ts` 만료 판정, `lib/cookie.ts`, `services/seat-store-memory.ts` 원자적 다중 좌석 hold, `middleware.ts` 익명 UUID 쿠키 발급, zod 도입, `POST/DELETE /api/holds`, `GET /api/sessions/[id]/snapshot`
- **Day 6 (phase `5-polling-optimistic`)**: `syncSnapshotAtom`의 version 기반 갱신 생략, `useSeatSnapshot` 3초 폴링, `useHoldMutation` 낙관적 업데이트 + 409 전체 롤백, RSC prefetch + `HydrationBoundary`, `HoldTimer`의 `serverNow` 시계 보정, 충돌 토스트
- **Day 7 (phase `6-reservation`)**: `confirmSeats`/`releaseSold`/`revertSold` 추가, `ReservationStore`, 예매 API 3종(403/409/410 분기), `ConfirmBar`, `/reservations` 페이지
- **Day 8 (phase `7-seller-ai`)**: 좌석 프리셋 3종, `ShowStore.create`, 포스터 프리셋, Basic Auth 미들웨어, `POST /api/shows`, AI 설명 스트리밍 API(rate limit·프롬프트 인젝션 방어·fallback), 셀러 등록 UI

"결정 근거" 절에는 **왜 그렇게 했는지**를 적어라. 기존 섹션들이 "왜 일부러 순진하게 만들었나", "왜 Seat 내부에서 toggleSeatAtom을 직접 호출하나" 같은 형식으로 쓰여 있다. 이 저널의 가치는 그 부분에 있다.

### 2. Day 9 (Admin) 섹션 추가

이번 phase(`8-admin`)의 산출물을 기록한다:
- `lib/seat-layout.ts` 추출과 프리셋별 구역 배치 대응
- `ZoomPanSvg` — viewBox 기반 줌/팬, 드래그와 클릭의 구분
- `AI_MODEL` ID 수정
- `GET /api/admin/stats` — 스냅샷 파생 집계, `isProtectedPath`에 `/api/admin` 추가
- `/admin` 읽기 전용 좌석맵 + 숫자 카드 4개

**Redis 교체(phase 9)는 아직 안 끝났다.** Day 9 섹션에 Redis를 완료된 것처럼 쓰지 마라. 남은 작업으로 명시하라.

### 3. Day 3/4 성능 수치 — 그대로 둔다

Day 3·Day 4 섹션에 있는 다음 플레이스홀더를 **절대 임의의 숫자로 채우지 마라**:

```
- 초기 마운트 시간: **_ ms
- 좌석 1회 클릭 시 리렌더 컴포넌트 수: **_
```

이 수치는 사람이 브라우저 React DevTools Profiler로 측정해야 한다. 측정 절차와 "사람이 채운다"는 안내 문구가 이미 적혀 있으므로 그대로 보존하라.

다만 이번 phase에서 `ZoomPanSvg`가 좌석맵 구조를 바꿨으므로, **Day 9 섹션에 "줌/팬 도입 후 클릭당 리렌더 수 재측정이 필요하다"는 항목을 추가하라.** 측정되지 않은 상태임을 정직하게 남기는 것이 목적이다.

## Acceptance Criteria

```bash
npm run lint
npm test
```

문서만 수정하는 step이므로 코드 테스트는 회귀 확인 용도다.

추가 확인:
- `docs/PROGRESS.md`에 `Day 5`, `Day 6`, `Day 7`, `Day 8`, `Day 9` 섹션이 모두 존재한다
- `(예정)` 문구가 Day 5~8에는 남아 있지 않다
- Day 3·Day 4의 `**_` 플레이스홀더가 그대로 남아 있다

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

- Day 3/4의 성능 수치 플레이스홀더를 채우지 마라. 이유: ADR-002가 이 프로젝트의 정량 증거로 지목한 항목이다. 측정하지 않은 숫자를 쓰면 면접에서 그 자리에서 깨진다. "과장하면 면접에서 그 자리에서 깨진다"는 ARCHITECTURE.md의 문장이 정확히 이 상황을 가리킨다
- 측정하지 않은 성능 수치를 새로 만들어내지 마라. 이유: 위와 동일
- Redis 교체를 완료된 것으로 기술하지 마라. 이유: phase 9가 아직 실행되지 않았다. 문서가 코드보다 앞서가면 저널의 신뢰가 무너진다
- 소스 코드를 수정하지 마라. 이유: 이 step은 문서 전용이다. 코드 변경이 섞이면 커밋 서사가 흐려진다
- phase index.json들의 기존 summary를 수정하지 마라. 이유: 하네스 실행 기록이다
- 기존 Day 0~4 섹션의 내용을 재작성하지 마라. 이유: 이미 그 시점의 판단이 기록된 문서다. Day 5 이후만 추가한다
- 기존 테스트를 깨뜨리지 마라

# Step 4-2: deploy-verify

## 읽어야 할 파일

- `/docs/PRD.md` — 검증 시나리오 전체 (9개 항목)
- `/docs/ARCHITECTURE.md` — 보안 경계 재확인
- `/CLAUDE.md` — CRITICAL 규칙 최종 재검토
- 이전 step 산출물: `src/services/*-store-redis.ts`, `src/services/index.ts`

## 작업

Redis + Basic Auth + AI 키 환경변수를 Vercel에 채우고 재배포. 배포본에서 PRD의 9개 검증 시나리오를 통과.

### 1. Vercel 환경변수 설정 (사용자 개입)

Vercel 대시보드에서 (또는 `vercel env add`):
- `STORE_BACKEND=redis`
- `UPSTASH_REDIS_REST_URL=<...>`
- `UPSTASH_REDIS_REST_TOKEN=<...>`
- `ANTHROPIC_API_KEY=<...>` (선택 — 없어도 fallback)
- `BASIC_AUTH_USER=<...>`
- `BASIC_AUTH_PASS=<...>`

**`NEXT_PUBLIC_` 접두사 절대 X** (CLAUDE.md CRITICAL 재확인).

### 2. 재배포

`vercel --prod` 또는 GitHub 연동 시 push 후 자동 배포.

### 3. 배포본 검증 — PRD 검증 시나리오 9개 실행

전부 실행하고 각각 pass/fail을 `docs/perf/deploy-verification.md`에 기록:

1. 목록 → 상세 → 회차 → 좌석. **페이지 소스에 공연 데이터 포함** (RSC 검증)
2. 탭 2개로 같은 회차. A에서 3좌석 → 3~4초 안에 B에서 회색화
3. B에서 겹치는 좌석 포함 hold → 409 + 롤백 + 토스트, 부분 hold 없음
4. A에서 타이머 만료 대기 → 좌석 자동 반환
5. 예매 확정 → 내역 → 새로고침 → 유지 → 취소 → 좌석맵 복구
6. 셀러 등록 → AI 스트리밍(키 있음/없음 둘 다) → 목록에 반영
7. Admin에서 1~5 조작이 3~4초 안에 반영
8. **Upstash 콘솔 커맨드 사용량 확인** — 스냅샷 폴링 1회가 HGETALL 1회
9. **보안 점검**
   - 폴링 응답 네트워크 탭에 남의 userId 없음
   - `curl`로 좌석 10개 hold 시도 → 4석 상한으로 거절
   - 다른 브라우저에서 남의 hold release 시도 → 403
   - JS 번들에서 `ANTHROPIC`/`UPSTASH` 검색 → 없음
   - 시크릿 창 `/admin` → 401

### 4. **재배포 데이터 지속성 검증**

- 좌석 hold + 예매 확정 후
- Vercel에서 재배포(같은 커밋 재트리거)
- 재접속 시 예약·좌석 sold 상태가 유지되는지 확인 (Redis 영속화 증거)

## Acceptance Criteria

```bash
# 로컬에서는 스모크만
STORE_BACKEND=redis UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... npm run build
# 배포본 검증은 수동 시나리오
```

수동 (배포본):
- 위 9개 시나리오 전부 pass
- 재배포 후 데이터 지속성 pass

## 검증 절차

1. 로컬 빌드 (env 세팅 시) 통과.
2. 아키텍처 체크리스트:
   - Vercel env에 `NEXT_PUBLIC_` 접두사 사용 없음?
   - `STORE_BACKEND=redis` 반영 (배포본 로그에서 확인)?
   - Upstash 콘솔에서 스냅샷당 HGETALL 1회 확인?
   - JS 번들에 시크릿 없음?
3. 결과에 따라 `phases/4-redis-admin-docs/index.json`의 step 2를 업데이트:
   - 성공 → `"summary": "Vercel 재배포 + 9개 시나리오 pass + 재배포 지속성 확인. 배포 URL: <url>"`
   - Vercel 접근 필요 → blocked: `"Vercel 대시보드 환경변수 설정 필요. 사용자가 Upstash/Anthropic/Basic Auth 값 세팅 후 재배포"`

## 금지사항

- `NEXT_PUBLIC_UPSTASH_*`, `NEXT_PUBLIC_ANTHROPIC_*` 만들지 마라. 이유: 즉시 시크릿 유출 (CLAUDE.md CRITICAL)
- 개발용 mock 데이터를 Redis에 씨드하지 마라. 이유: mock 시드는 이미 코드에 있음. Redis에 중복 저장하면 삭제 시 원상복구 어려움
- Vercel 배포 자동화를 위해 CI에 프로덕션 시크릿 하드코딩 마라. GitHub Secrets 사용
- 검증 시나리오 중 하나라도 실패한 채 completed로 마크 마라. 반드시 error/blocked로 표시하고 원인 기록
- `.vercel/`을 커밋 마라 (이미 gitignore)
- 기존 테스트를 깨뜨리지 마라

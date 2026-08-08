# Step 6: api-snapshot

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 폴링 페이로드 섹션, 데이터 흐름
- `/src/app/api/shows/[id]/route.ts` — 동적 라우트 handler 패턴 (params 처리 방식)
- `/src/app/api/shows/[id]/route.test.ts` — 동적 라우트 test 패턴
- `/src/services/seat-store.ts` — Step 2에서 생성됨. SeatStore.getSnapshot 시그니처
- `/src/services/index.ts` — getSeatStore() 팩토리
- `/src/lib/cookie.ts` — Step 1에서 생성됨. getUserIdFromRequest
- `/src/types/index.ts` — SeatSnapshot 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/app/api/sessions/[id]/snapshot/route.ts`를 TDD로 구현한다.

### GET /api/sessions/[id]/snapshot

처리 흐름:
1. URL 경로에서 `id` (sessionId) 추출 — 기존 `shows/[id]` route의 params 처리 방식 참조
2. `getUserIdFromRequest(request)` → null이면 401 반환
3. `getSeatStore().getSnapshot(sessionId, userId)` 호출
4. 200 + SeatSnapshot 반환 (`{ version, serverNow, seats }`)

### TDD 순서

테스트 파일 `src/app/api/sessions/[id]/snapshot/route.test.ts`를 **반드시 먼저** 작성한다.

테스트에서 store 상태를 셋업하려면 `getSeatStore()`로 store 인스턴스를 가져와 `hold()`를 먼저 호출한다. 각 테스트 간 store 상태 격리를 위해 고유한 sessionId를 사용한다.

테스트 케이스:
1. 빈 세션 스냅샷 → 200, seats가 빈 객체, version과 serverNow 존재
2. hold 후 본인 조회 → 해당 좌석에 mine: true
3. hold 후 타인 조회 → 해당 좌석에 mine 없음 (또는 false)
4. userId 쿠키 없음 → 401

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - userId를 쿠키에서만 읽는가?
   - 응답에 타인의 userId가 노출되지 않는가? (mine: boolean으로만)
   - SeatSnapshot 형식(version, serverNow, seats)을 따르는가?
   - 점유 좌석만 seats에 포함되는가? (available은 미포함)
3. 결과에 따라 `phases/4-server-hold/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 응답에 userId를 싣지 마라.
- 2000석 전체 상태를 보내지 마라. 점유 좌석만 보낸다.
- `export const dynamic = 'force-dynamic'`을 이 API route에 넣지 마라. 이유: API route는 기본적으로 dynamic이다.
- 기존 테스트를 깨뜨리지 마라.

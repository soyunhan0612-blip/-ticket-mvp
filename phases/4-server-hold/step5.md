# Step 5: api-holds

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙 (서버 검증, userId 쿠키, 소유권 검증)
- `/docs/ARCHITECTURE.md` — 데이터 흐름 섹션
- `/src/app/api/shows/[id]/route.ts` — 기존 route handler 패턴
- `/src/app/api/shows/[id]/route.test.ts` — 기존 route test 패턴 (`new Request(...)` 방식)
- `/src/services/seat-store.ts` — Step 2에서 생성됨. SeatStore 인터페이스
- `/src/services/seat-store-memory.ts` — Step 2에서 생성됨. 인메모리 구현체
- `/src/lib/cookie.ts` — Step 1에서 생성됨. getUserIdFromRequest
- `/src/lib/seat-rules.ts` — validateSelection (서버 재검증에 사용)
- `/src/lib/seat-map.ts` — isValidSeatId

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/app/api/holds/route.ts`를 TDD로 구현한다.

### POST /api/holds — 좌석 hold 요청

요청 바디:
```json
{
  "sessionId": "session-01",
  "seatIds": ["A-1-1", "A-1-2"]
}
```

처리 흐름:
1. `getUserIdFromRequest(request)` → null이면 401 반환
2. zod로 바디 검증: `sessionId`는 비어있지 않은 문자열, `seatIds`는 비어있지 않은 문자열 배열
3. `validateSelection(seatIds)` — 서버 재검증. ok가 false면 400 반환 (reason 포함)
4. `getSeatStore().hold(sessionId, seatIds, userId)` 호출
5. 결과가 Hold이면 201 + `{ hold: { id, sessionId, seatIds, expiresAt } }` (userId 제외!)
6. 결과가 conflict이면 409 + `{ error: "conflict", conflict: [...충돌 좌석 ID] }`

### DELETE /api/holds — 좌석 release 요청

요청 바디:
```json
{
  "sessionId": "session-01",
  "seatIds": ["A-1-1", "A-1-2"]
}
```

처리 흐름:
1. `getUserIdFromRequest(request)` → null이면 401 반환
2. zod로 바디 검증
3. seatIds의 각 좌석 ID가 유효한지 검증 (`isValidSeatId` 체크) → 무효한 seatId 있으면 400
4. `getSeatStore().release(sessionId, seatIds, userId)` 호출
5. release가 "FORBIDDEN" 에러를 throw하면 403 반환
6. 성공 시 204 (No Content)

### TDD 순서

테스트 파일 `src/app/api/holds/route.test.ts`를 **반드시 먼저** 작성한다.

테스트에서는 route handler 함수를 직접 import하고, `new Request(...)` 객체에 Cookie 헤더를 수동으로 설정한다:

```ts
const request = new Request("http://localhost/api/holds", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "userId=test-user-1",
  },
  body: JSON.stringify({ sessionId: "session-01", seatIds: ["A-1-1"] }),
});
```

테스트 케이스:

**POST:**
1. 정상 hold → 201, hold 객체에 id/sessionId/seatIds/expiresAt 포함, userId 미포함
2. userId 쿠키 없음 → 401
3. 바디 없음/잘못된 형식 → 400
4. 좌석 ID 유효성 실패 (예: "Z-99-99") → 400
5. 좌석 수 초과 (5석) → 400
6. 충돌 (이미 다른 사용자가 hold) → 409 + conflict 좌석 목록
7. 다중 좌석 중 하나 충돌 → 전체 409 (부분 hold 없음)

**DELETE:**
8. 정상 release → 204
9. userId 쿠키 없음 → 401
10. 남의 좌석 release → 403
11. 잘못된 바디 → 400

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - userId를 요청 바디/쿼리에서 절대 읽지 않는가? (쿠키에서만)
   - 응답에 userId를 싣지 않는가?
   - `lib/seat-rules.ts`의 `validateSelection`을 서버에서 호출하는가?
   - 좌석 ID 유효성을 `lib/seat-map.ts`의 `isValidSeatId`로 검증하는가?
   - zod로 바디를 검증하는가?
   - release 시 소유권 불일치를 403으로 처리하는가?
   - 다중 좌석 충돌 시 전체 실패(409)이고 부분 hold가 없는가?
3. 결과에 따라 `phases/4-server-hold/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- userId를 요청 바디에서 읽지 마라. 이유: IDOR 방지 (CLAUDE.md CRITICAL 규칙).
- 응답에 userId를 포함하지 마라. 이유: 신원 탈취 방지.
- `validateSelection`을 route handler에서 재구현하지 마라. `lib/seat-rules.ts`를 import하여 재사용하라.
- DELETE 응답에 바디를 넣지 마라. 204 No Content.
- 기존 테스트를 깨뜨리지 마라.

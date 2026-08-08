# Step 2: reservation-api — API Routes

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — API 설계, userId 쿠키 정책, 보안 규칙
- `/CLAUDE.md` — CRITICAL 규칙 (userId 쿠키 전용, 응답에 userId 금지, 서버 재검증)
- `/src/app/api/holds/route.ts` — 기존 API 패턴 (zod 검증, getUserIdFromRequest, 에러 핸들링)
- `/src/app/api/holds/route.test.ts` — 기존 API 테스트 패턴 (route handler 직접 import, new Request, cookie 헤더)
- `/src/services/reservation-store.ts` — ReservationStore 인터페이스 (Step 1에서 생성됨)
- `/src/services/index.ts` — getReservationStore() 팩토리 (Step 1에서 추가됨)
- `/src/lib/cookie.ts` — getUserIdFromRequest
- `/src/lib/seat-rules.ts` — validateSelection (서버 재검증용)
- `/src/lib/seat-map.ts` — isValidSeatId
- `/src/types/index.ts` — Reservation 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. POST/GET `/api/reservations` 테스트 (`src/app/api/reservations/route.test.ts` 생성)

기존 `holds/route.test.ts` 패턴을 따른다. route handler를 직접 import하고, `new Request()`로 호출한다. cookie 헤더에 `userId=test-user-id`를 설정한다.

**POST 테스트:**
- hold 상태 좌석으로 예매 생성 성공 (201)
- 응답에 userId 필드가 없다
- 쿠키 없으면 401
- 잘못된 body면 400
- 좌석 규칙 위반 시 400 (빈 배열, 5석 이상 등)
- hold 만료 시 410
- 남의 hold에 대해 403

**GET 테스트:**
- 내 예매 목록 반환 (200)
- 쿠키 없으면 401
- 응답의 각 reservation에 userId 필드가 없다

### 2. POST/GET 구현 (`src/app/api/reservations/route.ts` 생성)

**POST /api/reservations:**
- Request body: `{ sessionId: string, seatIds: string[] }` (zod 검증)
- `getUserIdFromRequest(request)`로 userId 추출. 없으면 401
- `validateSelection(seatIds)` 서버 재검증. 실패 시 400
- `getReservationStore().create(sessionId, seatIds, userId)` 호출
- 성공: 201 + `{ reservation: { id, sessionId, seatIds, status, createdAt } }` — **userId 제외**
- FORBIDDEN 에러: 403
- EXPIRED 에러: 410
- 기타 에러: 500

**GET /api/reservations:**
- `getUserIdFromRequest(request)`로 userId 추출. 없으면 401
- `getReservationStore().listByUser(userId)` 호출
- 200 + `{ reservations: [...] }` — 각 항목에서 **userId 제외**

### 3. DELETE `/api/reservations/[id]` 테스트 (`src/app/api/reservations/[id]/route.test.ts` 생성)

**DELETE 테스트:**
- 예매 취소 성공 (200)
- 응답에 userId 필드가 없다
- 쿠키 없으면 401
- 남의 예매 취소 시 403
- 이미 취소된 예매에 409
- 존재하지 않는 예매에 404

### 4. DELETE 구현 (`src/app/api/reservations/[id]/route.ts` 생성)

**DELETE /api/reservations/[id]:**
- URL params에서 `id` 추출
- `getUserIdFromRequest(request)`로 userId 추출. 없으면 401
- `getReservationStore().cancel(id, userId)` 호출
- 성공: 200 + `{ reservation: { id, sessionId, seatIds, status, createdAt } }` — **userId 제외**
- FORBIDDEN 에러: 403
- ALREADY_CANCELLED 에러: 409
- NOT_FOUND 에러: 404

### Reservation 직렬화 헬퍼

응답에서 userId를 제거하는 헬퍼를 route 파일 안에 만든다:

```typescript
function sanitizeReservation(r: Reservation) {
  const { userId, ...rest } = r;
  return rest;
}
```

## Acceptance Criteria

```bash
npx vitest run src/app/api/reservations/
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 기존 테스트도 깨지지 않았는지 확인한다: `npm run test`
3. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - userId는 쿠키에서만 읽는가?
   - 응답에 userId가 포함되지 않는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
4. 결과에 따라 `phases/6-reservation/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- Store 구현을 수정하지 마라. 이유: Step 0, 1에서 완성되었다
- 클라이언트 컴포넌트나 hooks를 만들지 마라. 이유: Step 3, 4의 스코프이다
- 응답 body에 userId를 포함하지 마라. 이유: CLAUDE.md CRITICAL 규칙 위반
- 요청 body나 query string에서 userId를 읽지 마라. 이유: IDOR 취약점
- 기존 테스트를 깨뜨리지 마라

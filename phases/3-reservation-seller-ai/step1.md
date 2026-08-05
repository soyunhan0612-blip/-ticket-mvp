# Step 3-1: reservation-ui

## 읽어야 할 파일

- `/CLAUDE.md` — userId 쿠키 규칙
- `/docs/ARCHITECTURE.md` — 데이터 흐름 (confirm → ReservationStore)
- `/docs/PRD.md` — Day 7 검증 시나리오
- 이전 step 산출물: `src/services/reservation-store-memory.ts`, `src/services/index.ts` (팩토리)
- Phase 2 산출물: `src/components/seat/SelectionBar.tsx`, `src/lib/session-user.ts`

## 작업

예약 확정 route + 내역 페이지 + 취소 흐름.

### 1. `src/app/api/reservations/route.ts`

**tdd-guard 대상. 테스트 먼저**.

```ts
// POST /api/reservations
// body: { sessionId: string, seatIds: string[] }
// resp 200: Reservation (userId 필드 제거된 형태)
// resp 400/403/409/401 표준화
export async function POST(req: Request): Promise<Response>;

// GET /api/reservations
// resp 200: Reservation[]
export async function GET(req: Request): Promise<Response>;
```

- `userId`는 `getUserId()` (쿠키)
- POST는 zod 검증 → ReservationStore.create 호출 → 200 반환
- 응답 시 `userId` 필드 제거하고 `mine: true` 대체 (직접 조회한 본인 예약이므로 항상 true)

### 2. `src/app/api/reservations/[id]/route.ts`

```ts
// DELETE /api/reservations/[id]
// resp 200: Reservation (cancelled)
// resp 403 / 409
export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<Response>;
```

- `OwnershipError` → 403
- `ConflictError` (이미 cancelled) → 409

### 3. `src/app/(viewer)/reservations/page.tsx`

- client (인터랙션 위주)
- `useQuery(['reservations'])` → GET `/api/reservations`
- 카드 목록: 공연명, 회차 시간, 좌석 목록, 상태(active/cancelled), **취소 버튼**
- 취소 버튼 클릭 → `useMutation` → 성공 시 `invalidateQueries(['reservations'])` + 좌석 페이지 캐시도 무효화(`['snapshot', sessionId]`)

### 4. SelectionBar 확장 (Phase 2 Step 3의 컴포넌트)

- `선택 완료` 이후 hold 성공 상태에서 새 버튼 **`예매 확정`** 표시
- 예매 확정 → POST `/api/reservations` → 성공 시 `/reservations` 이동 + 좌석 페이지 상태 정리 (선택 해제, 좌석은 다음 폴링에서 sold로 갱신됨)

### 5. 취소 검증

취소 후 좌석 페이지로 돌아가면 해당 좌석이 다시 available 상태여야 한다 (다음 폴링에서 확인).

## Acceptance Criteria

```bash
npm run test        # /api/reservations 테스트 통과 (소유권 403, 중복 취소 409)
npm run build
npm run dev &
sleep 3
# 수동:
#   1. 좌석 hold → 예매 확정 → /reservations에서 확인
#   2. 새로고침해도 내역 유지
#   3. 취소 → 좌석 페이지에서 좌석이 available로 복구 (3~4초 안에)
kill %1
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - 응답 Reservation에 userId 필드가 없음?
   - `reservationId`만으로 삭제 허용하지 않음? (쿠키 userId 검증 필수)
   - `/reservations` 페이지가 client이고 인증 없이 접근 가능? (관람객은 익명 UUID)
   - 취소 성공 시 `['snapshot', sessionId]` 캐시 무효화?
3. 결과에 따라 `phases/3-reservation-seller-ai/index.json`의 step 1을 업데이트:
   - 성공 → `"summary": "/api/reservations POST/GET/[id] DELETE + /reservations 페이지. 취소 시 좌석 복구"`

## 금지사항

- 예약 조회 응답에 다른 유저의 예약 포함 마라. 이유: IDOR
- `reservationId`만으로 취소 허용 마라. 반드시 쿠키 userId 소유권 검증
- `/reservations` 페이지를 RSC로 만들지 마라. 이유: 취소 인터랙션 위주. client가 자연스러움
- 확정 후 좌석 페이지에서 좌석을 클라이언트 상태만으로 sold 표시 마라. 반드시 폴링 결과 반영 (서버가 진실)
- 기존 테스트를 깨뜨리지 마라

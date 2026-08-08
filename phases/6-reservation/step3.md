# Step 3: confirm-ui — 좌석 페이지 "예매 확정" 버튼

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — 클라이언트 상태 관리, 데이터 흐름
- `/docs/UI_GUIDE.md` — 버튼 스타일, 카드 규칙, 색상 팔레트
- `/docs/UX_PRINCIPLES.md` — 좌석 선택 화면 원칙
- `/CLAUDE.md` — CRITICAL 규칙
- `/src/atoms/seat.ts` — Jotai atom 구조 (seatStatusAtomFamily, myHoldExpiresAtAtom, trackedSeatIdsAtom 등)
- `/src/hooks/use-hold-mutation.ts` — 기존 mutation hook 패턴 (낙관적 업데이트, query invalidate)
- `/src/hooks/use-seat-snapshot.ts` — 폴링 hook 패턴 (SNAPSHOT_QUERY_KEY)
- `/src/components/seat/SelectionBar.tsx` — 기존 Jotai + mutation hook 조합 패턴
- `/src/components/seat/HoldTimer.tsx` — hold 타이머 컴포넌트
- `/src/components/seat/SeatMapContainer.tsx` — 컨테이너 (SelectionBar, HoldTimer 배치)
- `/src/components/toast/Toast.tsx` — 토스트 컴포넌트
- `/src/app/api/reservations/route.ts` — Step 2에서 생성된 POST API

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. myHeldSeatIdsAtom 추가 (`src/atoms/seat.ts` 수정)

snapshot에서 내가 hold한 좌석 목록을 추출하는 파생 atom을 추가한다:

```typescript
// 시그니처만 제시 — 구현은 에이전트 재량
export const myHeldSeatIdsAtom = atom<string[]>((get) => {
  // trackedSeatIdsAtom에서 추적 중인 좌석 중
  // seatStatusAtomFamily(seatId)가 { s: "held", mine: true }인 것만 필터
});
```

### 2. 예매 생성 mutation hook (`src/hooks/use-create-reservation.ts` 생성)

기존 `use-hold-mutation.ts` 패턴을 참고한다.

```typescript
// 시그니처
export function useCreateReservation(sessionId: string): UseMutationResult<...>
```

**핵심 동작:**
- POST `/api/reservations` 호출 (`{ sessionId, seatIds }`)
- seatIds는 `myHeldSeatIdsAtom`에서 가져오거나 인자로 받는다
- **낙관적 업데이트를 하지 않는다** — 예매 확정은 최종 액션이므로 서버 응답 대기
- 성공 시: snapshot query invalidate (`SNAPSHOT_QUERY_KEY`), `selectedSeatIdsAtom` 초기화
- 실패 시: Toast 표시 (에러 메시지)

### 3. 예매 취소 mutation hook (`src/hooks/use-cancel-reservation.ts` 생성)

Step 4 (/reservations 페이지)에서 사용할 hook을 미리 만든다.

```typescript
// 시그니처
export function useCancelReservation(): UseMutationResult<...>
```

**핵심 동작:**
- DELETE `/api/reservations/[id]` 호출
- 성공 시: reservations query invalidate
- 실패 시: Toast 표시

### 4. 내 예매 목록 query hook (`src/hooks/use-my-reservations.ts` 생성)

Step 4에서 사용할 hook을 미리 만든다.

```typescript
// 시그니처
export function useMyReservations(): UseQueryResult<Reservation[]>
```

**핵심 동작:**
- GET `/api/reservations` 호출
- query key: `["reservations"]` (또는 적절한 키)
- refetchInterval은 설정하지 않는다 (폴링 불필요)

### 5. ConfirmBar 컴포넌트 (`src/components/seat/ConfirmBar.tsx` 생성)

hold가 존재할 때 "예매 확정" 버튼을 보여주는 컴포넌트.

**렌더링 조건:** `myHoldExpiresAtAtom !== null`일 때만 렌더 (hold 상태)

**UI 구성:**
- 내가 hold한 좌석 목록 표시 (myHeldSeatIdsAtom)
- "예매 확정" 버튼 (Primary 스타일: `rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950`)
- 처리 중 상태: 버튼 disabled + "처리 중..." 텍스트
- 성공 시: 성공 토스트 + /reservations 링크 표시
- 실패 시: 에러 토스트

**예매 확정 성공 후 상태 정리:**
- `myHoldExpiresAtAtom` → null (HoldTimer 제거)
- `selectedSeatIdsAtom` → [] (선택 초기화)
- snapshot query invalidate (sold 상태 반영)

### 6. SeatMapContainer에 ConfirmBar 배치 (`src/components/seat/SeatMapContainer.tsx` 수정)

기존 SelectionBar, HoldTimer와 함께 ConfirmBar를 적절한 위치에 배치한다.
- SelectionBar: 좌석 선택 중 (hold 전)
- HoldTimer + ConfirmBar: hold 후 (예매 확정 전)

## Acceptance Criteria

```bash
npm run lint && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - UI_GUIDE.md 스타일을 따르는가? (버튼, 색상)
   - UX_PRINCIPLES.md 원칙을 따르는가? (점진적 공개)
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/6-reservation/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- API route를 수정하지 마라. 이유: Step 2에서 완성되었다
- Store 구현을 수정하지 마라. 이유: Step 0, 1에서 완성되었다
- /reservations 페이지를 만들지 마라. 이유: Step 4의 스코프이다
- 낙관적 업데이트를 구현하지 마라. 이유: 예매 확정은 서버 응답을 기다려야 한다
- 애니메이션을 추가하지 마라. 이유: UI_GUIDE.md에서 좌석 관련 애니메이션 금지
- 기존 테스트를 깨뜨리지 마라

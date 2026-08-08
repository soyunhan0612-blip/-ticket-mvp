# Step 4: reservations-page — /reservations 예매 내역 페이지

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — 렌더링 경계 (예매 내역 → client)
- `/docs/UI_GUIDE.md` — 카드 스타일, 버튼 스타일, 색상 팔레트, 레이아웃 규칙
- `/docs/UX_PRINCIPLES.md` — 예매 내역 화면 원칙 (취소: 부정색 텍스트 버튼, 빈 상태 중앙 정렬)
- `/CLAUDE.md` — CRITICAL 규칙
- `/src/app/(viewer)/shows/page.tsx` — 기존 페이지 패턴 참조
- `/src/app/(viewer)/shows/[id]/page.tsx` — 기존 상세 페이지 패턴 참조
- `/src/hooks/use-my-reservations.ts` — Step 3에서 생성된 예매 목록 query hook
- `/src/hooks/use-cancel-reservation.ts` — Step 3에서 생성된 예매 취소 mutation hook
- `/src/components/toast/Toast.tsx` — 토스트 컴포넌트 (취소 성공/실패 알림)
- `/src/types/index.ts` — Reservation 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. 예매 내역 페이지 (`src/app/(viewer)/reservations/page.tsx` 생성)

client component (`"use client"`). 페이지 레벨에서 `useMyReservations` hook을 호출하고, ReservationList에 데이터를 넘긴다.

**레이아웃:**
- 페이지 제목: "내 예매" (`text-3xl font-semibold tracking-tight text-white`)
- 컨테이너: `mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8`
- 로딩 상태: 간단한 텍스트
- 에러 상태: 에러 메시지

### 2. ReservationList 컴포넌트 (`src/components/reservation/ReservationList.tsx` 생성)

예매 목록을 렌더링한다.

**빈 상태:**
- 중앙 정렬 (UX_PRINCIPLES: 빈 상태만 중앙)
- "예매 내역이 없습니다" 안내 문구
- /shows 페이지로 가는 링크

**목록:**
- 예매 카드들을 `space-y-4`로 나열
- confirmed 예매가 위, cancelled 예매가 아래 (또는 createdAt 역순)

### 3. ReservationCard 컴포넌트 (`src/components/reservation/ReservationCard.tsx` 생성)

개별 예매를 카드로 표시한다.

**카드 스타일:** `rounded-lg border border-neutral-800 bg-neutral-900 p-6` (UI_GUIDE)

**표시 정보:**
- 예매 번호 (id의 앞 8자리)
- 좌석 목록 (seatIds를 쉼표로 연결)
- 예매 일시 (createdAt을 한국어 날짜 포맷)
- 상태 (confirmed / cancelled)

**confirmed 상태:**
- 취소 버튼: 부정색 텍스트 버튼 (`text-red-500`, UX_PRINCIPLES)
- 취소 클릭 → `window.confirm("정말 취소하시겠습니까?")` 확인
- 확인 시 `useCancelReservation` mutation 호출
- 성공 시 목록 자동 갱신 (query invalidate)
- 실패 시 토스트 에러 표시

**cancelled 상태:**
- 카드 전체 opacity 낮춤 (`opacity-50` 또는 유사)
- "취소됨" 표시
- 취소 버튼 숨김

**좌석 페이지 링크:**
- 해당 세션의 좌석 페이지(`/sessions/[sessionId]/seats`)로 가는 링크

### 4. 네비게이션 연결

좌석 페이지(SeatMapContainer 또는 ConfirmBar)에서 /reservations로 가는 링크를 추가한다. 예매 확정 성공 후 "내 예매 보기" 같은 링크를 표시하는 것이 자연스럽다.

레이아웃이나 헤더에 /reservations 링크를 추가하는 것도 고려한다 (기존 레이아웃 구조를 확인 후 판단).

## Acceptance Criteria

```bash
npm run lint && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 렌더링 경계를 따르는가? (예매 내역 → client)
   - UI_GUIDE.md 스타일을 따르는가? (카드, 버튼, 색상)
   - UX_PRINCIPLES.md 원칙을 따르는가? (빈 상태 중앙, 취소 부정색)
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
   - 응답에 userId가 포함되지 않는가? (API가 이미 제거하지만, 클라이언트에서도 확인)
3. 결과에 따라 `phases/6-reservation/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- API route를 수정하지 마라. 이유: Step 2에서 완성되었다
- Store 구현을 수정하지 마라. 이유: Step 0, 1에서 완성되었다
- hooks를 수정하지 마라 (버그가 아닌 한). 이유: Step 3에서 완성되었다
- `dangerouslySetInnerHTML`을 사용하지 마라. 이유: CLAUDE.md CRITICAL 규칙 (XSS 방지)
- 애니메이션을 추가하지 마라. 이유: UI_GUIDE.md 규칙
- 차트 라이브러리를 사용하지 마라. 이유: PRD 3대 함정
- 기존 테스트를 깨뜨리지 마라

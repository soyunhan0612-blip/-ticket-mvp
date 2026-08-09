# Step 5: admin-page

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 렌더링 경계 표 (Admin은 client)
- `/docs/UI_GUIDE.md` — 카드/버튼 클래스, 좌석 4색, 차트 라이브러리 금지
- `/docs/UX_PRINCIPLES.md` — 화면별 적용, 접근성 스코프
- `/src/app/api/admin/stats/route.ts` — 이전 step에서 생성된 집계 API
- `/src/components/seat/SeatMap.tsx` — 재사용 대상 (Step 2에서 `sections` prop 추가됨)
- `/src/components/seat/Seat.tsx` — 좌석 클릭 동작을 이해할 것
- `/src/components/seat/SeatMapContainer.tsx` — 관람객용 컨테이너 (Admin의 참조 모델)
- `/src/hooks/use-seat-snapshot.ts` — `useSeatSnapshot`, `SNAPSHOT_REFETCH_INTERVAL`
- `/src/atoms/seat.ts` — `syncSnapshotAtom`, `toggleSeatAtom`, `seatVisualStateAtomFamily`
- `/src/app/(viewer)/reservations/page.tsx` — 클라이언트 페이지 + 훅 사용 패턴
- `/src/app/seller/new/page.tsx` — 폼·셀렉터 UI 패턴
- `/src/lib/seat-preset.ts` — `getPreset(presetId).sections`
- `/src/lib/seat-map.ts` — `SECTIONS`
- `/src/app/api/shows/route.ts` — 공연·회차 목록을 얻는 경로

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`/admin` 실시간 점유 현황 화면을 만든다. `src/middleware.ts`가 이미 `/admin`을 Basic Auth로 보호하고 있으므로 미들웨어는 건드리지 않는다.

### 1. 숫자 카드 (`src/components/admin/OccupancyStats.tsx`)

이전 step의 `GET /api/admin/stats?sessionId=...`를 TanStack Query로 폴링해 카드 4개를 렌더한다.

- 카드: 전체 / 예매가능 / 홀드중 / 판매완료
- 폴링 주기는 `SNAPSHOT_REFETCH_INTERVAL`(3초)을 재사용하라. 새 상수를 만들지 마라
- `docs/UI_GUIDE.md`의 카드 클래스를 사용한다
- **차트 라이브러리를 설치하지 마라.** 숫자와 텍스트만 쓴다 (PRD가 명시한 3대 함정 중 하나)

### 2. 읽기 전용 좌석맵 (`src/components/admin/AdminSeatMap.tsx`)

좌석 렌더링을 **재사용**한다. 좌석 SVG를 새로 구현하지 마라.

핵심 제약 — **Admin 좌석맵은 읽기 전용이어야 한다.** 현재 `Seat.tsx`는 상태가 `available`이면 클릭 시 `toggleSeatAtom`을 호출한다. Admin에서 관리자가 좌석을 클릭했을 때 선택 상태가 바뀌면 안 된다.

읽기 전용을 달성하는 방법은 재량이되 다음 제약을 지켜라:
- **`Seat.tsx`의 `memo` + atom 구독 구조를 깨뜨리지 마라.** 좌석에 `onClick` 콜백을 prop으로 내려보내면 참조가 매번 바뀌어 `memo`가 무력화된다 — 이것이 phase 3에서 의도적으로 제거한 안티패턴이다 (`docs/PROGRESS.md`의 Day 4 "결정 근거" 참조).
- 권장 접근: 좌석맵 전체를 `pointer-events: none` 컨테이너로 감싸거나, Admin 전용 read-only 플래그를 Jotai atom으로 두고 `toggleSeatAtom`이 그 플래그를 보고 no-op하게 한다. 후자를 택하면 `src/atoms/seat.ts` 수정이 필요하고, 그 파일에는 이미 테스트가 있으므로 **테스트를 먼저 갱신하라.**
- Admin에서도 좌석 4색은 동일하게 유지한다. 단 `selected`(내 선택) 상태는 Admin에서 의미가 없다.

`SeatMap`은 Step 2에서 `sections` prop을 받도록 바뀌었다. Admin도 같은 방식으로 공연의 `presetId`에 맞는 `sections`를 넘겨야 한다.

### 3. Admin 페이지 (`src/app/admin/page.tsx`)

- **client 컴포넌트**로 만든다 (`"use client"`). ARCHITECTURE.md의 렌더링 경계 표에서 Admin은 client다.
- 회차 선택 드롭다운이 필요하다. 집계와 스냅샷이 모두 세션 단위이므로 어떤 회차를 볼지 골라야 한다.
  - 공연·회차 목록은 `GET /api/shows`와 `GET /api/shows/[id]`로 가져온다. 새 API를 만들지 마라.
  - 회차를 고르기 전에는 좌석맵과 카드를 렌더하지 않아도 된다 (UX_PRINCIPLES의 점진적 공개).
- 선택된 회차의 스냅샷 폴링은 `useSeatSnapshot(sessionId)`을 재사용한다.
- `<label htmlFor>`를 드롭다운에 붙여라 (UX_PRINCIPLES 접근성 MVP 포함 항목).

### 4. 네비게이션

`src/app/layout.tsx`의 상단 nav에 `/admin` 링크를 추가할지는 재량이다. 추가한다면 Basic Auth가 걸린 경로임을 감안하라 — 관람객에게 인증 프롬프트가 뜨는 링크를 노출하는 것이 나은지 판단하고, 판단 근거를 summary에 적어라.

## Acceptance Criteria

```bash
npm run lint
npm test
npm run build
```

개발 서버 육안 확인 (자동화할 수 없다면 결과를 summary에 기록하라):

```bash
npm run dev
```

- 시크릿 창에서 `/admin` 접근 시 Basic Auth 프롬프트가 뜬다
- 인증 후 회차를 고르면 카드 4개와 좌석맵이 보인다
- `available + held + sold === total`이 화면에서 성립한다
- 다른 탭에서 좌석을 홀드하면 3~4초 안에 Admin 숫자와 좌석 색이 바뀐다
- **Admin에서 좌석을 클릭해도 아무 일도 일어나지 않는다**

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

- 차트 라이브러리(recharts, chart.js, d3 등)를 설치하지 마라. 이유: PRD가 3대 함정으로 명시했다. 숫자 카드 4개면 충분하고, 라이브러리 하나가 남은 일정을 먹는다
- 좌석 SVG 렌더링 코드를 복제하지 마라. 이유: PRD Day 9와 UI_GUIDE가 "좌석맵 컴포넌트 재사용"을 명시했다. 복제하면 좌석 4색·레이아웃이 두 곳에서 갈라진다
- `Seat.tsx`에 `onClick` prop을 추가하지 마라. 이유: 부모가 만든 클로저를 prop으로 넘기면 참조가 매 렌더 바뀌어 `React.memo`의 좌석별 격리가 무력화된다. 이것이 Day 4에서 의도적으로 제거한 구조다
- 관람객 좌석 페이지의 동작을 바꾸지 마라. 이유: Admin의 읽기 전용 요구가 관람객 화면의 좌석 선택을 막으면 예매 플로우가 죽는다. 읽기 전용은 Admin 경로에서만 적용되어야 한다
- Admin API 응답이나 화면에 `userId`를 노출하지 마라. 이유: CLAUDE.md CRITICAL. Admin이라도 예외 없다
- 새 폴링 주기 상수를 만들지 마라. 이유: 3초는 ADR-001이 Upstash Free 한도를 계산해 정한 값이다
- 좌석 SVG에 키보드 내비게이션을 넣지 마라. 이유: PRD가 MVP 범위에서 명시적으로 제외했다
- Redis 관련 작업을 하지 마라. 이유: phase 9의 스코프다
- 기존 테스트를 깨뜨리지 마라

# Step 2: seats-route-and-progress

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 라우팅 · RSC 규칙 · 진행 기록 관습을 파악하라:

- `/CLAUDE.md` — 특히 CRITICAL 항목 중 "좌석 페이지에 `export const dynamic = 'force-dynamic'`" 규칙
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/PRD.md` — Day 3 항목
- `/docs/PROGRESS.md` — 기존 Day 0 섹션 형식(기능적/기술적/아키텍처/결정 근거/참조)을 그대로 따를 것
- `/src/app/layout.tsx` — 루트 레이아웃
- `/src/app/(viewer)/shows/page.tsx` · `/src/app/(viewer)/shows/[id]/page.tsx` — 기존 RSC 페이지 형식 참조
- `/src/lib/mock-data.ts` — `MOCK_SESSIONS`, `MOCK_SHOWS`, `generateSeats`
- **Step 1에서 생성된 파일들**:
  - `/src/components/seat/Seat.tsx`
  - `/src/components/seat/SeatMap.tsx`
  - `/src/components/seat/SelectionBar.tsx`

기존 `/shows/[id]` RSC 페이지가 어떻게 `MOCK_SHOWS`에서 조회하고 `notFound()`를 부르는지 보고 그 패턴을 따르라.

## 작업

두 가지: (1) RSC 좌석 페이지 생성 (2) `docs/PROGRESS.md` Day 3 섹션 골격 추가.

### 1) `src/app/(viewer)/sessions/[id]/seats/page.tsx`

Next.js 15 App Router RSC 페이지.

시그니처:

```tsx
import { notFound } from "next/navigation";
import { SeatMap } from "@/components/seat/SeatMap";
import { generateSeats, MOCK_SESSIONS, MOCK_SHOWS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;   // Next.js 15는 params가 Promise
}

export default async function SeatSelectionPage(props: PageProps) {
  // ...
}
```

내부 구현 요건:

- `params`는 Promise이므로 `await props.params`로 받는다 (Next.js 15 규약)
- `MOCK_SESSIONS`에서 `id`로 조회, 없으면 `notFound()`
- 세션의 `showId`로 `MOCK_SHOWS`에서 공연 조회, 없으면 `notFound()`
- `generateSeats()` 호출 결과(2000개)를 그대로 `<SeatMap seats={seats} />`에 전달
- 페이지 헤더 (좌석맵 위):
  - 공연 제목: `text-3xl font-semibold tracking-tight text-white sm:text-4xl` (UI_GUIDE 페이지 제목 스타일)
  - 회차 시각: `session.startsAt`을 사람이 읽을 수 있는 문자열로 렌더 (예: `toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' })`)
  - 회차 ID (`session.id`) 작게 병기 → `text-sm text-neutral-400`
- 컨테이너: `mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8 py-12` (UI_GUIDE 레이아웃 값)
- `<SeatMap>` 아래에 별도 컴포넌트 없이 페이지가 끝나도 됨 (SelectionBar는 SeatMap이 이미 렌더)

**주의**: 페이지는 RSC이므로 `"use client"`를 붙이지 마라. `<SeatMap>`이 `"use client"`이므로 부분 하이드레이션됨.

**`export const dynamic = 'force-dynamic'`은 반드시 있어야 한다.** 없으면 CLAUDE.md CRITICAL 위반. 이번 phase는 서버 스냅샷이 없어도 이 규칙은 지킨다 — Day 5~6에 스냅샷이 붙었을 때 실수를 방지하기 위한 습관.

### 2) `docs/PROGRESS.md` Day 3 섹션 갱신

기존 `## Day 3 — 좌석 최적화 before (예정)` 블록을 아래로 대체한다. 형식은 Day 0 섹션과 동일하게 유지.

```markdown
## Day 3 — 좌석 최적화 before (구현 완료, 측정 대기)

### 기능적 관점
- `/sessions/[id]/seats` RSC 셸 + 클라이언트 `<SeatMap>` 하이드레이션
- 2000석(4구역 × 25행 × 20열) SVG 렌더, 클릭 토글 선택, **최대 4석 상한** 서버 재검증과 동일 규칙 재사용(`lib/seat-rules.ts`)
- `SelectionBar`에서 선택 좌석 배열 표시 + `선택 완료` alert (Day 5에 `POST /api/holds`로 대체될 자리)

### 기술적 관점
- SeatMap은 `useState<string[]>` 하나로 선택 전체 관리, 2000 Seat에 `selected`·`onClick` **prop drilling**
- `selected.includes(seat.id)`로 좌석별 상태 판정 — 좌석 1회 클릭마다 부모 리렌더 → 2000 자식 리렌더 (의도된 안티패턴)
- **최적화 없음**: `memo` / `useMemo` / `useCallback` / `atomFamily` 전부 미사용 — Day 4에서 도입할 대조군
- `export const dynamic = 'force-dynamic'` 삽입 (CLAUDE.md CRITICAL, 이번엔 스냅샷 없어도 미래 대비)

### 아키텍처 관점
- 순수 로직은 이미 `src/lib/`에 있어 재사용만 함 (`seat-rules.canSelect`, `validateSelection`, `MAX_SEATS_PER_HOLD`)
- 좌석 컴포넌트는 `src/components/seat/`에 3종(Seat/SeatMap/SelectionBar) — Day 4 리팩토링·Day 5~6 서버 상태 통합의 진입점
- 서버 hold·폴링·낙관적 업데이트는 이 phase 범위 밖 (Day 5~6)

### 결정 근거
- **왜 일부러 순진하게 만들었나**: Day 4에 `atomFamily` + `memo`로 리팩토링해 "클릭당 리렌더 2000 → 1~2"의 before/after 서사를 만들기 위한 대조군. CLAUDE.md가 이 커밋의 존재를 명시적으로 요구
- **왜 4색을 monochrome 밝기 대비로만 정했나**: UI_GUIDE AI 슬롭 안티패턴(보라·글로우·그라데이션) 회피. 도구처럼 읽히는 좌석맵이 시그니처가 되도록
- **왜 SelectionBar의 확정 버튼을 alert로 stub했나**: 서버 hold API가 아직 없음. Day 5에 이 자리를 `POST /api/holds` 낙관적 업데이트로 교체 — 이번 phase에 넣으면 서사가 두 곳으로 흩어짐

### before 측정 (React DevTools Profiler)
> 아래는 브라우저에서 수동 측정 후 사람이 채운다. 자동화 X.

- 초기 마운트 시간: **_ ms
- 좌석 1회 클릭 시 리렌더 컴포넌트 수: **_
- 측정 절차: `npm run dev` → `/sessions/session-01/seats` → React DevTools Profiler `Record` → 좌석 하나 클릭 → `Stop` → "Ranked" 뷰의 렌더 개수를 캡처
- 스크린샷: `docs/assets/day3-before-profiler.png` (미첨부 상태로 커밋되었으면 이후 별도 커밋)

### 참조
- 이 phase 커밋(2단계): `feat(2-seat-v0): …` / `chore(2-seat-v0): …`
- 다음: Day 4에서 `atoms/seat.ts` (atomFamily) + `React.memo(Seat)` → after 측정 캡처
```

기존 Day 4 이하 섹션들(`Day 4 — 좌석 최적화 after (예정)`, `Day 5~9 — (예정)`)은 그대로 둔다.

## Acceptance Criteria

```bash
npm run lint
npm run test
npm run build
```

세 커맨드 모두 통과해야 한다. 특히 `npm run build`가 새 라우트를 컴파일하고 TS strict를 지키는지 확인한다.

수동 확인 (개발 서버 필요 없음):

```bash
grep -n "force-dynamic" src/app/\(viewer\)/sessions/\[id\]/seats/page.tsx
```

한 줄 매칭되어야 한다.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `src/app/(viewer)/sessions/[id]/seats/page.tsx` 딱 이 파일만 앱 라우트에 추가되었는가?
   - `export const dynamic = 'force-dynamic'` 이 페이지에 있는가? (CLAUDE.md CRITICAL)
   - 페이지가 RSC인가? (`"use client"` 없어야 함)
   - `params`를 `await`로 받았는가? (Next.js 15 규약)
   - `docs/PROGRESS.md` Day 3 섹션이 대체되었고 Day 0 섹션 형식(기능적/기술적/아키텍처/결정 근거/참조)을 따르는가?
   - Day 4 이후 섹션은 원형 유지되었는가?
3. 결과에 따라 `phases/2-seat-v0/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "/sessions/[id]/seats RSC 라우트 (dynamic=force-dynamic) + PROGRESS.md Day 3 골격. 측정 수치는 사람이 브라우저에서 채울 대기 상태"`
   - 실패 → `"status": "error"`, `"error_message": "..."`

## 금지사항

- `export const dynamic = 'force-dynamic'`을 빼지 마라. 이유: CLAUDE.md CRITICAL. Day 5~6 서버 스냅샷 도입 시 실수 방지용 습관.
- 페이지에 `"use client"`를 붙이지 마라. 이유: 페이지는 RSC 셸이어야 함. 인터랙션은 하위 `<SeatMap>`에 있음.
- `MOCK_SESSIONS` / `MOCK_SHOWS` / `generateSeats` 외의 데이터 소스를 만들지 마라. 이유: Day 5까지 서버 hold 없음. Day 8~9 셀러 등록으로 실데이터가 붙기 전엔 mock 유지.
- 회차 선택 UI, 다른 회차 목록, 브레드크럼 등을 추가하지 마라. 이유: 이번 phase의 스코프 밖. Day 8 셀러 등록 이후에 재검토.
- 로딩 · 에러 상태를 위한 인위적 지연이나 5% 실패율을 좌석 페이지에 넣지 마라. 이유: PRD가 좌석 폴링·좌석 페이지에는 절대 지연/실패를 넣지 말라고 명시.
- `PROGRESS.md`의 Day 0, Day 4~ 섹션은 손대지 마라.
- 기존 테스트를 깨뜨리지 마라.

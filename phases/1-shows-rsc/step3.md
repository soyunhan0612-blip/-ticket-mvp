# Step 3: shows-page

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 렌더링 경계 표 (공연 목록은 RSC)
- `/docs/UX_PRINCIPLES.md`
- `/docs/UI_GUIDE.md` — 이전 step에서 확정한 색·간격·컴포넌트 값
- `/src/services/index.ts` — `getShowStore()`
- `/src/services/show-store.ts` — 인터페이스
- `/src/types/index.ts` — Show
- `/src/app/layout.tsx` — 이미 존재하는 root layout

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`/shows` 목록 페이지를 RSC로 만든다. `fetch` 없이 서버 컴포넌트에서 `getShowStore().list()`를 직접 호출한다 (같은 프로세스 안이라 왕복이 불필요하고 SEO에 좋음).

### 파일 1 — `src/app/(viewer)/shows/page.tsx`

- 서버 컴포넌트 (`"use client"` 붙이지 마라)
- `getShowStore().list()`로 공연 8개 가져옴
- 카드 그리드로 렌더 (반응형: 모바일 1열, 태블릿 2열, 데스크톱 3~4열 정도)
- 각 카드는 `/shows/[id]`로 링크 (`next/link`의 `<Link>` 사용)
- Metadata export: `title`, `description`

시그니처 예:
```tsx
export const metadata: Metadata = { title: "공연 목록 · 티켓 MVP", description: "..." };

export default async function ShowsPage() {
  const shows = await getShowStore().list();
  return (/* 카드 그리드 */);
}
```

### 파일 2 — `src/components/show-card.tsx` (필요 시)

Show 카드 컴포넌트가 유의미하게 분리할 만하면 만든다. 20줄 이내로 마무리되면 페이지 안에 인라인 유지도 OK.

- `props: { show: Show }`
- 클라이언트 상호작용 없음 → 서버 컴포넌트로 두면 됨
- UI_GUIDE에서 확정한 카드 스타일 적용

### 라우팅

`app/(viewer)/shows/page.tsx` 위치는 ARCHITECTURE.md의 디렉토리 구조를 따른 것. `(viewer)`는 route group (URL에 반영 안 됨).

## Acceptance Criteria

```bash
npm run lint
npm run test
npm run build
npm run dev   # 수동 확인용: http://localhost:3000/shows 에서 카드 8개 렌더
```

`npm run dev`는 자동 실행하지 않아도 되지만, `npm run build`는 반드시 성공해야 한다 (RSC + `getShowStore()` 조합이 빌드 시점에 검증됨).

## 검증 절차

1. AC 커맨드를 실행한다 (`build`까지 필수).
2. 아키텍처 체크리스트를 확인한다:
   - 페이지 파일에 `"use client"` 지시가 없는가? (RSC)
   - `getShowStore()`를 직접 호출하는가? (fetch 왕복 X)
   - `dynamic = 'force-dynamic'`을 붙이지 않았는가? (좌석 페이지 아님)
   - UI_GUIDE의 카드 스타일을 사용하는가? (직접 색상 hex 하드코딩 최소화)
   - Metadata export가 있는가?
   - AI 슬롭 안티패턴 도입 여부
3. 결과에 따라 `phases/1-shows-rsc/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약 (예: /shows RSC + show-card + metadata)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"`

## 금지사항

- `"use client"` 지시를 붙이지 마라. 이유: 이 페이지는 RSC 필수 (SEO · 초기 로딩)
- `export const dynamic = 'force-dynamic'`을 붙이지 마라. 이유: 좌석 페이지 전용 (Day 3+). 여기는 mock 데이터라 정적 유지 OK
- `fetch("/api/shows")`를 서버 컴포넌트에서 호출하지 마라. 이유: 같은 프로세스에서 왕복 낭비. `getShowStore()` 직접 호출
- 이미지 로딩 라이브러리·CSS-in-JS·framer-motion 등을 새로 추가하지 마라. 이유: 스코프 밖
- 상세 페이지(`/shows/[id]`)를 이 step에서 만들지 마라. 이유: 다음 step
- 기존 테스트를 깨뜨리지 마라

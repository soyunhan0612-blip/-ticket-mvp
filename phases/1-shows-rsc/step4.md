# Step 4: show-detail-page

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 렌더링 경계 표 (공연 상세는 RSC)
- `/docs/UI_GUIDE.md`
- `/src/services/index.ts` — `getShowStore()`
- `/src/services/show-store.ts` — 인터페이스 (`get()`이 `{ show, sessions } | null`)
- `/src/types/index.ts` — Show, Session
- `/src/app/(viewer)/shows/page.tsx` — 이전 step 목록 페이지 (스타일 일관성)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`/shows/[id]` 상세 페이지를 RSC로 만든다. 공연 정보 + 회차 목록을 표시하고, 각 회차는 `/sessions/[sessionId]/seats`로 링크만 남긴다 (좌석 페이지는 Day 3+ 스코프).

### 파일 — `src/app/(viewer)/shows/[id]/page.tsx`

- 서버 컴포넌트 (`"use client"` 붙이지 마라)
- `params: Promise<{ id: string }>` (Next.js 15 async params)
- `getShowStore().get(id)` 호출
- 결과가 `null`이면 `notFound()` 호출 (Next.js 내장, `next/navigation`에서 import)
- 결과가 있으면:
  - 공연 정보 (제목 · 설명) 렌더
  - 회차 목록 렌더 (`session.startsAt`을 사용자에게 읽히는 로컬 시간 형식으로 표시)
  - 각 회차 항목에 `<Link href={`/sessions/${session.id}/seats`}>` — 좌석 페이지가 없어도 링크는 만들어 둠

시그니처 예:
```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { id } = await params;
  const result = await getShowStore().get(id);
  if (!result) return { title: "공연을 찾을 수 없습니다" };
  return { title: `${result.show.title} · 티켓 MVP`, description: result.show.description };
}

export default async function ShowDetailPage({ params }) {
  const { id } = await params;
  const result = await getShowStore().get(id);
  if (!result) notFound();
  const { show, sessions } = result;
  return (/* 공연 정보 + 회차 목록 */);
}
```

### 회차 시간 표시

`session.startsAt`은 ISO 8601 UTC 문자열이다. 사용자에게는 한국 시간대(KST, +09:00)로 보이는 게 자연스럽다. `Intl.DateTimeFormat`을 사용하되:
- SSR과 클라이언트 결과가 일치하도록 명시적으로 `timeZone: "Asia/Seoul"`, `locale: "ko-KR"` 지정
- 형식은 `2026년 9월 4일 (금) 오후 7:30` 정도로 읽기 편하게

이 포맷 함수가 재사용될 여지가 있으면 `src/lib/format.ts` 같은 곳에 두는 것도 좋다. 지금 스코프에서는 페이지 안에 두거나 얇은 유틸로 분리하거나 재량.

## Acceptance Criteria

```bash
npm run lint
npm run test
npm run build
npm run dev   # 수동 확인용: /shows에서 아무 카드 클릭 → 상세 페이지 정상 렌더, 존재하지 않는 id는 404
```

## 검증 절차

1. AC 커맨드를 실행한다 (`build`까지 필수).
2. 아키텍처 체크리스트를 확인한다:
   - RSC (`"use client"` 없음)
   - Next.js 15의 async `params` 시그니처
   - `null` → `notFound()` 처리 (Response 500 아님)
   - 회차 시간이 명시적 timeZone/locale로 포맷되는가? (SSR-클라이언트 하이드레이션 불일치 방지)
   - 회차 링크의 href가 `/sessions/[id]/seats` 형식인가?
   - `dynamic = 'force-dynamic'`을 붙이지 않았는가?
   - `generateMetadata`가 존재 여부에 따라 title을 다르게 반환하는가?
3. 결과에 따라 `phases/1-shows-rsc/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약 (예: /shows/[id] RSC + 회차 목록 + notFound + KST 포맷)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"`

## 금지사항

- `/sessions/[id]/seats` 페이지 자체를 만들지 마라. 이유: Day 3+ 스코프. 링크만 남기고 넘어감
- `getShowStore()` 대신 mock 데이터를 페이지에서 직접 import하지 마라. 이유: Store 인터페이스 우회
- `params`를 await 없이 사용하지 마라. 이유: Next.js 15에서 Promise. TS strict가 잡을 것
- 회차 시간을 `new Date(startsAt).toLocaleString()`만으로 렌더하지 마라. 이유: SSR과 클라이언트의 기본 timeZone/locale이 다르면 hydration mismatch
- `dynamic = 'force-dynamic'`을 붙이지 마라. 이유: 좌석 페이지 전용
- 기존 테스트를 깨뜨리지 마라

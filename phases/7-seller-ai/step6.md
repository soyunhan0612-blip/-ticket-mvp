# Step 6: seller-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/UI_GUIDE.md` — 카드, 버튼, 입력 필드, 레이아웃 스타일
- `/docs/UX_PRINCIPLES.md` — 디자인 원칙, 셀러 등록 원칙
- `/src/app/(viewer)/shows/page.tsx` — 기존 RSC 페이지 패턴
- `/src/app/(viewer)/shows/[id]/page.tsx` — 공연 상세 페이지 (description 렌더 패턴)
- `/src/app/layout.tsx` — 루트 레이아웃
- `/src/components/providers.tsx` — Provider 래핑 패턴
- `/src/components/toast/Toast.tsx` — 토스트 컴포넌트
- `/src/hooks/use-create-reservation.ts` — mutation hook 패턴 참조
- `/src/lib/seat-preset.ts` — Step 0에서 생성된 프리셋 목록
- `/src/lib/poster-preset.ts` — Step 2에서 생성된 포스터 프리셋
- `/src/lib/show-validation.ts` — Step 1에서 생성된 검증 스키마
- `/src/app/(viewer)/sessions/[id]/seats/page.tsx` — 좌석 페이지 (프리셋 연동 수정 대상)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. 셀러 레이아웃 (`src/app/seller/layout.tsx` 생성)

- Providers를 감싼다 (Tanstack Query + Jotai)
- 기본 레이아웃 구조 (bg-neutral-950, padding)

### 2. 셀러 등록 페이지 (`src/app/seller/new/page.tsx` 생성)

`"use client"` 컴포넌트.

**폼 필드 (5개 이내):**
1. **공연명** — `<input>`, 최대 100자, placeholder "공연 이름을 입력하세요"
2. **공연 설명** — `<textarea>`, AI 생성 또는 직접 입력, 최대 2000자
3. **좌석 프리셋** — SeatPresetSelector 컴포넌트 (3개 카드 라디오)
4. **포스터** — PosterPresetSelector 컴포넌트 (프리셋 카드 라디오)
5. **회차** — 날짜시간 입력, 최소 1개 최대 10개, 동적 추가/삭제

스타일 규칙:
- 컨테이너: `mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8`
- 페이지 제목: UI_GUIDE.md 페이지 제목 스타일
- 입력 필드: UI_GUIDE.md 입력 필드 스타일
- 버튼: UI_GUIDE.md Primary 버튼 스타일
- 간격: 섹션 사이 `space-y-8`, 컴포넌트 내부 `gap-4`

제출 시:
- `useCreateShow()` mutation 호출
- 성공 → 토스트 + `/shows/[id]`로 리다이렉트
- 실패 → 에러 토스트

### 3. AI 설명 생성 UI (`src/components/seller/AiDescriptionGenerator.tsx` 생성)

**동작:**
- "AI로 설명 생성" 버튼 클릭 → `/api/ai/description`에 POST (공연명 + 장르 전달)
- 스트리밍 응답을 ReadableStream으로 읽어 실시간 표시
- 프리뷰: `whitespace-pre-wrap` plain text 렌더 (`dangerouslySetInnerHTML` 절대 금지)
- 생성 완료 후 "이 설명 사용" 버튼 → 폼의 description 필드에 반영
- 생성 중: 버튼 disabled + "생성 중..." 텍스트
- 에러 시: 인라인 에러 메시지

스트리밍 읽기 패턴:
```typescript
const response = await fetch("/api/ai/description", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title, genre }),
});
const reader = response.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  setText(prev => prev + decoder.decode(value));
}
```

### 4. 좌석 프리셋 선택 (`src/components/seller/SeatPresetSelector.tsx` 생성)

- SEAT_PRESETS를 import하여 3개 카드 표시
- 선택된 카드: `border-white`, 미선택: `border-neutral-800`
- 각 카드에 label과 totalSeats 표시

### 5. 포스터 프리셋 선택 (`src/components/seller/PosterPresetSelector.tsx` 생성)

- POSTER_PRESETS를 import하여 카드 표시
- 선택된 카드: `border-white`, 미선택: `border-neutral-800`
- 각 카드에 포스터 이미지와 label 표시

### 6. 공연 등록 mutation hook (`src/hooks/use-create-show.ts` 생성)

```typescript
export function useCreateShow(): UseMutationResult<
  { show: Show; sessions: Session[] },
  Error,
  CreateShowInput
>;
```

- POST `/api/shows` 호출
- 성공 시: `showsQueryKey` 캐시 무효화 + 토스트 + `router.push(/shows/${show.id})`
- 실패 시: 에러 토스트

### 7. 좌석 페이지 프리셋 연동

현재 좌석 페이지(`/sessions/[id]/seats`)는 모든 공연에 대해 4구역(2000석)을 렌더한다. 셀러가 Small 프리셋(A구역만)으로 공연을 등록했을 때, 해당 회차의 좌석 페이지에서는 A구역만 표시되어야 한다.

수정 방법:
- 좌석 페이지에서 session → show 조회 (ShowStore.get이나 API 활용)
- show의 `presetId` 확인 (없으면 기존 mock이므로 "large" 기본값)
- `getPreset(presetId).sections`를 SeatMap에 전달하여 해당 구역만 렌더

이를 위해 SeatMap 컴포넌트가 `sections` prop을 받을 수 있도록 수정하거나, 좌석 생성 시 프리셋 구역만 전달한다.

### 8. 네비게이션 연결

- 공연 목록 페이지 또는 글로벌 네비게이션에 "공연 등록" 링크 추가
- Basic Auth가 보호하므로 링크 자체는 노출해도 안전하다

## Acceptance Criteria

```bash
npm run lint && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 수동 검증:
   - `/seller/new` 접근 시 Basic Auth 인증 요구
   - 인증 후 폼이 표시된다
   - AI 설명 생성 (키 없을 때 fallback으로 동작)
   - 공연 등록 후 `/shows`에 새 공연이 나타난다
   - 등록한 공연의 상세 페이지에서 설명이 `whitespace-pre-wrap`으로 표시
   - 등록한 공연의 회차 → 좌석 선택이 프리셋에 맞는 구역만 표시
3. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
4. 결과에 따라 `phases/7-seller-ai/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `dangerouslySetInnerHTML`을 절대 사용하지 마라. 이유: 저장형 XSS 실경로 (셀러 등록은 누구나 가능)
- 좌석 배치 에디터를 만들지 마라. 이유: PRD 3대 함정, 프리셋 3개로 충분
- 임의 포스터 URL 입력을 허용하지 마라. 이유: 보안
- AI 슬롭 안티패턴을 사용하지 마라. 이유: UI_GUIDE.md 참조 (gradient, blur, glow 등)
- 기존 테스트를 깨뜨리지 마라
- 좌석 페이지의 `export const dynamic = 'force-dynamic'`을 제거하지 마라

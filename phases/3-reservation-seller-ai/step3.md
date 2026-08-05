# Step 3-3: seller-form

## 읽어야 할 파일

- `/docs/PRD.md` — Day 8 셀러 등록 항목
- `/docs/UI_GUIDE.md` — 디자인 원칙, 컴포넌트 스타일
- `/CLAUDE.md` — XSS 방지 규칙 (plain text 렌더)
- 이전 step 산출물: `src/services/show-store-memory.ts`

## 작업

셀러 등록 폼 + API. **좌석 배치 에디터 금지** (프리셋 3개 중 선택). AI 설명 생성은 다음 step에서 붙임 — 이 step에서는 텍스트 입력만.

### 1. `src/app/api/shows/route.ts` — POST 추가

이미 GET 있음 (Phase 0 Step 3). POST 추가:

```ts
// POST /api/shows
// body: CreateShowInput (zod로 검증)
// resp 200: { show, sessions }
// resp 400: 검증 실패
export async function POST(req: Request): Promise<Response>;
```

zod schema:
- `title`: string, 1~100자
- `description`: string, 1~2000자
- `posterPreset`: enum `['p1', 'p2', 'p3']`
- `seatPreset`: enum `['small', 'medium', 'full']`
- `sessionTimes`: number[] (1~4개, 각 값은 미래의 epoch ms)

**입력 길이 상한이 반드시 있어야 함** — AI 프롬프트 인젝션 방어의 첫 단계 (다음 step에서 프롬프트에 감싸 넘길 때 안전).

이 route는 Phase 3 Step 5에서 middleware + route handler 양쪽에서 Basic Auth 재검증한다 (curl 우회 방어). 이 step에서는 아직 인증 없음.

### 2. `src/app/seller/new/page.tsx` — 등록 폼

- client component
- **필드 5개 이내**:
  1. 제목 (input)
  2. 설명 (textarea) — 다음 step에서 AI 자동 채우기 버튼 추가
  3. 포스터 프리셋 (라디오 3개, 미리보기 이미지 URL은 `/posters/p1.png` 등 `public/posters/` 정적)
  4. 좌석 프리셋 (라디오 3개, 각 옆에 "N석" 표시)
  5. 회차 (date-time input, 최대 4개까지 추가 가능)
- 제출 → POST `/api/shows` → 성공 시 `/shows/[id]`로 이동
- Tailwind로 소박한 폼 UI

### 3. `public/posters/` — 프리셋 이미지 3개

프로젝트 루트에 `public/posters/{p1,p2,p3}.png` 배치. 실제 이미지가 없으면 단색 SVG 3개로 대체 가능 (파일 자체는 존재해야 next/image가 참조 가능).

이 step에서는 대체 SVG를 만들거나, README에 "이미지 자원은 실제 배포 시 교체"를 명시하고 빈 파일 위치만 잡아둠.

### 4. `next.config` — remotePatterns 확인

포스터는 로컬 정적 (`/posters/*`)이므로 `remotePatterns` 열 필요 없음. Phase 0 Step 4에서 빈 상태 유지한 것 그대로.

## Acceptance Criteria

```bash
npm run test        # POST /api/shows 테스트 (zod 검증 케이스 포함)
npm run build
npm run dev &
sleep 3
# 수동:
#   1. /seller/new 접근 (인증 아직 없음)
#   2. 제목/설명/프리셋/회차 입력 후 제출
#   3. /shows/[id]로 이동, 상세에 등록한 정보 표시
#   4. /shows 목록에도 새 공연 카드 존재
kill %1
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - zod schema가 길이 상한(100/2000자) 포함?
   - `posterPreset`, `seatPreset`이 union 타입으로만 허용?
   - `sessionTimes`가 배열 길이·값 검증?
   - 폼에 **좌석 배치 에디터가 없음** (프리셋 라디오만)?
   - 포스터 이미지가 `public/posters/` 정적 파일?
3. 결과에 따라 `phases/3-reservation-seller-ai/index.json`의 step 3을 업데이트:
   - 성공 → `"summary": "/seller/new 폼 + POST /api/shows (zod 길이 상한). 프리셋만, 에디터 X. Basic Auth는 Step 5"`

## 금지사항

- 좌석 배치 에디터를 만들지 마라. 이유: PRD 3대 함정 1번. 프리셋 3개로 끝
- 임의 URL 포스터 입력 필드 만들지 마라. 이유: next/image가 임의 외부 리소스 프록시. 프리셋만
- `dangerouslySetInnerHTML` 쓰지 마라. 이유: 저장형 XSS (CLAUDE.md CRITICAL)
- Basic Auth 여기서 추가 마라. 이유: Step 5의 스코프
- 파일 업로드 필드 만들지 마라. 이유: 이미지 저장소·CDN 필요, MVP 스코프 아님
- 리치 텍스트 에디터 추가 마라. 이유: XSS 위험 + 스코프 초과
- 기존 테스트를 깨뜨리지 마라

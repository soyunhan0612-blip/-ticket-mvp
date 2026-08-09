# Step 4: show-create-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/src/app/api/shows/route.ts` — 기존 GET /api/shows
- `/src/app/api/holds/route.ts` — API 패턴 참조 (zod, cookie, 에러 처리)
- `/src/app/api/holds/route.test.ts` — API 테스트 패턴 (Request 직접 생성)
- `/src/lib/show-validation.ts` — Step 1에서 생성된 스키마
- `/src/lib/seat-preset.ts` — Step 0에서 생성된 프리셋
- `/src/lib/poster-preset.ts` — Step 2에서 생성된 포스터 프리셋
- `/src/lib/cookie.ts` — getUserIdFromRequest
- `/src/services/index.ts` — getShowStore

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. 테스트 작성 (`src/app/api/shows/route.test.ts` 생성 또는 확장)

기존 GET 테스트가 있다면 유지하고 POST 테스트를 추가한다. 테스트 패턴은 `/src/app/api/holds/route.test.ts`를 참조하라.

**POST 테스트 케이스:**
- 유효한 입력으로 공연 생성 성공 (201)
- 응답에 show와 sessions가 포함된다
- show에 id, title, description, presetId가 있다
- sessions의 수가 입력 sessions 배열 길이와 일치한다
- 쿠키 없으면 401
- body가 없으면 400
- title이 빈 문자열이면 400
- title이 100자 초과면 400
- 잘못된 presetId면 400
- 잘못된 posterUrl (프리셋에 없는 값)이면 400
- sessions가 비어있으면 400
- 생성 후 GET /api/shows 호출 시 새 공연이 포함된다

### 2. POST 핸들러 구현 (`src/app/api/shows/route.ts` 수정)

기존 GET 핸들러를 유지하고 POST를 추가한다.

```typescript
export async function POST(request: Request): Promise<Response>;
```

동작 흐름:
1. `getUserIdFromRequest(request)` — null이면 401
2. `createShowInputSchema.safeParse(await request.json())` — 실패 시 400 + 에러 메시지
3. `isValidPresetId(input.presetId)` 재검증 — 실패 시 400
4. `isValidPosterPresetId(input.posterUrl)` 재검증 — 실패 시 400
5. `getPosterUrl(input.posterUrl)`로 실제 poster URL을 resolve하여 input에 반영
6. `getShowStore().create(validated)` 호출
7. `Response.json({ show, sessions }, { status: 201 })` 반환

핵심 규칙:
- 응답에 userId를 포함하지 마라
- 임의 posterUrl을 허용하지 마라 — 반드시 `isValidPosterPresetId`로 검증

## Acceptance Criteria

```bash
npx vitest run src/app/api/shows/route.test.ts
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/7-seller-ai/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 기존 GET 핸들러와 테스트를 깨뜨리지 마라. 이유: 관람객 플로우가 이 API에 의존한다
- 응답에 userId를 포함하지 마라. 이유: IDOR 방어 (CLAUDE.md CRITICAL)
- 임의 posterUrl을 허용하지 마라. 이유: XSS/SSRF 방지
- AI 설명 생성을 이 step에 포함하지 마라. 이유: Step 5의 스코프
- 기존 테스트를 깨뜨리지 마라

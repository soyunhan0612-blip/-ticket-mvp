# Step 3-4: ai-streaming

## 읽어야 할 파일

- `/CLAUDE.md` — CRITICAL 규칙 (NEXT_PUBLIC 금지, plain text 렌더)
- `/docs/ARCHITECTURE.md` — AI 엔드포인트 섹션
- `/docs/ADR.md` — 없음 (AI 관련 별도 ADR 없음. ARCHITECTURE의 규칙이 계약)
- 이전 step 산출물: `src/app/seller/new/page.tsx`, `src/app/api/shows/route.ts`

## 작업

공연 설명을 AI로 스트리밍 생성. 셀러 폼의 "AI로 생성" 버튼 → 스트리밍 응답이 textarea에 타이핑되듯 채워짐.

### 1. `.env.local` 준비

`.env.example`에 `ANTHROPIC_API_KEY=` 이미 있음. 개발자가 실제 키를 `.env.local`에 채움. **키 없을 때 fallback 목업 응답**이 반드시 동작해야 함 (심사자가 키 없이 테스트).

### 2. `@anthropic-ai/sdk` 설치

`package.json`에 `@anthropic-ai/sdk` (최신) devDep가 아닌 dep로 추가. Haiku 4.5 모델 (`claude-haiku-4-5-20251001`).

### 3. `src/lib/rate-limit.ts` — 간단한 인메모리 rate limiter

**tdd-guard 대상. 테스트 먼저**.

```ts
export interface RateLimitResult { ok: boolean; retryAfterMs?: number; }
export function checkRateLimit(key: string, maxPerMinute: number, now: number): RateLimitResult;
```

- 인메모리 Map<key, timestamps[]> — **Phase 3 개발 전용**
- **배포 한계**: Vercel 서버리스는 인스턴스마다 Map이 초기화되므로 인스턴스 간 rate limit이 공유되지 않는다. "IP당 분당 3회" 보장 불가
- Phase 4에서 `STORE_BACKEND=redis`가 활성화되면 `rate-limit-redis.ts`를 만들어 Upstash Redis의 Sorted Set(슬라이딩 윈도우)으로 교체한다
- 1분 슬라이딩 윈도우

### 4. `src/app/api/ai/description/route.ts`

**tdd-guard 대상. 테스트 먼저** (스트리밍은 테스트 어려우니 non-stream 경로도 지원하고 테스트).

```ts
// POST /api/ai/description
// body: { title: string, seatPreset: 'small'|'medium'|'full', hints?: string }
// resp: text/event-stream (SSE) or text/plain 스트리밍
// resp 429: rate limit 초과
// resp 400: 입력 검증 실패
export async function POST(req: Request): Promise<Response>;
```

**핵심 규칙**:

1. **API 키 없으면 fallback 목업 응답 스트리밍** — 정적 문자열을 100ms 간격으로 잘라 스트리밍 (테스트 가능)
2. `max_tokens: 600`
3. IP당 분당 3회 rate limit (`req.headers.get('x-forwarded-for')` → `checkRateLimit`)
4. 입력 길이 상한: `title` 100자, `hints` 500자
5. **사용자 입력은 구분자로 감싸 프롬프트에 삽입** — 프롬프트 인젝션 완화:
   ```
   시스템: 다음 공연에 대한 소개문을 3~4문단으로 작성하세요. 마크다운 금지, 문단만.
   
   <공연제목>
   {title}
   </공연제목>
   
   <좌석규모>
   {seatPreset}
   </좌석규모>
   
   <힌트>
   {hints or ''}
   </힌트>
   ```
6. **`NEXT_PUBLIC_ANTHROPIC_API_KEY` 절대 사용 X**. `process.env.ANTHROPIC_API_KEY` 서버 전용
7. **응답은 plain text 스트림**. 마크다운·HTML 태그 생성 요청 금지
8. **Basic Auth 필수** — 이 route는 Phase 3 Step 5에서 middleware + route handler 양쪽에서 Basic Auth 검사한다. 무인증 curl로 AI 크레딧을 소모당하지 않게 방어 심층화가 필수. rate limit 검사보다 **앞**에서 401 반환

### 5. 셀러 폼에 "AI로 생성" 버튼

`src/app/seller/new/page.tsx` 수정:
- 설명 textarea 옆에 `AI로 생성` 버튼
- 클릭 → 제목/좌석 프리셋 값과 함께 POST → SSE/스트림 읽기 → 청크별로 textarea에 append (타이핑 효과)
- 스트리밍 중 버튼 disabled, 완료 시 활성화
- 429 응답: 토스트 "잠시 후 다시 시도하세요"

### 6. 렌더링 규칙

**공연 상세 페이지의 `description` 렌더는 이미 plain text**여야 함 (Phase 0 Step 3에서 만든 상세 페이지). 만약 그때 `dangerouslySetInnerHTML`로 만들었다면 여기서 반드시 `<p className="whitespace-pre-wrap">{description}</p>` 형태로 수정.

## Acceptance Criteria

```bash
npm run test        # rate-limit, /api/ai/description 목업 경로 테스트 통과
npm run build
npm run dev &
sleep 3
# 수동:
#   1. .env.local에 키 없이 /seller/new → AI 생성 클릭 → 목업 응답이 스트리밍
#   2. 키 있음 → 실제 Haiku 응답이 스트리밍
#   3. 4회 연속 클릭 → 4회차에 429 응답
#   4. 상세 페이지에서 description이 plain text로 렌더 (HTML 태그 문자열 그대로 보임 — XSS 방어 증거)
kill %1
```

수동 보안 스팟체크:
- 배포본이 있다면 JS 번들에서 `ANTHROPIC` 검색 → 아무것도 안 나와야 함

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - `NEXT_PUBLIC_` 접두사 사용 X? (grep으로 검증)
   - 사용자 입력이 구분자로 감싸져 프롬프트에 삽입?
   - `max_tokens: 600` 상한?
   - rate limit이 IP 기준으로 분당 3회?
   - 상세 페이지가 `dangerouslySetInnerHTML` 사용 안 함?
   - 키 없을 때 fallback이 실제로 스트리밍?
3. 결과에 따라 `phases/3-reservation-seller-ai/index.json`의 step 4를 업데이트:
   - 성공 → `"summary": "/api/ai/description 스트리밍 (Haiku 4.5 + fallback). rate limit 3/min IP. 프롬프트 인젝션 완화. plain text 렌더"`
   - Anthropic 키 미제공으로 실제 스트리밍은 검증 못 함 → blocked: `"ANTHROPIC_API_KEY 없어 실제 응답 검증 못함. fallback만 확인"`

## 금지사항

- `NEXT_PUBLIC_ANTHROPIC_API_KEY` 만들지 마라. 이유: 브라우저 번들 유출 = 즉시 유료 API 도둑질 (CLAUDE.md CRITICAL)
- `dangerouslySetInnerHTML`로 AI 응답 렌더 마라. 이유: AI가 HTML 뱉으면 저장형 XSS
- 사용자 입력을 그대로 프롬프트에 이어붙이지 마라. 반드시 `<태그>...</태그>` 구분자로 감싸기
- `max_tokens` 없이 호출 마라. 이유: 무제한 요금 폭탄
- rate limit 없이 배포 마라. 이유: 공개 URL에 무제한 AI = 파산 (Haiku여도 유의미)
- AI에 마크다운/HTML을 요청 마라. plain text 문단만 (렌더 규칙과 일치)
- 기존 테스트를 깨뜨리지 마라

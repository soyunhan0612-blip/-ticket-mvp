# Step 5: ai-description-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙 (NEXT_PUBLIC_ 금지, plain text, dangerouslySetInnerHTML 금지)
- `/docs/ARCHITECTURE.md`
- `/docs/PRD.md` — Day 8: max_tokens 600, IP당 분당 3회, Haiku 4.5, fallback, 입력 길이 상한
- `/.env.example` — ANTHROPIC_API_KEY
- `/src/app/api/holds/route.ts` — API 패턴 참조
- `/src/app/api/holds/route.test.ts` — API 테스트 패턴

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 0. 패키지 설치

```bash
npm install @anthropic-ai/sdk
```

### 1. Rate limiter — 테스트 먼저 (`src/lib/rate-limit.test.ts` 생성)

**테스트 케이스:**
- 첫 3회 요청이 통과한다 (allowed: true)
- 4번째 요청이 차단된다 (allowed: false, retryAfterMs가 양수)
- 1분 경과 후 다시 통과한다 (타임스탬프 모킹 필요)
- 서로 다른 IP(key)는 독립적으로 제한된다
- 오래된 항목이 정리된다

### 2. Rate limiter 구현 (`src/lib/rate-limit.ts` 생성)

```typescript
export function createRateLimiter(config: {
  windowMs: number;
  maxRequests: number;
}): {
  check(key: string): { allowed: boolean; retryAfterMs?: number };
};
```

핵심 규칙:
- 인메모리 Map 기반 슬라이딩 윈도우
- 외부 라이브러리 없이 순수 구현
- check() 호출 시 윈도우 밖의 오래된 타임스탬프를 정리한다

### 3. AI 프롬프트 — 테스트 먼저 (`src/lib/ai-prompt.test.ts` 생성)

**테스트 케이스:**
- 프롬프트에 공연명이 구분자로 감싸져 포함된다
- "마크다운을 사용하지 마라" 또는 유사한 지시가 포함된다
- title이 100자를 초과하면 100자로 잘린다
- genre가 있으면 프롬프트에 포함된다

### 4. AI 프롬프트 구현 (`src/lib/ai-prompt.ts` 생성)

```typescript
export function buildDescriptionPrompt(input: {
  title: string;
  genre?: string;
}): string;

export const AI_MAX_TOKENS = 600;
export const AI_MODEL = "claude-haiku-4-5-20241022";
```

핵심 규칙:
- 사용자 입력을 `===USER_INPUT_START===` / `===USER_INPUT_END===` 구분자로 감싼다 (프롬프트 인젝션 완화)
- 시스템 프롬프트에서 "마크다운 없이 일반 텍스트 문단만 작성하라"를 명시한다
- title은 100자 상한으로 잘라서 프롬프트에 넣는다

### 5. API 엔드포인트 — 테스트 먼저 (`src/app/api/ai/description/route.test.ts` 생성)

**테스트 케이스:**
- API 키가 없을 때 (process.env.ANTHROPIC_API_KEY 미설정) fallback 목업 응답을 반환한다
- 응답이 스트리밍으로 온다 (ReadableStream 확인)
- 잘못된 body (title 누락)에 400을 반환한다
- title이 100자 초과에 400을 반환한다
- rate limit 초과 시 429를 반환한다 (같은 IP로 4번째 요청)
- 응답 Content-Type이 `text/plain; charset=utf-8`이다

테스트에서는 `@anthropic-ai/sdk` 호출을 모킹하거나, `ANTHROPIC_API_KEY`가 없는 환경에서 fallback 경로만 테스트한다.

### 6. API 엔드포인트 구현 (`src/app/api/ai/description/route.ts` 생성)

```typescript
export async function POST(request: Request): Promise<Response>;
```

동작 흐름:
1. 클라이언트 IP 추출 (`x-forwarded-for` → `x-real-ip` → `"unknown"`)
2. rate limiter 확인 — 초과 시 429 + `Retry-After` 헤더 (초 단위)
3. body 파싱 + Zod 검증 (title 필수, 1~100자; genre? 선택) — 400
4. `ANTHROPIC_API_KEY` 환경변수 확인
5. **키 있을 때**:
   - `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
   - `client.messages.stream({ model: AI_MODEL, max_tokens: AI_MAX_TOKENS, system: "...", messages: [{ role: "user", content: buildDescriptionPrompt(input) }] })`
   - SDK 스트리밍 이벤트에서 text를 추출하여 ReadableStream으로 파이핑
6. **키 없을 때 (fallback)**:
   - 미리 정의된 목업 설명 문자열을 50ms 간격으로 청크 전송하는 ReadableStream 반환

응답 형태:
```typescript
return new Response(readableStream, {
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
  },
});
```

핵심 규칙:
- Vercel AI SDK를 사용하지 마라. @anthropic-ai/sdk를 직접 사용한다
- `NEXT_PUBLIC_ANTHROPIC_API_KEY`를 절대 사용하지 마라 (브라우저 번들에 평문 유출)
- fallback 없이 API 키 필수로 만들지 마라 — 키가 없어도 셀러 플로우가 동작해야 한다

## Acceptance Criteria

```bash
npx vitest run src/lib/rate-limit.test.ts && npx vitest run src/lib/ai-prompt.test.ts && npx vitest run src/app/api/ai/description/route.test.ts
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

- `NEXT_PUBLIC_ANTHROPIC_API_KEY`를 사용하지 마라. 이유: 브라우저 번들에 API 키가 평문 유출된다
- Vercel AI SDK(`ai`, `@ai-sdk/anthropic`)를 사용하지 마라. 이유: 의존성 최소화, @anthropic-ai/sdk 직접 사용 결정
- `dangerouslySetInnerHTML`을 사용하지 마라. 이유: 저장형 XSS 방어
- fallback 없이 API 키를 필수로 만들지 마라. 이유: 키 없이도 셀러 플로우가 동작해야 한다
- 기존 테스트를 깨뜨리지 마라

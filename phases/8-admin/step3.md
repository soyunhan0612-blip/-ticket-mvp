# Step 3: ai-model-fix

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — "AI 엔드포인트" 절
- `/src/lib/ai-prompt.ts` — 수정 대상
- `/src/lib/ai-prompt.test.ts` — 기존 테스트 4건
- `/src/app/api/ai/description/route.ts` — `AI_MODEL`을 소비하는 곳
- `/src/app/api/ai/description/route.test.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

`src/lib/ai-prompt.ts:2`의 모델 ID가 실재하지 않는 값이다:

```typescript
export const AI_MODEL = "claude-haiku-4-5-20241022";
```

`20241022` 날짜 스탬프는 claude-3-5 계열의 것이고, Haiku 4.5의 스탬프가 아니다. 이 조합의 모델 ID는 존재하지 않으므로 실제 API 호출 시 404가 난다.

이 버그가 지금까지 드러나지 않은 이유는 `ANTHROPIC_API_KEY`가 없는 환경에서 route가 fallback 목업 스트림으로 빠지기 때문이다. 테스트도 fallback 경로만 타므로 통과한다. **키를 넣고 실행하는 심사자에게서만 실패가 나타난다.**

## 작업

### 1. 테스트 먼저 수정 (`src/lib/ai-prompt.test.ts`)

`src/lib/`은 TDD 강제 구간이다. 테스트를 먼저 갱신하라.

- `AI_MODEL`이 `"claude-haiku-4-5-20251001"`임을 고정하는 테스트를 추가한다.
- 기존 `buildDescriptionPrompt` 테스트 4건은 그대로 유지한다.

### 2. 구현 (`src/lib/ai-prompt.ts`)

`AI_MODEL` 상수를 실재하는 Haiku 4.5 모델 ID로 교체한다:

```typescript
export const AI_MODEL = "claude-haiku-4-5-20251001";
```

다른 것은 바꾸지 마라. `AI_MAX_TOKENS = 600`과 `buildDescriptionPrompt`의 프롬프트 인젝션 방어(구분자 감싸기, 100자 슬라이스, 마크다운 금지 지시)는 그대로 유지한다.

### 3. 소비처 확인

`src/app/api/ai/description/route.ts`가 `AI_MODEL`을 import해 쓰고 있는지 확인하라. 그 파일에 모델 ID가 별도로 하드코딩돼 있다면 그것도 상수를 쓰도록 고쳐라. 모델 ID가 두 곳에 있으면 안 된다.

## Acceptance Criteria

```bash
npx vitest run src/lib/ai-prompt.test.ts src/app/api/ai/description/route.test.ts
npm run lint
npm test
```

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

- 실제 Anthropic API를 호출해 모델 ID를 검증하려 하지 마라. 이유: 이 저장소에 키가 설정돼 있다는 보장이 없고, 테스트가 네트워크에 의존하면 CI에서 깨진다. 상수 교체와 단위 테스트로 충분하다
- `AI_MAX_TOKENS`를 올리지 마라. 이유: 600은 ARCHITECTURE.md가 정한 비용 방어선이다
- fallback 목업 응답 경로를 제거하지 마라. 이유: 키 없이도 셀러 플로우가 끝까지 동작해야 한다는 것이 PRD Day 8의 검증 조건이다
- 프롬프트의 구분자(`===USER_INPUT_START===`)를 제거하지 마라. 이유: 프롬프트 인젝션 완화 장치다
- rate limit 설정(IP당 분당 3회)을 건드리지 마라. 이유: 공개 URL의 최소 방어선이다
- 기존 테스트를 깨뜨리지 마라

# Step 1: show-store-create

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/src/services/show-store.ts` — ShowStore 인터페이스 (`create(input: unknown)`)
- `/src/services/show-store-memory.ts` — 현재 구현 (create는 throw "Day 8 스코프")
- `/src/services/show-store-memory.test.ts` — 기존 테스트 패턴
- `/src/services/index.ts` — 팩토리 (globalThis 싱글톤)
- `/src/lib/seat-preset.ts` — Step 0에서 생성된 프리셋 로직
- `/src/lib/mock-data.ts` — MOCK_SHOWS/MOCK_SESSIONS 구조
- `/src/types/index.ts` — Show, Session 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. Show 타입 확장 (`src/types/index.ts` 수정)

Show 인터페이스에 `presetId` 필드를 추가한다. 기존 mock 데이터의 Show에는 presetId가 없으므로 optional로 한다.

```typescript
import type { SeatPresetId } from "@/lib/seat-preset";

export interface Show {
  id: string;
  title: string;
  description: string;
  posterUrl?: string;
  presetId?: SeatPresetId;
}
```

주의: `SeatPresetId`의 import 경로가 순환 참조를 만들지 않도록 한다. 만약 순환이 생기면 `SeatPresetId` 타입을 types/index.ts에 직접 정의하고 seat-preset.ts에서 re-export하는 방식도 허용한다.

### 2. 입력 검증 스키마 — 테스트 먼저 (`src/lib/show-validation.test.ts` 생성)

**테스트 케이스:**
- 유효한 입력을 통과시킨다
- title이 빈 문자열이면 실패한다
- title이 100자를 초과하면 실패한다
- description이 2000자를 초과하면 실패한다
- 잘못된 presetId (예: "huge")면 실패한다
- sessions 배열이 비어있으면 실패한다
- sessions 배열이 10개를 초과하면 실패한다
- posterUrl이 빈 문자열이면 실패한다

### 3. 입력 검증 스키마 구현 (`src/lib/show-validation.ts` 생성)

```typescript
import { z } from "zod";

export const createShowInputSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  posterUrl: z.string().min(1),
  presetId: z.enum(["small", "medium", "large"]),
  sessions: z.array(z.string().min(1)).min(1).max(10),
});

export type CreateShowInput = z.infer<typeof createShowInputSchema>;
```

### 4. ShowStore.create — 테스트 먼저 (`src/services/show-store-memory.test.ts` 확장)

기존 테스트를 유지하면서 create 관련 테스트를 추가한다.

**테스트 케이스:**
- 공연을 생성하면 show + sessions를 반환한다
- 생성된 show의 id가 유효한 문자열이다
- 생성된 sessions의 수가 입력 sessions 배열 길이와 일치한다
- 생성된 sessions 각각의 showId가 show.id와 같다
- 생성 후 list()에 새 공연이 포함된다 (기존 8개 + 1)
- 생성 후 get(id)로 조회 가능하다
- presetId가 show에 저장된다

### 5. ShowStore.create 구현 (`src/services/show-store-memory.ts` 수정)

현재 `MOCK_SHOWS`와 `MOCK_SESSIONS`를 readonly 배열로 직접 참조하고 있다. create를 구현하려면:

1. 내부 mutable 배열을 만들고 MOCK 데이터를 초기값으로 복사한다
2. list()는 이 가변 배열에서 반환한다
3. get()도 이 가변 배열에서 조회한다
4. create()는:
   - `createShowInputSchema`로 input을 파싱한다
   - show ID를 `crypto.randomUUID()`로 생성한다
   - `generateSessionsForShow(showId, input.sessions)` 호출
   - posterUrl은 input에서 받은 값 그대로 저장 (Step 4에서 API가 검증)
   - 내부 배열에 show, sessions를 추가한다
   - `{ show, sessions }` 반환한다

핵심 규칙:
- 기존 list(), get() 동작과 테스트를 깨뜨리지 않는다
- globalThis 싱글톤 패턴을 유지한다 (HMR 시 데이터 보존)

## Acceptance Criteria

```bash
npx vitest run src/services/show-store-memory.test.ts && npx vitest run src/lib/show-validation.test.ts
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

- 기존 list/get 테스트를 깨뜨리지 마라
- API route를 만들지 마라. Step 4의 스코프이다
- 좌석 프리셋 로직(`seat-preset.ts`)을 수정하지 마라. Step 0에서 완성되었다
- ShowStore 인터페이스(`show-store.ts`)를 수정하지 마라
- mock-data.ts를 수정하지 마라

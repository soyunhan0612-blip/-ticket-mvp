# Step 0: show-store

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — Store 인터페이스 정의 및 팩토리 교체 원칙
- `/docs/ADR.md` — 특히 ADR-003 (Store 인터페이스 분리와 Redis 교체)
- `/src/types/index.ts` — Show, Session 도메인 타입
- `/src/lib/mock-data.ts` — MOCK_SHOWS(8개), MOCK_SESSIONS(24개)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`ShowStore` 인터페이스와 인메모리 구현체, 팩토리를 만든다. Day 9에 Redis 구현체로 교체할 때 팩토리 한 줄만 바꾸면 되도록 설계한다.

### 파일 1 — `src/services/show-store.ts`

인터페이스와 관련 타입만 정의한다. 구현은 여기에 넣지 마라.

```ts
import type { Show, Session } from "@/types";

export interface ShowStore {
  list(): Promise<Show[]>;
  get(id: string): Promise<{ show: Show; sessions: Session[] } | null>;
  create(input: unknown): Promise<{ show: Show; sessions: Session[] }>;
}
```

### 파일 2 — `src/services/show-store-memory.ts`

`MOCK_SHOWS` / `MOCK_SESSIONS`를 소비하는 인메모리 구현체.

- `list()`: `MOCK_SHOWS` 전체를 반환
- `get(id)`: 해당 id의 show가 있으면 `{ show, sessions: MOCK_SESSIONS.filter(s => s.showId === id) }`, 없으면 `null`
- `create()`: **지금은 구현하지 마라**. `throw new Error("ShowStore.create — Day 8 스코프")` 정도만. 이유: Day 8(셀러 등록)에서 진짜로 필요할 때 설계·구현. 지금 만들면 뜯어내야 함
- 개발 HMR로 인해 모듈이 다시 로드되어도 인스턴스가 유지되도록 `globalThis` 싱글톤 패턴 사용

### 파일 3 — `src/services/index.ts`

팩토리. 지금은 memory만 반환.

```ts
import { createShowStoreMemory } from "./show-store-memory";
import type { ShowStore } from "./show-store";

export type { ShowStore } from "./show-store";

let instance: ShowStore | null = null;

export function getShowStore(): ShowStore {
  if (!instance) instance = createShowStoreMemory();
  return instance;
}
```

### 파일 4 — `src/services/show-store-memory.test.ts` (테스트 먼저)

`services/` 편집은 `tdd-guard` 훅이 테스트 선행을 강제한다. 반드시 아래 테스트를 먼저 작성하고, 실패하는 것을 확인한 뒤 구현하라.

검증할 것:
- `list()`가 8개 반환, 모두 유일한 id
- `get("show-01")`가 해당 show와 그 회차들만 반환 (다른 show의 회차 포함 X)
- `get("nonexistent-id")`가 `null`
- `create()` 호출 시 throw

## Acceptance Criteria

```bash
npm run lint
npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `services/` 디렉토리에 파일들이 있는가? (ARCHITECTURE.md)
   - 인터페이스는 `services/show-store.ts`, 구현체는 `services/show-store-memory.ts`로 분리됐는가? (ADR-003)
   - `MOCK_SHOWS`·`MOCK_SESSIONS`를 재사용했는가? (중복 정의 X)
   - `globalThis` 싱글톤을 썼는가?
3. 결과에 따라 `phases/1-shows-rsc/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약 (예: services/show-store.ts 인터페이스 + memory 구현체 + 팩토리 + tests)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"`

## 금지사항

- `create()`를 실제로 구현하지 마라. 이유: Day 8 스코프. 지금 구현하면 뜯어내야 함
- `MOCK_SHOWS`·`MOCK_SESSIONS`를 복제하거나 새로 정의하지 마라. 이유: 데이터 원본은 `lib/mock-data.ts` 하나여야 함
- `services/show-store-memory.ts`에 인터페이스 재정의를 넣지 마라. 이유: 인터페이스는 `show-store.ts` 하나
- Redis 관련 코드는 지금 만들지 마라. 이유: Day 9 스코프
- 테스트 없이 `services/` 파일을 작성하지 마라. `tdd-guard` 훅이 차단할 것이다
- 기존 테스트를 깨뜨리지 마라

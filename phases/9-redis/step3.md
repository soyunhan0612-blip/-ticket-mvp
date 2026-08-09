# Step 3: show-store-redis

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — Store 인터페이스 절
- `/src/services/show-store.ts` — 구현할 인터페이스 (변경 금지)
- `/src/services/show-store-memory.ts` — **동작의 기준이 되는 참조 구현**
- `/src/services/show-store-memory.test.ts` — 기존 테스트 6건
- `/src/services/redis-client.ts` — Step 1에서 생성
- `/src/services/seat-store-redis.ts` — Step 2에서 생성. 키 네이밍·직렬화 방식을 맞춰라
- `/src/lib/mock-data.ts` — `MOCK_SHOWS` 8개, `MOCK_SESSIONS` 24개
- `/src/lib/show-validation.ts` — `createShowInputSchema`
- `/src/lib/seat-preset.ts` — `generateSessionsForShow`
- `/src/app/api/shows/route.ts` — 이 store를 소비하는 곳
- `/src/types/index.ts` — `Show`, `Session`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/services/show-store-redis.ts`를 만든다. `src/services/`는 TDD 강제 구간이므로 **테스트를 먼저 작성하라.**

### 구현할 인터페이스 (시그니처 변경 금지)

```typescript
list(): Promise<Show[]>
get(id: string): Promise<{ show: Show; sessions: Session[] } | null>
getBySessionId(sessionId: string): Promise<{ show: Show; session: Session } | null>
create(input: unknown): Promise<{ show: Show; sessions: Session[] }>
```

### 자료구조

키 설계는 재량이되 다음을 만족하라:
- `list()`가 좌석 스냅샷처럼 빈번히 호출되지는 않지만, 공연 수에 비례해 왕복이 늘어나지 않도록 하라 (예: 공연 Hash 하나 + 회차 Hash 하나)
- `getBySessionId(sessionId)`가 전체 회차를 스캔하지 않고 조회되도록 하라. 이 메서드는 좌석 페이지 RSC에서 매 요청 호출된다
- `KEYS` 명령을 쓰지 마라. 프로덕션 Redis에서 금기이고 Upstash 커맨드 비용도 예측 불가능해진다

### 시드 주입 — 멱등해야 한다

`MOCK_SHOWS` 8개와 `MOCK_SESSIONS` 24개를 Redis에 시드해야 한다. 인메모리 구현은 배열을 복사해 시작했지만, Redis는 영속적이라 **매번 시드하면 재배포마다 공연이 중복 생성된다.**

- 시드가 이미 주입됐는지 표시하는 플래그 키를 두거나, 고정 ID로 덮어쓰기(upsert)하라. `MOCK_SHOWS`의 ID는 `show-01`~`show-08`로 고정돼 있으므로 후자가 자연스럽다
- 시드 주입은 여러 번 호출돼도 결과가 같아야 한다
- **셀러가 등록한 공연을 시드가 지우면 안 된다.** 시드는 자기 ID 범위만 건드려야 한다. 이것을 테스트로 검증하라

### create의 검증 유지

`create()`는 인메모리 구현과 동일하게 `createShowInputSchema.parse(input)`으로 재검증하라. route에서 이미 검증하지만 store도 방어한다.

`generateSessionsForShow(show.id, parsedInput.sessions)`로 회차를 생성하는 흐름도 동일하게 유지한다.

### 테스트 (`src/services/show-store-redis.test.ts`)

`show-store-memory.test.ts`의 시나리오를 커버하고 다음을 추가하라:
- 시드를 두 번 주입해도 공연 수가 8개 그대로다 (멱등성)
- `create`로 공연을 만든 뒤 시드를 다시 주입해도 만든 공연이 남아 있다
- `create` 후 `list()`에 새 공연이 포함된다
- `create` 후 `getBySessionId`로 생성된 회차를 찾을 수 있다
- 잘못된 입력(`title` 빈 문자열, 101자, 잘못된 `presetId`)이면 throw

Step 2와 마찬가지로 **인메모리 fake Redis 또는 모킹으로 테스트하라.** 실제 Upstash 연결에 의존하지 마라.

## Acceptance Criteria

```bash
npx vitest run src/services/show-store-redis.test.ts
npm run lint
npm test
npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/9-redis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 시드를 무조건 주입하는 코드를 쓰지 마라. 이유: 재배포마다 공연이 중복 생성되고, 셀러가 등록한 공연이 사라질 수 있다. Redis는 영속적이라는 것이 인메모리와의 결정적 차이다
- `KEYS` 명령을 쓰지 마라. 이유: 전체 키스페이스를 스캔한다. 프로덕션 금기이며 Upstash 커맨드 비용이 예측 불가능해진다
- `getBySessionId`를 전체 회차 스캔으로 구현하지 마라. 이유: 좌석 페이지 RSC가 매 요청 호출한다
- `ShowStore` 인터페이스의 시그니처를 바꾸지 마라. 이유: Step 5의 팩토리 교체가 프론트 수정 없이 성립해야 한다
- `create()`의 zod 재검증을 제거하지 마라. 이유: store 레벨 방어 심층화다
- `src/services/index.ts`나 route handler를 수정하지 마라. 이유: 팩토리 교체는 Step 5의 단일 커밋이다
- 실제 Upstash에 연결하는 테스트를 작성하지 마라. 이유: CI에 키가 없다. 실제 연결 검증은 Step 6이다
- 기존 테스트를 깨뜨리지 마라

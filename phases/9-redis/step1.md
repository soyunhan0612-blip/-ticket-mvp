# Step 1: redis-client

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — "Redis 자료구조" 절
- `/docs/ADR.md` — ADR-003 (Store 인터페이스 분리와 팩토리 교체)
- `/src/services/index.ts` — 팩토리. Step 5에서 이 파일이 `hasRedisConfig()`를 쓴다
- `/src/services/seat-store-memory.ts` — `globalThis` 싱글톤 패턴 참조
- `/.env.example` — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `/package.json` — `@upstash/redis`가 설치돼 있는지 확인
- `/vitest.setup.ts` — 현재 `@testing-library/jest-dom` import만 있다
- `/src/app/api/admin/stats/route.test.ts` — `getSeatStore()`/`getShowStore()`를 직접 호출한다
- `/src/app/api/sessions/[id]/snapshot/route.test.ts` — `getSeatStore()`를 직접 호출한다

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/services/redis-client.ts`를 만든다. Upstash 클라이언트 싱글톤과 설정 존재 여부 판정을 제공한다.

`src/services/`는 TDD 강제 구간이다. **테스트를 먼저 작성하라.**

### 1. 테스트 (`src/services/redis-client.test.ts`)

- 두 환경변수가 모두 있으면 `hasRedisConfig()`가 `true`
- 하나라도 없거나 빈 문자열이면 `false`
- 환경변수가 없을 때 모듈을 import하는 것만으로 throw하지 않는다

환경변수는 테스트 안에서 조작하라 (`vi.stubEnv` 등). 테스트가 실제 Upstash에 연결하면 안 된다.

### 2. 구현 (`src/services/redis-client.ts`)

```typescript
import { Redis } from "@upstash/redis";

export function hasRedisConfig(): boolean;
export function getRedisClient(): Redis;
```

동작 규칙:

- `hasRedisConfig()`는 `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN`이 **둘 다 비어 있지 않을 때만** `true`를 반환한다.
- **모듈 로드 시점에 환경변수를 검사해 throw하지 마라.** 반드시 함수 호출 시점에 읽어라. 이유: 키가 없는 환경(CI, 심사자 로컬)에서도 앱이 떠야 하고, Step 5의 팩토리가 `hasRedisConfig()`로 분기해 인메모리로 폴백한다. import만으로 죽으면 그 폴백이 불가능하다.
- `getRedisClient()`는 싱글톤을 반환한다. `globalThis` 캐싱 패턴은 `seat-store-memory.ts`를 참조하라 — Next.js HMR에서 연결이 중복 생성되는 것을 막는다.
- 설정이 없는 상태에서 `getRedisClient()`가 호출되면 명확한 에러 메시지와 함께 throw하라. 이 함수는 `hasRedisConfig()`가 `true`일 때만 호출되어야 한다.

### 3. 테스트 환경 격리 (`vitest.setup.ts`) — 반드시 하라

`vitest.setup.ts`에 **Upstash 환경변수를 테스트 실행 시 무조건 제거하는 코드를 추가하라.**

```typescript
// 기존 import 유지
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
```

이유를 정확히 이해하라. 다음 기존 테스트들이 `@/services`의 팩토리를 **직접 호출**한다:

- `src/app/api/admin/stats/route.test.ts` — `getSeatStore().hold(...)`, `getShowStore().create(...)`
- `src/app/api/sessions/[id]/snapshot/route.test.ts` — `getSeatStore().hold(...)`
- `src/services/index.test.ts`

Step 5에서 팩토리가 환경변수 유무로 분기하게 되면, 셸에 `UPSTASH_*`가 export된 상태(Step 6에서 자격증명을 다루다 보면 흔히 발생한다)에서 이 테스트들이 **실제 Upstash에 네트워크 연결을 시도하다 깨진다.** 그리고 Step 5는 `src/app/**` 수정을 금지하므로 그 시점에는 손쓸 방법이 없다.

`vitest.setup.ts`는 `src/app/**`가 아니므로 Step 5의 diff 제약과 무관하다. **이 격리를 지금 넣어두는 것이 그 교착을 막는 유일한 지점이다.**

단, 개별 테스트가 `vi.stubEnv`로 키를 주입하는 것은 막지 않아야 한다. setup은 프로세스 시작 시 1회만 삭제하면 된다.

## Acceptance Criteria

```bash
npx vitest run src/services/redis-client.test.ts
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

- 모듈 최상위에서 환경변수를 검증해 throw하지 마라. 이유: 키 없는 환경에서 앱 전체가 죽는다. Step 5의 인메모리 폴백이 성립하지 않는다
- `NEXT_PUBLIC_` 접두사를 붙이지 마라. 이유: 토큰이 브라우저 번들에 평문 유출된다 (CLAUDE.md CRITICAL)
- 클라이언트 컴포넌트에서 import 가능한 형태로 만들지 마라. 이 파일은 서버 전용이다. 이유: 번들에 토큰이 섞여 들어갈 경로를 만들지 않는다
- 실제 Upstash에 연결하는 테스트를 작성하지 마라. 이유: CI에 키가 없고, 네트워크 의존 테스트는 불안정하다. 실제 연결 검증은 Step 6에서 한다
- store 구현체를 이 step에서 만들지 마라. 이유: Step 2~4의 스코프다
- `src/services/index.ts`를 수정하지 마라. 이유: 팩토리 교체는 Step 5의 단일 커밋이어야 한다
- `vitest.setup.ts`의 환경변수 격리를 생략하지 마라. 이유: Step 5 이후 셸에 `UPSTASH_*`가 있으면 route 테스트가 실제 Upstash에 붙어 깨지는데, Step 5는 `src/app/**` 수정이 금지돼 있어 그 시점에는 고칠 수 없다
- `src/app/**`의 기존 테스트 파일을 수정하지 마라. 이유: 환경변수 격리로 해결되는 문제다. 테스트를 고치면 Step 5의 diff 증거가 오염된다
- 기존 테스트를 깨뜨리지 마라

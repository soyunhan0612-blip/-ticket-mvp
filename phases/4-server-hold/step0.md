# Step 0: hold-logic

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` — ADR-003, ADR-004
- `/src/types/index.ts`

## 작업

`src/lib/hold.ts`를 TDD로 구현한다. 이 모듈은 hold 만료 판정의 **단일 출처**이며, 인메모리 구현체와 향후 Redis Lua 테스트에서 동일한 규칙을 검증하는 데 쓰인다.

### export할 시그니처

```ts
export const HOLD_TTL_MS = 300_000; // 5분

export function isExpired(expiresAt: number, now?: number): boolean;
// now를 생략하면 Date.now() 사용
// expiresAt <= now이면 만료(true)

export function createExpiresAt(now?: number): number;
// now를 생략하면 Date.now() 사용
// 반환값: now + HOLD_TTL_MS
```

### TDD 순서

테스트 파일 `src/lib/hold.test.ts`를 **반드시 먼저** 작성한다.

테스트 케이스:
1. `HOLD_TTL_MS`가 300000인지 확인
2. `isExpired` — 만료 전 (expiresAt > now) → false
3. `isExpired` — 정확히 만료 시점 (expiresAt === now) → true
4. `isExpired` — 만료 후 (expiresAt < now) → true
5. `isExpired` — now 생략 시 Date.now() 사용 (동작 확인)
6. `createExpiresAt` — now를 넘기면 now + HOLD_TTL_MS 반환
7. `createExpiresAt` — now 생략 시 합리적 범위인지

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `hold.ts`가 순수 함수만 export하는가? (I/O/전역 상태 금지, Date.now()만 허용)
   - `HOLD_TTL_MS`가 300000인가?
   - `isExpired`에서 경계값(expiresAt === now)이 만료로 판정되는가?
3. 결과에 따라 `phases/4-server-hold/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `isExpired`에서 throw하지 마라. boolean만 반환한다.
- `Date.now()`를 직접 호출하는 코드를 `services/` 또는 `app/api/`에 넣지 마라. 만료 판정은 반드시 이 모듈을 통해서만 한다.
- 기존 테스트를 깨뜨리지 마라.

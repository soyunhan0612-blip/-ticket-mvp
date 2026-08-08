# Step 2: seat-store-impl

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — SeatStore 인터페이스, Redis 자료구조 섹션
- `/docs/ADR.md` — ADR-003 (Store 인터페이스 분리), ADR-004 (세션당 Hash)
- `/src/types/index.ts` — Hold, SeatSnapshotEntry, SeatSnapshot 타입
- `/src/lib/hold.ts` — Step 0에서 생성됨. isExpired, createExpiresAt, HOLD_TTL_MS
- `/src/lib/seat-rules.ts` — validateSelection (참조용. 이 step에서는 호출하지 않음)
- `/src/services/show-store.ts` — 기존 Store 인터페이스 패턴
- `/src/services/show-store-memory.ts` — globalThis 싱글톤 패턴 참조
- `/src/services/index.ts` — 팩토리 패턴 참조

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. `src/types/index.ts` 수정

`Hold` 인터페이스에 `id: string` 필드를 추가한다. hold 생성 시 고유 ID가 필요하다.

```ts
export interface Hold {
  id: string;       // ← 추가
  sessionId: string;
  seatIds: string[];
  userId: string;
  expiresAt: number;
}
```

기존 Hold 타입을 사용하는 코드가 없으므로 호환성 문제 없다.

### 2. `src/services/seat-store.ts` — 인터페이스만 정의

```ts
import type { Hold, SeatSnapshot } from "@/types";

export interface SeatStore {
  hold(sessionId: string, seatIds: string[], userId: string): Promise<Hold | { conflict: string[] }>;
  release(sessionId: string, seatIds: string[], userId: string): Promise<void>;
  getSnapshot(sessionId: string, userId: string): Promise<SeatSnapshot>;
}
```

- `hold`: 성공 시 `Hold`, 충돌 시 `{ conflict: string[] }` (충돌 좌석 ID 목록).
- `release`: 소유권 불일치 시 에러 throw ("FORBIDDEN" 포함). 성공 시 빈 Promise.
- `getSnapshot`: `SeatSnapshot` 반환. `mine: boolean` 환원은 구현체에서 userId 비교.

### 3. `src/services/seat-store-memory.ts` — 인메모리 구현체

`globalThis` 싱글톤 패턴 사용 (`show-store-memory.ts`와 동일).

내부 자료구조 (ADR-004 세션당 Hash 모방):

```ts
interface HoldEntry {
  userId: string;
  expiresAt: number;
  status: 'held' | 'sold';
}

// Map<sessionId, { seats: Map<seatId, HoldEntry>, version: number }>
```

#### hold(sessionId, seatIds, userId)
1. 만료된 엔트리 정리 (요청된 seatIds에 대해서만, `isExpired` 사용)
2. 충돌 체크: 요청된 seatIds 중 이미 점유된(미만료, 다른 userId 또는 sold) 좌석이 있으면 `{ conflict: [...] }` 반환
3. **하나라도 충돌하면 아무것도 변경하지 않는다** (원자적 전체 성공/실패)
4. 같은 userId가 이미 held한 좌석이면 expiresAt 갱신
5. 모든 좌석이 가용하면 전부 hold → `Hold` 객체 반환 (id는 `crypto.randomUUID()`)
6. version 증가

#### release(sessionId, seatIds, userId)
1. 각 좌석에 대해 소유권 확인: 해당 좌석의 userId가 요청자와 불일치하면 에러 throw (메시지에 "FORBIDDEN" 포함)
2. 만료되었거나 존재하지 않는 좌석 release 시에는 에러 없이 무시 (이미 해제된 것과 동일)
3. 소유권 일치하는 좌석을 Map에서 삭제
4. version 증가

#### getSnapshot(sessionId, userId)
1. 해당 세션의 모든 엔트리를 순회하며 만료된 held 엔트리 정리 (삭제)
2. 남은 엔트리를 `SeatSnapshotEntry`로 변환: `mine: entry.userId === userId`일 때만 `mine: true`. held일 때만 `expiresAt` 포함.
3. `{ version, serverNow: Date.now(), seats }` 형태의 `SeatSnapshot` 반환

### 4. `src/services/index.ts` 수정

`getSeatStore()` 팩토리를 추가한다. 기존 `getShowStore()`와 동일한 패턴:

```ts
import { createSeatStoreMemory } from "./seat-store-memory";
import type { SeatStore } from "./seat-store";

export type { SeatStore } from "./seat-store";

let seatInstance: SeatStore | null = null;

export function getSeatStore(): SeatStore {
  if (!seatInstance) seatInstance = createSeatStoreMemory();
  return seatInstance;
}
```

### TDD 순서

테스트 파일 `src/services/seat-store-memory.test.ts`를 **반드시 먼저** 작성한다.

테스트 케이스:

**hold:**
1. 빈 세션에 좌석 hold → Hold 객체 반환 (id, sessionId, seatIds, userId, expiresAt 확인)
2. 이미 다른 사용자가 hold한 좌석 → `{ conflict: [...] }` 반환, 아무 좌석도 변경 안 됨
3. 다중 좌석 중 하나가 충돌 → 전체 실패 (부분 hold 없음), conflict에 충돌 좌석만 포함
4. 만료된 hold가 있는 좌석 → 재hold 성공
5. 같은 사용자가 같은 좌석 재hold → expiresAt 갱신 (성공)

**release:**
6. 자기 좌석 release → 해당 좌석이 getSnapshot에서 사라짐
7. 남의 좌석 release 시도 → 에러 throw ("FORBIDDEN" 포함)
8. 존재하지 않는 좌석 release → 에러 throw하지 않음 (이미 해제된 것과 동일)

**getSnapshot:**
9. 빈 세션 → seats가 빈 객체
10. hold 후 본인 조회 → mine: true, expiresAt 포함
11. hold 후 타인 조회 → mine 없음 (또는 false)
12. 만료된 hold → getSnapshot에서 자동 정리, seats에 포함되지 않음
13. version이 hold/release마다 증가하는지 확인

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 인터페이스와 구현체가 분리되어 있는가? (ADR-003)
   - `globalThis` 싱글톤을 사용했는가?
   - 내부 자료구조가 세션당 Map 구조인가? (ADR-004)
   - 점유 좌석만 저장하는가? (available은 저장 X)
   - `isExpired`/`createExpiresAt`를 `lib/hold.ts`에서 import했는가?
   - 다중 좌석 hold가 원자적인가? (하나 충돌 시 전체 실패)
   - `release`에서 소유권 불일치 시 에러를 throw하는가?
   - `getSnapshot`에서 만료 정리 후 `mine: boolean` 환원이 되는가?
   - 응답에 타인의 userId가 포함되지 않는가?
3. 결과에 따라 `phases/4-server-hold/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `Date.now()`를 구현체에서 직접 호출하여 만료 판정하지 마라. 반드시 `lib/hold.ts`의 `isExpired`를 사용하라.
- `SeatSnapshotEntry`에 타인의 userId를 싣지 마라.
- `confirmSeats`, `releaseSold`, `revertSold`를 지금 구현하지 마라. 이유: Day 7 스코프.
- 테스트 없이 `services/` 파일을 작성하지 마라. tdd-guard가 차단한다.
- 기존 테스트를 깨뜨리지 마라.

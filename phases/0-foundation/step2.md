# Step 2: core-types-mocks

## 읽어야 할 파일

- `/CLAUDE.md` — 아키텍처 규칙 (좌석 규칙 서버 재검증, IDOR)
- `/docs/ARCHITECTURE.md` — Store 인터페이스, 폴링 페이로드 스키마
- `/docs/PRD.md` — 좌석 2000석 / 공연 8개 / 회차 24개 규모
- 이전 step 산출물: `tsconfig.json`, `src/app/`

## 작업

프로젝트의 도메인 타입과 순수 로직을 만든다. Route/Store/컴포넌트가 앞으로 전부 이 파일들을 참조한다. **`lib/` 파일은 tdd-guard가 차단하므로 반드시 테스트를 먼저 작성**한다.

### 1. `src/types/index.ts` — 도메인 타입

시그니처 수준:

```ts
export type SeatStatus = 'available' | 'held' | 'sold';

export interface Seat {
  id: string;          // 예: "A-3-12" (구역-열-번)
  section: string;     // 예: "A"
  row: number;         // 예: 3
  col: number;         // 예: 12
  x: number;           // SVG 좌표
  y: number;
}

export interface Show {
  id: string;
  title: string;
  posterPreset: 'p1' | 'p2' | 'p3';
  description: string;
  sessionIds: string[];
}

export interface Session {
  id: string;
  showId: string;
  startsAt: number;    // epoch ms
  seatPreset: 'small' | 'medium' | 'full';  // 프리셋 3개
}

export interface Hold {
  seatId: string;
  userId: string;      // 서버 내부용. 응답에는 노출 X
  expiresAt: number;   // epoch ms
}

export interface Reservation {
  id: string;
  userId: string;      // 서버 내부용
  sessionId: string;
  seatIds: string[];
  createdAt: number;
  cancelledAt?: number;
}

// 폴링 페이로드 — mine은 반드시 boolean (userId 노출 금지)
export interface SeatSnapshot {
  version: number;
  serverNow: number;
  seats: Record<string, {
    s: 'held' | 'sold';
    mine?: boolean;    // s === 'held'일 때만 의미
    expiresAt?: number;
  }>;
}

export interface HoldResult {
  ok: boolean;
  conflicts?: string[]; // 실패 시 충돌 좌석 ID들 (전체 실패, 부분 hold 없음)
}
```

`types/`는 tdd-guard 통과. 테스트 불필요.

### 2. `src/lib/seat-map.ts` — 좌석 ID ↔ 좌표

**테스트 먼저** (`src/lib/seat-map.test.ts`).

시그니처:

```ts
export interface SeatCoord { section: string; row: number; col: number; }

export function parseSeatId(id: string): SeatCoord | null;
export function toSeatId(coord: SeatCoord): string;
export function isValidSeatId(id: string, preset: 'small' | 'medium' | 'full'): boolean;
```

- `parseSeatId('A-3-12')` → `{ section: 'A', row: 3, col: 12 }`
- 잘못된 형식은 `null` 반환 (throw X)
- `isValidSeatId`는 프리셋의 좌석 범위 안에 있는지 검증. **Redis 키 인젝션·용량 공격 방어의 핵심**이므로 반드시 프리셋을 벗어난 ID는 `false` 반환

### 3. `src/lib/seat-rules.ts` — 좌석 선택 규칙

**테스트 먼저** (`src/lib/seat-rules.test.ts`).

```ts
export const MAX_SEATS_PER_HOLD = 4;

export function canHoldSeats(seatIds: string[]): { ok: true } | { ok: false; reason: string };
```

- 좌석 수 > 4 → `{ ok: false, reason: '한 번에 4석까지만' }`
- 좌석 수 === 0 → `{ ok: false, reason: '최소 1석' }`
- 중복 좌석 ID 포함 → `{ ok: false, reason: '중복 좌석' }`
- 그 외 → `{ ok: true }`

**이 함수는 route handler에서도 반드시 호출된다** (CLAUDE.md CRITICAL 규칙). UI에서만 쓰면 `curl`로 2000석 hold 가능.

### 4. `src/lib/mock-data.ts` — 시드 데이터

**테스트 먼저** (`src/lib/mock-data.test.ts`).

시그니처:

```ts
export function generateSeats(preset: 'small' | 'medium' | 'full'): Seat[];
export const MOCK_SHOWS: Show[];       // 8개
export const MOCK_SESSIONS: Session[]; // 24개 (공연당 평균 3회차)
```

- `full` 프리셋은 **2000석** 생성 (예: 20 구역 × 20열 × 5번 = 2000, 또는 유사한 배치). 구역 A~T, 좌석 좌표 x/y는 SVG 렌더에 쓸 수 있게 계산해서 반환
- `small`, `medium`은 각각 100석, 500석 정도
- `MOCK_SHOWS`는 8개, 각 공연은 3개 회차를 가리키게

## Acceptance Criteria

```bash
npm run test         # lib/seat-map, lib/seat-rules, lib/mock-data 테스트 통과
npm run build        # 타입 에러 없음
```

## 검증 절차

1. 위 AC 통과.
2. 아키텍처 체크리스트:
   - 도메인 타입이 `types/`에만 있고 각 lib/service가 자체 타입을 중복 정의하지 않음?
   - `Seat`/`Hold`/`Reservation`에 `userId`가 있어도 **응답 타입인 `SeatSnapshot`에는 없음**? (mine boolean만)
   - `MAX_SEATS_PER_HOLD = 4`가 상수로 export되어 서버·클라이언트 양쪽에서 참조 가능?
   - `full` 프리셋이 정확히 2000석?
3. tdd-guard 정상 동작 확인: `lib/foo.ts`를 테스트 없이 만들려 시도해서 차단되는지 (수동 스팟체크)
4. 결과에 따라 `phases/0-foundation/index.json`의 step 2를 업데이트:
   - 성공 → `"summary": "types/index.ts + lib/{seat-map, seat-rules, mock-data}.ts 완료. full 프리셋 2000석"`

## 금지사항

- `SeatStore` 등 인터페이스를 이 step에서 정의하지 마라. 이유: Phase 2 Step 0 스코프. 지금 정의하면 인터페이스 변경 시 여러 phase를 건드려야 함
- `Reservation.userId`를 응답 타입(`SeatSnapshot`)에 포함하지 마라. 이유: 좌석 탈취 경로 (CLAUDE.md CRITICAL)
- `MAX_SEATS_PER_HOLD`를 매직 넘버로 여러 곳에 쓰지 마라. 반드시 export 상수 참조
- `generateSeats`가 랜덤을 쓰지 마라. 이유: 테스트 결정론성 깨짐. 좌표는 결정적으로 계산
- 기존 테스트를 깨뜨리지 마라

# Step 2: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙, 특히 "응답에 남의 userId를 절대 싣지 않는다"와 `mine: boolean` 원칙
- `/docs/ARCHITECTURE.md` — Store 인터페이스 시그니처(`SeatStore`, `ShowStore`, `ReservationStore`), Redis 자료구조, 폴링 페이로드 예시
- `/docs/PRD.md` — Day 1의 타입 목록 (`Show / Session / Seat / SeatStatus / Hold / Reservation / SeatSnapshot`), MVP 범위
- `/docs/UX_PRINCIPLES.md` — 좌석 4상태의 의미
- `/src/lib/__scaffold-smoke__.test.ts` (또는 스캐폴딩 시 생긴 이름) — Step 1이 남긴 파일 구조 확인용
- `/package.json`, `/tsconfig.json` — Step 1 산출물, TS strict 여부 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/types/index.ts` **한 파일**에 도메인 타입 7종을 정의한다. 이 타입들은 이후 모든 step(lib, services, api route, components)의 계약이 된다.

> **TDD 가드 관련**: `src/types/`는 CLAUDE.md의 TDD 강제 구간에서 제외된다. 테스트는 필요 없다. 순수 타입 선언만 넣는다.

### 정의해야 할 타입 7종

각 타입의 필수 특성만 지시한다. 세부 필드명·optional 여부는 아래 요구를 만족하는 한 자유롭게 결정하라.

#### 1) `Show`
- 최소 필드: `id: string`, `title: string`, `description: string`, `posterUrl?: string`
- 셀러가 등록한 공연도 담을 수 있어야 한다 (Day 8)

#### 2) `Session`
- 최소 필드: `id: string`, `showId: string`, `startsAt: string` (ISO 8601)
- `venueName` 등 부가 정보는 재량

#### 3) `Seat`
- 정적 좌석 배치 정보 (상태 아님)
- 최소 필드: `id: string`, `section: string`, `row: number`, `col: number`
- 좌석 ID 형식은 Step 3(`seat-map`)에서 확정한다. 여기서는 문자열 타입만 지정.

#### 4) `SeatStatus`
- 유니온 타입: `"available" | "held" | "sold"`
- 클라이언트 표시용 `"held-mine" | "held-other"`는 여기 넣지 마라. 서버 응답은 `held` 하나만 내려주고 `mine: boolean`으로 구분한다.

#### 5) `Hold`
- 최소 필드: `sessionId: string`, `seatIds: string[]`, `userId: string`, `expiresAt: number` (epoch ms)
- 서버 내부 상태를 표현하는 타입. 클라이언트 응답에 `userId`가 그대로 나가면 안 된다는 점을 기억하라.

#### 6) `Reservation`
- 최소 필드: `id: string`, `sessionId: string`, `seatIds: string[]`, `userId: string`, `status: "confirmed" | "cancelled"`, `createdAt: number`
- Day 7 (`ReservationStore`)에서 사용된다.

#### 7) `SeatSnapshot`
- 폴링 응답 형태. ARCHITECTURE.md의 예시:
  ```jsonc
  { "version": 12, "serverNow": 1760000000000, "seats": { "A5": {"s":"held","mine":true,"expiresAt":1760000120000}, "B1": {"s":"sold"} } }
  ```
- 최소 필드:
  - `version: number`
  - `serverNow: number` (epoch ms)
  - `seats: Record<string, SeatSnapshotEntry>` — 점유된 좌석만 포함
- `SeatSnapshotEntry`(별도 타입으로 분리해도 됨):
  - `s: "held" | "sold"`
  - `mine?: boolean` — **반드시 boolean, 절대 string으로 userId를 노출하지 마라**
  - `expiresAt?: number` — `s: "held"`인 경우에만 의미가 있다

## Acceptance Criteria

```bash
npx tsc --noEmit   # 타입 에러 없음
npm run lint       # 통과
npm run test       # 기존 스모크 테스트 통과 (새 테스트 추가 불필요)
npm run build      # 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `SeatSnapshot`의 `mine`이 `boolean` 타입인가? (string이면 안 됨)
   - `SeatStatus`에 `"held-mine"`·`"held-other"`가 들어가 있지 않은가? (서버 스키마 오염)
   - `Reservation.status`가 명시적 유니온인가?
   - `Show`/`Session`/`Seat`가 서로 참조하는 관계가 명확한가? (`Session.showId → Show.id`, `Seat`는 세션 독립적)
   - 모든 타입이 `src/types/index.ts` 한 파일 안에 있는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/types/index.ts에 도메인 타입 7종(Show/Session/Seat/SeatStatus/Hold/Reservation/SeatSnapshot) 정의, SeatSnapshot은 mine:boolean으로 userId 노출 없음"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 즉시 중단

## 금지사항

- `SeatStatus`에 `"held-mine"`·`"held-other"`를 넣지 마라. 이유: 이 두 값은 UI 표시용이지 서버 스키마가 아니다. 서버는 `held` 하나만 내려주고 클라이언트가 `mine` 불리언과 조합해 결정한다.
- `SeatSnapshotEntry`의 `mine` 자리에 `userId: string`을 넣지 마라. 이유: 인증이 없는 구조라 남의 `userId` 노출은 곧 좌석 탈취 경로다 (ADR-005).
- 클래스나 함수를 만들지 마라. 이유: 이 step은 타입 선언 전용이다. 로직은 Step 3 이후 `src/lib/`에서 다룬다.
- 타입을 여러 파일로 쪼개지 마라. 이유: `src/types/index.ts` 한 파일이 계약의 단일 출처다. 파일 늘리면 import 경로가 갈리고 이후 step이 헷갈린다.
- `enum`을 쓰지 마라. 이유: 프로젝트 표준은 유니온 리터럴이다. `enum`은 런타임 부하와 tree-shaking 이슈가 있다.
- 기존 테스트를 깨뜨리지 마라.

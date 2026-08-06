# Step 5: mock-data

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — 프로젝트 개요, 인메모리 전략(Day 9까지 mock)
- `/docs/ARCHITECTURE.md` — Store 인터페이스, RSC 목록/상세 화면이 이 데이터를 소비함
- `/docs/PRD.md` — Day 1의 mock-data 항목("공연 8개 · 회차 24개"), Day 2의 목록/상세 화면
- `/docs/ADR.md` — Day 1~8은 인메모리라는 결정 배경
- `/src/types/index.ts` — Step 2 산출물, `Show / Session / Seat` 타입
- `/src/lib/seat-map.ts` — Step 3 산출물, `SECTIONS`·`ROWS_PER_SECTION`·`COLS_PER_ROW`·`toSeatId`·`TOTAL_SEATS`
- `/src/lib/seat-rules.ts` — Step 4 산출물 (여기서는 사용 안 하지만 규칙 이해에 도움)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/lib/mock-data.ts`를 **TDD**로 구현한다. 목록/상세 화면 RSC와 SeatStore memory 구현이 이 데이터를 소비한다.

### 데이터 요구

- **공연 8개** (`MOCK_SHOWS: Show[]`) — 콘서트·뮤지컬·클래식 등 장르가 섞이도록. `id`는 안정적인 슬러그(`"show-01"` 등) 사용.
- **회차 24개** (`MOCK_SESSIONS: Session[]`) — 공연당 평균 3회차. 모든 회차의 `showId`가 `MOCK_SHOWS`에 존재해야 한다.
- **좌석 배치는 회차마다 동일하게 2000석** — 세션별로 좌석을 저장할 필요는 없다. `generateSeats()`가 세션 독립적인 정적 배치를 반환한다.
- `description`은 plain text (마크다운·HTML 태그 금지). 저장형 XSS 원칙(CLAUDE.md)과 일치.
- `posterUrl`은 optional. 값을 넣더라도 실제 유효한 URL일 필요 없음 (Day 8에서 프리셋으로 결정).

### 시그니처

```ts
import type { Show, Session, Seat } from "@/types";
import { SECTIONS, ROWS_PER_SECTION, COLS_PER_ROW, toSeatId } from "@/lib/seat-map";

export const MOCK_SHOWS: readonly Show[];
export const MOCK_SESSIONS: readonly Session[];

// 세션 독립적인 정적 좌석 배치. 매번 새 배열 반환하되 내용은 결정적.
export function generateSeats(): Seat[];
```

`generateSeats()` 구현 요구:
- `SECTIONS × ROWS_PER_SECTION × COLS_PER_ROW = 2000` 개의 `Seat` 반환.
- 각 `Seat.id`는 `toSeatId(section, row, col)`로 생성 (형식 통일).
- 반환 배열은 정렬되어 있어야 한다: section 오름차순 → row 오름차순 → col 오름차순.
- 순수 함수 (외부 상태·시간·랜덤 사용 금지). 같은 호출은 항상 같은 값 반환.

### TDD 순서

**반드시 테스트를 먼저 작성**하라. `codex-tdd-guard.cjs`가 `src/lib/` 편집을 테스트 선행 없이 차단한다.

테스트 파일 위치: `src/lib/mock-data.test.ts`

테스트 케이스 최소 커버리지:
1. `MOCK_SHOWS.length === 8`
2. `MOCK_SESSIONS.length === 24`
3. 모든 `MOCK_SHOWS`의 `id`가 고유하다
4. 모든 `MOCK_SESSIONS.showId`가 `MOCK_SHOWS`의 어느 `id`와 일치한다 (referential integrity)
5. 모든 `MOCK_SESSIONS`의 `id`가 고유하다
6. 모든 `MOCK_SESSIONS.startsAt`이 유효한 ISO 8601 문자열이다 (`new Date(x).toString() !== "Invalid Date"`)
7. `generateSeats().length === 2000`
8. `generateSeats()`가 생성한 모든 `Seat.id`가 고유하다
9. `generateSeats()`가 생성한 모든 `Seat.id`가 `isValidSeatId`를 통과한다 (seat-map 재사용 검증)
10. `generateSeats()`가 결정적이다 (두 번 호출한 결과의 `id` 배열이 동일)
11. 공연 설명(`description`)에 `<`, `>` 태그가 없다 (plain text 원칙)

## Acceptance Criteria

```bash
npm run test    # mock-data.test.ts를 포함해 전부 통과
npm run lint    # 통과
npx tsc --noEmit
npm run build   # Day 1 마무리이므로 프로덕션 빌드도 성공해야 함
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `generateSeats()`가 `toSeatId`를 재사용하는가? 자체적으로 문자열을 조립하지 않았는가?
   - 좌석 개수·구역 개수 등의 상수가 `seat-map.ts`에서 import되는가? 하드코딩 금지.
   - `description`에 HTML 태그·마크다운이 없는가?
   - `posterUrl`에 임의 외부 URL을 넣지 않았는가? (Day 8까지 미확정. 넣더라도 명백히 placeholder여야 함)
   - Store 인터페이스를 이 파일에서 구현하지 않았는가? (Store는 Day 5부터, 이 step은 순수 데이터만)
3. 결과에 따라 `phases/0-foundation/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/lib/mock-data.ts — MOCK_SHOWS 8개, MOCK_SESSIONS 24개, generateSeats() 2000석 결정적 반환, seat-map 상수/toSeatId 재사용, TDD 완료. Day 1 스캐폴딩 완료"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 즉시 중단

## 금지사항

- 좌석 ID 형식을 직접 문자열로 조립하지 마라 (`` `${section}-${row}-${col}` ``). 이유: 좌석 ID 형식은 `seat-map.ts`의 단일 출처다. 직접 조립하면 형식이 어긋나도 테스트가 잡지 못한다. `toSeatId()`를 써라.
- 구역·행·열 개수를 이 파일에서 재정의하지 마라. 이유: seat-map의 상수를 import해야 두 파일이 일치한다.
- `generateSeats()`에 `Math.random()`·`Date.now()`·시스템 시간을 넣지 마라. 이유: 결정성이 깨지면 테스트가 flaky해지고, RSC 캐시와 폴링 스냅샷이 예측 불가능해진다.
- `description`에 `<script>`, `<a>`, `<b>` 등 HTML 태그를 포함시키지 마라. 이유: 저장형 XSS 실경로 방어 원칙(CLAUDE.md, UX_PRINCIPLES.md).
- `SeatStore`·`ShowStore`·`ReservationStore` 인터페이스나 구현체를 이 파일에서 만들지 마라. 이유: 이 step은 순수 데이터 상수만 담당한다. Store는 Day 5(seat-store-memory), Day 7(reservation), Day 8(show-store) 각각의 task에서 다룬다.
- `MOCK_SESSIONS`의 회차 수를 24 외 다른 값으로 바꾸지 마라. 이유: PRD Day 1 요구가 24다. 변경하려면 PRD 갱신이 선행되어야 한다.
- 실제 외부 이미지 URL(예: 특정 아티스트 포스터)을 `posterUrl`에 넣지 마라. 이유: 저작권·404 리스크. `next.config.remotePatterns` 화이트리스트도 아직 없다.
- 테스트를 나중에 쓰지 마라. TDD 가드가 차단한다.
- 기존 테스트를 깨뜨리지 마라.

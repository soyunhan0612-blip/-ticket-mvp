# Step 3: seat-map

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙, "좌석 ID 유효성"이 서버에서도 재검증되어야 하는 이유
- `/docs/ARCHITECTURE.md` — Redis 자료구조(`session:{sessionId}:seats`의 field가 seatId), 보안 경계 섹션의 "키 인젝션" 경고
- `/docs/PRD.md` — Day 5의 서버 검증 항목 ("좌석 ID 유효성은 `lib/seat-map.ts`를 재사용")
- `/src/types/index.ts` — Step 2 산출물, `Seat` 타입 정의
- `/package.json`, `/vitest.config.ts` — Step 1 산출물, vitest 실행 방식

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/lib/seat-map.ts`를 **TDD**로 구현한다. 이 모듈은 좌석 ID의 정규 형식과 좌표 변환을 담당하며, `mock-data`·`hold` 서버 검증·`SeatMap` 렌더에서 재사용된다.

### 좌석 ID 형식 결정

MVP 좌석 배치를 아래로 고정한다 (Step 5 mock-data와 일치시켜야 함):

- **4개 구역**: `A`, `B`, `C`, `D`
- **각 구역 25 행 × 20 열 = 500석**, 총 **2000석**
- **행 번호**는 1부터 25, **열 번호**는 1부터 20

좌석 ID 형식은 아래 정규식을 만족한다:

```
^[A-D]-([1-9]|1[0-9]|2[0-5])-([1-9]|1[0-9]|20)$
```

예시: `"A-1-1"`, `"D-25-20"`. 앞자리 0 금지, 하이픈으로 구분.

### 구현해야 할 export

시그니처만 제시한다. 내부 구현은 자유.

```ts
export const SECTIONS = ["A", "B", "C", "D"] as const;
export type Section = typeof SECTIONS[number];

export const ROWS_PER_SECTION = 25;
export const COLS_PER_ROW = 20;
export const SEATS_PER_SECTION = ROWS_PER_SECTION * COLS_PER_ROW; // 500
export const TOTAL_SEATS = SECTIONS.length * SEATS_PER_SECTION;   // 2000

export function toSeatId(section: Section, row: number, col: number): string;
export function parseSeatId(seatId: string): { section: Section; row: number; col: number } | null;
export function isValidSeatId(seatId: string): boolean;
```

동작 요구:

- `toSeatId("A", 1, 1)` → `"A-1-1"`.
- `toSeatId`는 범위 밖 인자(예: `row: 0`, `row: 26`, `col: 21`, 유효하지 않은 section)에 대해 `throw`한다.
- `parseSeatId`는 유효하지 않은 입력에 대해 `null`을 반환한다 (throw 아님).
- `isValidSeatId`는 `parseSeatId(x) !== null`과 동등해야 한다.
- Round-trip 성질: 모든 유효 `(section, row, col)`에 대해 `parseSeatId(toSeatId(...))`가 원본을 복원해야 한다.

### TDD 순서

**반드시 테스트를 먼저 작성**하라. `codex-tdd-guard.cjs`가 `src/lib/` 편집을 테스트 선행 없이 차단한다.

테스트 파일 위치: `src/lib/seat-map.test.ts` (동일 디렉토리, `.test.ts` suffix)

테스트 케이스 최소 커버리지:
1. `toSeatId` 정상 케이스 3개 이상 (경계 포함: `A-1-1`, `D-25-20`, 중간 값)
2. `toSeatId` 범위 밖 입력에 대한 throw (section 오류, row 하한/상한, col 하한/상한)
3. `parseSeatId` 정상 케이스 (round-trip)
4. `parseSeatId` null 반환 케이스: 형식 오류(`"A_1_1"`), 앞자리 0(`"A-01-1"`), 범위 밖 숫자(`"A-26-1"`, `"A-1-21"`), 빈 문자열, 알 수 없는 section(`"E-1-1"`), 하이픈 갯수 오류
5. `isValidSeatId`와 `parseSeatId`의 동등성 확인
6. 상수 값 검증: `TOTAL_SEATS === 2000`

## Acceptance Criteria

```bash
npm run test    # seat-map.test.ts를 포함해 전부 통과
npm run lint    # 통과
npx tsc --noEmit
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `seat-map.ts`가 순수 함수만 export하는가? (I/O·전역 상태 금지)
   - 좌석 ID 정규식이 위 형식과 일치하는가?
   - `parseSeatId`가 절대 throw하지 않는가? (null 반환만)
   - `TOTAL_SEATS`가 2000인가?
   - 테스트 파일이 구현 파일과 같은 시점 또는 먼저 존재하는 커밋에 있는가? (TDD)
3. 결과에 따라 `phases/0-foundation/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/lib/seat-map.ts — 좌석 ID 형식 A-D×25×20=2000석, toSeatId/parseSeatId/isValidSeatId 구현, TDD 완료"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 즉시 중단

## 금지사항

- `parseSeatId`에서 throw하지 마라. 이유: 이 함수는 신뢰할 수 없는 사용자 입력(요청 바디)에 대한 검증에도 쓰인다. throw면 서버가 500으로 죽고 zod 검증도 흐름이 깨진다. null 반환이 훨씬 다루기 쉽다.
- 좌석 ID에 콜론(`:`)이나 슬래시(`/`)를 쓰지 마라. 이유: Redis 키(`session:{sessionId}:seats`)와 URL 경로 충돌 가능성.
- 앞자리 0을 허용하지 마라 (`A-01-1` 같은 표기). 이유: 하나의 논리적 좌석이 두 표기로 존재하면 Redis Hash field 중복이 생겨 만료 판정이 어긋난다.
- 구역·행·열의 개수를 이 파일 밖에서 하드코딩하지 마라. 이유: mock-data와 seat-map이 다른 값을 갖는 순간 좌석 ID 유효성 검증이 자기 자신을 반박한다. `SECTIONS`·`ROWS_PER_SECTION`·`COLS_PER_ROW` 상수를 import해 재사용하라.
- `Seat` 타입을 이 파일에서 재정의하지 마라. 이유: `src/types/index.ts`가 단일 출처다.
- 테스트를 나중에 쓰지 마라. TDD 가드가 차단한다.
- 기존 테스트를 깨뜨리지 마라.

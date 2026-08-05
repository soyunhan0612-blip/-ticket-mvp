# Step 3-2: show-store

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — Store 인터페이스 (ShowStore)
- `/docs/PRD.md` — 핵심 기능 4번 (셀러 등록), 3대 함정 1번 (좌석 배치 에디터 금지)
- 이전 phase 산출물: `src/lib/mock-data.ts` (좌석 프리셋 생성), `src/services/seat-store-memory.ts`, `src/app/api/shows/route.ts`

## 작업

셀러가 공연을 등록하면 공연 + 회차 + 좌석 세션이 함께 생성되어 관람객 목록에 나타나야 한다.

### 1. `src/services/show-store-memory.ts`

**tdd-guard 대상. 테스트 먼저**.

인터페이스는 Phase 0/2에서 미리 확정된 대로:
```ts
export interface ShowStore {
  list(): Promise<Show[]>;
  get(id: string): Promise<{ show: Show; sessions: Session[] } | null>;
  create(input: CreateShowInput): Promise<{ show: Show; sessions: Session[] }>;
}

export interface CreateShowInput {
  title: string;
  description: string;
  posterPreset: 'p1' | 'p2' | 'p3';
  seatPreset: 'small' | 'medium' | 'full';
  sessionTimes: number[];  // epoch ms 배열 (최소 1개, 최대 4개)
}
```

**핵심 규칙**:
1. `list()`는 **mock 시드 + 셀러 등록분** 모두 반환 (mock을 지우지 말고 병합)
2. `create()`는 공연 저장, 회차들 저장, 각 회차마다 SeatStore가 알아야 할 초기 상태(빈 좌석) 준비. **SeatStore는 세션 ID를 첫 hold 요청 시 lazy init해도 됨** (Redis Hash가 자연스럽게 그렇게 동작)
3. 등록 즉시 `list()`에 나타나야 함

### 2. 테스트

- `list()` 초기값에 mock 8개 포함
- `create()` 후 `list()`에 9개
- `get()`으로 방금 만든 공연 상세 조회 가능
- 회차 수 = `sessionTimes.length`
- 각 회차의 `seatPreset` 일치

### 3. 팩토리에 등록

`src/services/index.ts`에 `showStore`, `reservationStore` 추가 export.

## Acceptance Criteria

```bash
npm run test
npm run build
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - `list()`가 mock을 유지하면서 등록분을 추가?
   - `seatPreset`이 3개 프리셋 중 하나로 제한 (union type 강제)?
   - `sessionTimes` 배열 길이 유효성 검증?
   - `ShowStore` 구현이 `SeatStore`를 직접 참조하지 않고 자기 도메인만 관리?
3. 결과에 따라 `phases/3-reservation-seller-ai/index.json`의 step 2를 업데이트:
   - 성공 → `"summary": "ShowStore memory + create(title/desc/prefixes/sessions). mock 병합 유지"`

## 금지사항

- 좌석 배치를 임의 좌표로 받지 마라. 반드시 `seatPreset` 3개 중 선택 (PRD 3대 함정 1번)
- `posterPreset`을 임의 URL로 확장하지 마라. 이유: next/image 외부 프록시 위험 (CLAUDE.md·ARCHITECTURE.md)
- `list()`에서 다른 셀러의 등록분을 필터링하지 마라. 이유: MVP는 공연 소유 개념 없음, 모두 공개
- ShowStore에서 SeatStore 상태를 직접 수정하지 마라. 경계 유지
- 기존 테스트를 깨뜨리지 마라

# Step 3: selectionbar-atom — SelectionBar 검증 (Step 2에서 병합 완료 시 스킵)

## 읽어야 할 파일

- `/src/components/seat/SelectionBar.tsx` — Step 2에서 수정된 상태 확인
- `/src/atoms/seat.ts` — atom 정의

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 상황 판단

Step 2에서 SeatMap의 useState 제거와 동시에 SelectionBar의 atom 구독 전환도 완료했을 수 있다 (빌드를 통과시키려면 함께 수정해야 하므로). 그 경우 이 step은 **검증만** 수행한다.

### Step 2에서 SelectionBar가 이미 수정된 경우

아래 체크리스트를 확인하고 AC만 실행한다:

- [ ] `SelectionBar`에 props 인터페이스가 없다
- [ ] `useAtomValue(selectedSeatIdsAtom)`으로 선택 좌석을 읽는다
- [ ] `useSetAtom(selectedSeatIdsAtom)`으로 초기화한다 (`setSelected([])`)
- [ ] `selected.length === 0`이면 `null`을 반환한다
- [ ] `validateSelection`, `MAX_SEATS_PER_HOLD`는 `@/lib/seat-rules`에서 import한다
- [ ] `completeSelection` alert stub이 유지된다
- [ ] `"use client"` 지시문이 있다

### Step 2에서 SelectionBar가 수정되지 않은 경우

`src/components/seat/SelectionBar.tsx`를 아래와 같이 수정한다:

1. props 인터페이스(`SelectionBarProps`) 제거
2. `useAtomValue(selectedSeatIdsAtom)` — 선택 좌석 읽기
3. `useSetAtom(selectedSeatIdsAtom)` — 초기화 함수
4. `selected.length === 0`이면 `null` 반환 (SeatMap에서 조건부 렌더 불필요)
5. `validateSelection`, `MAX_SEATS_PER_HOLD` import 유지
6. `completeSelection` alert stub 유지

```tsx
"use client";
import type { JSX } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedSeatIdsAtom } from "@/atoms/seat";
import { MAX_SEATS_PER_HOLD, validateSelection } from "@/lib/seat-rules";

export function SelectionBar(): JSX.Element | null {
  const selected = useAtomValue(selectedSeatIdsAtom);
  const setSelected = useSetAtom(selectedSeatIdsAtom);

  if (selected.length === 0) return null;

  // completeSelection, 렌더링 로직은 기존과 동일
  // onClear → setSelected([])
}
```

## Acceptance Criteria

```bash
npm run lint   # 린트 에러 없음
npm run test   # 모든 테스트 통과
npm run build  # TS strict 빌드 성공
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. SelectionBar 체크리스트를 확인한다 (위 목록).
3. 결과에 따라 `phases/3-seat-perf/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `completeSelection`의 alert stub을 실제 API 호출로 바꾸지 마라. 이유: Day 5의 POST /api/holds 범위
- `SeatMap.tsx`를 이번 step에서 수정하지 마라. 이유: Step 2에서 완료됨
- 기존 테스트를 깨뜨리지 마라

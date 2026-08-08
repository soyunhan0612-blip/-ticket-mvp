# Step 6: toast-conflict

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/UI_GUIDE.md` — 색상, 컴포넌트 스타일
- `/src/atoms/seat.ts` — 기존 atom 구조
- `/src/atoms/seat.test.ts` — 기존 테스트 패턴
- `/src/components/seat/SelectionBar.tsx` — Step 4에서 수정됨 (인라인 충돌 메시지)
- `/src/components/seat/SeatMapContainer.tsx` — Step 3, 5에서 수정됨

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. `src/atoms/seat.ts` 수정 — `conflictSeatIdsAtom` 추가

```ts
// 충돌 좌석 ID 목록 (409 수신 후 일시적 표시용)
export const conflictSeatIdsAtom = atom<string[]>([]);
```

### 2. `src/atoms/seat.test.ts` 수정 — 테스트 추가

1. `conflictSeatIdsAtom` — 초기값은 빈 배열이다
2. `conflictSeatIdsAtom` — 설정된 좌석 ID 목록을 반환한다

### 3. `src/components/toast/Toast.tsx` 생성

화면 하단에 고정된 충돌 토스트:

- `conflictSeatIdsAtom`을 구독
- 빈 배열이면 렌더하지 않음 (null)
- 5초 후 자동으로 `conflictSeatIdsAtom`을 빈 배열로 리셋
- 텍스트: `좌석 {ids}이(가) 이미 선택되었습니다`
- 스타일: UI_GUIDE 기준 (neutral-900 배경, red-500 텍스트, 하단 고정)

### 4. `src/components/seat/SelectionBar.tsx` 수정

Step 4에서 인라인으로 표시하던 충돌 메시지를 `conflictSeatIdsAtom`에 기록하도록 변경:
- `useState`로 관리하던 `conflictMessage`를 제거
- 409 결과 시 `setConflictSeatIds(result.conflict)` 호출

### 5. `src/components/seat/SeatMapContainer.tsx` 수정

`<Toast />`를 배치한다.

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트를 확인한다:
   - `conflictSeatIdsAtom`이 export되는가?
   - Toast가 5초 후 자동으로 사라지는가?
   - SelectionBar의 인라인 충돌 메시지가 제거되었는가?
   - UI_GUIDE의 색상 팔레트를 따르는가?
   - 새로운 SeatVisualState 값을 추가하지 않았는가? (4색만 유지)
3. 결과에 따라 `phases/5-polling-optimistic/index.json`의 해당 step을 업데이트한다.

## 금지사항

- 토스트에 남의 userId를 표시하지 마라.
- 새로운 SeatVisualState 값을 추가하지 마라 (UI_GUIDE: 4색만).
- 외부 토스트 라이브러리를 설치하지 마라.
- 기존 테스트를 깨뜨리지 마라.

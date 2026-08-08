# Step 4: selectionbar-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/src/components/seat/SelectionBar.tsx` — 현재 alert stub
- `/src/hooks/use-hold-mutation.ts` — Step 2에서 생성됨
- `/src/components/seat/SeatMap.tsx` — Step 3에서 수정됨 (sessionId prop 전달)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`src/components/seat/SelectionBar.tsx`의 `alert` stub을 실제 hold mutation 호출로 교체한다.

### 수정 사항

1. `sessionId: string` prop 추가
2. `useHoldMutation(sessionId)` 사용
3. `completeSelection`을 async로 변경:
   - `validateSelection` 클라이언트 사전 검증 유지
   - `holdMutation.mutateAsync({ sessionId, seatIds: selected })` 호출
   - 409 충돌 결과 시 인라인 충돌 메시지 표시 (Step 6에서 토스트로 교체)
4. `holdMutation.isPending` 동안 버튼 비활성화 + "처리 중..." 텍스트
5. `alert(JSON.stringify(selected))` 삭제
6. `alert(선택 오류: ...)` 삭제 (validateSelection 실패 시 아무것도 하지 않음 — 서버에서 재검증)

### 낙관적 업데이트 동작

- `selectedSeatIdsAtom` 비우기: `useHoldMutation`의 `onMutate`에서 처리됨 → SelectionBar에서 직접 조작하지 않음
- 버튼 클릭 시 즉시 선택 좌석이 사라지고, held-mine으로 전환됨
- 409 시 원래 선택 상태로 복원됨 (mutation의 onSuccess에서 롤백)

### SeatMap.tsx 수정

이미 Step 3에서 `sessionId` prop이 추가되었다. `<SelectionBar sessionId={sessionId} />`로 전달되는지 확인하고, 아직 안 되어 있다면 수정한다.

이 파일은 `src/components/`에 위치하며 TDD 가드 대상이 아니다.

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트를 확인한다:
   - `alert`가 완전히 제거되었는가?
   - `useHoldMutation`을 사용하는가?
   - `holdMutation.isPending` 동안 버튼이 비활성화되는가?
   - `selectedSeatIdsAtom`을 SelectionBar에서 직접 비우지 않는가? (mutation이 처리)
3. 결과에 따라 `phases/5-polling-optimistic/index.json`의 해당 step을 업데이트한다.

## 금지사항

- `selectedSeatIdsAtom`을 이 컴포넌트에서 직접 비우지 마라 (hold mutation의 onMutate에서 처리).
- `seatStatusAtomFamily`를 이 컴포넌트에서 직접 조작하지 마라 (mutation 훅 책임).
- `alert`를 남기지 마라.
- 기존 테스트를 깨뜨리지 마라.

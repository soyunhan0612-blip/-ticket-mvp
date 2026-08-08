# Step 0: atoms-sync

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — "폴링 페이로드", "상태 관리" 섹션
- `/src/atoms/seat.ts` — 기존 atom 구조 (seatStatusAtomFamily, selectedSeatIdsAtom, toggleSeatAtom, seatVisualStateAtomFamily)
- `/src/atoms/seat.test.ts` — 기존 테스트 패턴
- `/src/types/index.ts` — SeatSnapshot, SeatSnapshotEntry 타입

## 작업

`src/atoms/seat.ts`에 서버 스냅샷을 Jotai atom에 동기화하는 atom들을 추가한다. 기존 atom을 수정하지 않고 새 atom만 추가한다.

### 추가할 atom들

```ts
// 마지막 동기화된 version 추적
export const snapshotVersionAtom = atom<number>(0);

// 내 hold의 expiresAt 추적 (HoldTimer 컴포넌트용)
export const myHoldExpiresAtAtom = atom<number | null>(null);

// serverNow 추적 (클라이언트-서버 시간 보정용)
export const serverNowAtom = atom<number>(0);

// 이전 스냅샷에서 갱신했던 seatId 집합 (정리용)
export const trackedSeatIdsAtom = atom<Set<string>>(new Set());

// write-only: 스냅샷 전체를 atom에 동기화
export const syncSnapshotAtom = atom(
  null,
  (get, set, snapshot: SeatSnapshot) => { ... }
);
```

**`syncSnapshotAtom` 로직**:
1. `snapshot.version === prevVersion`이면 아무것도 하지 않고 리턴 (변경 없음)
2. `snapshotVersionAtom`, `serverNowAtom` 갱신
3. 현재 스냅샷의 좌석을 순회하며 `seatStatusAtomFamily(seatId)` 갱신
4. `mine: true && s === "held"` 좌석의 `expiresAt`을 `myHoldExpiresAtAtom`에 반영
5. 이전 스냅샷에 있었지만 현재 스냅샷에 없는 좌석은 `null`(available)로 복원
6. `trackedSeatIdsAtom` 갱신
7. 스냅샷에 mine:true+held 좌석이 없으면 `myHoldExpiresAtAtom`을 `null`로 리셋

### TDD 순서

`src/atoms/seat.test.ts`에 새 테스트를 **먼저** 추가한다. 기존 테스트를 수정하지 마라.

테스트 케이스:
1. `syncSnapshotAtom` — 빈 스냅샷 동기화시 version/serverNow가 갱신된다
2. `syncSnapshotAtom` — held 좌석이 seatStatusAtomFamily에 반영된다
3. `syncSnapshotAtom` — 동일 version의 스냅샷은 atom을 갱신하지 않는다
4. `syncSnapshotAtom` — 이전 스냅샷에 있었지만 새 스냅샷에 없는 좌석은 null(available)로 복원된다
5. `syncSnapshotAtom` — mine:true+held 좌석의 expiresAt이 myHoldExpiresAtAtom에 반영된다
6. `syncSnapshotAtom` — mine 없는 held 좌석은 myHoldExpiresAtAtom을 갱신하지 않는다
7. `myHoldExpiresAtAtom` — 초기값은 null이다

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 기존 4개 atom(seatStatusAtomFamily, selectedSeatIdsAtom, toggleSeatAtom, seatVisualStateAtomFamily)이 수정되지 않았는가?
   - syncSnapshotAtom이 version 기반으로 불필요한 갱신을 방지하는가?
   - trackedSeatIdsAtom으로 이전 좌석 정리가 되는가?
   - SeatSnapshot 타입을 import하여 사용하는가?
3. 결과에 따라 `phases/5-polling-optimistic/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `seatVisualStateAtomFamily`의 기존 로직을 변경하지 마라.
- `toggleSeatAtom`의 기존 로직을 변경하지 마라.
- 이 step에서 Tanstack Query를 도입하지 마라 (순수 atom 레이어만).
- 기존 테스트를 깨뜨리지 마라.

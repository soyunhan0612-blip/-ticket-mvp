# Step 2: hold-mutation

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙 (userId 쿠키에서만, 응답에 userId 금지)
- `/docs/ARCHITECTURE.md` — 데이터 흐름 ("선택 완료" 이후 흐름)
- `/src/app/api/holds/route.ts` — POST 요청/응답 형태
- `/src/atoms/seat.ts` — seatStatusAtomFamily, selectedSeatIdsAtom, myHoldExpiresAtAtom (Step 0 추가분)
- `/src/lib/hold.ts` — createExpiresAt (낙관적 expiresAt 계산용)
- `/src/hooks/use-seat-snapshot.ts` — Step 1에서 생성됨. SNAPSHOT_QUERY_KEY

## 작업

`src/hooks/use-hold-mutation.ts`를 생성한다. "선택 완료" 시 POST /api/holds를 호출하는 mutation 훅. 낙관적 업데이트 + 409 롤백.

### 구현할 export

```ts
export interface HoldMutationResult {
  success: boolean;
  conflict?: string[];
}

export function useHoldMutation(sessionId: string): UseMutationResult;
```

### 핵심 로직

**onMutate** (낙관적 업데이트):
1. 진행 중인 폴링 쿼리를 `cancelQueries`로 취소 (낙관적 상태를 덮어쓰지 않도록)
2. 선택된 좌석들의 이전 상태를 백업 (`seatStatusAtomFamily` 현재값)
3. 선택된 좌석을 즉시 `{ s: "held", mine: true, expiresAt: createExpiresAt() }`로 설정
4. `selectedSeatIdsAtom`을 빈 배열로 비움
5. `myHoldExpiresAtAtom`에 낙관적 expiresAt 설정
6. 백업 데이터를 context로 반환 (롤백용)

**mutationFn**:
1. `POST /api/holds` 호출 (`{ sessionId, seatIds }`)
2. 409 응답: `{ success: false, conflict: [...] }` 반환 (throw하지 않음)
3. 200-299 응답: `{ success: true }` 반환
4. 그 외: throw

**onSuccess**:
1. `result.success === false`이면 (409 충돌): context의 백업으로 롤백
2. 성공이든 실패든: `invalidateQueries`로 다음 폴링 즉시 트리거

**onError** (네트워크 에러 등):
1. context의 백업으로 롤백

### Jotai atom 접근 방식

`useMutation`의 콜백(onMutate, onSuccess, onError)에서 Jotai atom에 접근해야 한다. 이를 위해 `jotai/utils`의 `useAtomCallback`을 사용하거나, `useStore()`로 store 인스턴스를 얻어 `store.get()`/`store.set()`을 직접 호출한다. 두 방식 중 jotai 버전과 호환되는 쪽을 사용하라.

대안: 컴포넌트에서 `useSetAtom`으로 setter를 미리 가져와 클로저로 캡처하는 방법도 가능하다.

이 파일은 `src/hooks/`에 위치하며 TDD 가드 대상이 아니다.

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트를 확인한다:
   - userId를 요청 바디에 포함하지 않는가?
   - 409 응답을 throw하지 않고 `{ success: false, conflict }` 로 반환하는가?
   - onMutate에서 cancelQueries를 호출하는가?
   - 롤백 시 이전 상태를 정확히 복원하는가?
   - invalidateQueries로 폴링을 즉시 트리거하는가?
3. 결과에 따라 `phases/5-polling-optimistic/index.json`의 해당 step을 업데이트한다.

## 금지사항

- userId를 요청 바디에 포함하지 마라 (쿠키에서 자동 전송).
- 서버 응답의 hold 객체에서 userId를 읽으려 하지 마라.
- Tanstack Query의 캐시를 직접 조작(setQueryData)하지 마라 — Jotai atom이 좌석 상태의 단일 출처.
- 기존 테스트를 깨뜨리지 마라.

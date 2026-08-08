# Step 1: snapshot-hook

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — API 호출 규칙
- `/docs/ARCHITECTURE.md` — 데이터 흐름, "폴링 페이로드" 섹션, refetchInterval: 3000
- `/src/atoms/seat.ts` — Step 0에서 추가된 `syncSnapshotAtom`
- `/src/app/api/sessions/[id]/snapshot/route.ts` — 응답 형태 확인
- `/src/components/providers.tsx` — QueryClientProvider 설정 확인
- `/src/types/index.ts` — SeatSnapshot 타입

## 작업

`src/hooks/use-seat-snapshot.ts`를 생성한다. Tanstack Query로 3초 폴링하고 스냅샷 데이터를 Jotai atom에 동기화하는 커스텀 훅.

### 구현할 export

```ts
export const SNAPSHOT_QUERY_KEY = "snapshot" as const;
export const SNAPSHOT_REFETCH_INTERVAL = 3_000;

export function useSeatSnapshot(sessionId: string): UseQueryResult<SeatSnapshot>;
```

### 내부 구현

1. `useQuery`로 `GET /api/sessions/${sessionId}/snapshot`을 호출
2. `refetchInterval: 3_000` (3초 폴링)
3. `useEffect`에서 `query.data?.version`이 변경될 때만 `syncSnapshotAtom`을 호출하여 Jotai atom에 동기화
4. `fetch`에 별도 헤더 없음 — 쿠키가 자동 전송됨

### 디렉토리

`src/hooks/` 디렉토리가 없으면 생성하라.

이 파일은 `src/hooks/`에 위치하며 TDD 가드 대상이 아니다.

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트를 확인한다:
   - `SNAPSHOT_QUERY_KEY`와 `SNAPSHOT_REFETCH_INTERVAL`이 export되는가?
   - `useEffect`에서 `query.data?.version`을 의존성으로 사용하는가?
   - `onSuccess` 콜백을 사용하지 않는가? (Tanstack Query v5에서 deprecated)
   - `fetch`에 userId를 쿼리스트링/바디로 전달하지 않는가?
3. 결과에 따라 `phases/5-polling-optimistic/index.json`의 해당 step을 업데이트한다.

## 금지사항

- 클라이언트 컴포넌트에서 `/api/sessions/...` 외의 외부 URL을 직접 호출하지 마라.
- `fetch`에 userId를 쿼리스트링/바디로 전달하지 마라 (쿠키에서 자동 전송).
- `onSuccess` 콜백을 사용하지 마라 (Tanstack Query v5에서 deprecated).
- `refetchIntervalInBackground`를 true로 설정하지 마라.
- 기존 테스트를 깨뜨리지 마라.

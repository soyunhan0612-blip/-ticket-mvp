# Step 4: admin-stats-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — Store 인터페이스, 폴링 페이로드, 보안 경계
- `/src/app/api/sessions/[id]/snapshot/route.ts` — 가장 가까운 참조 구현 (스냅샷 조회 + 쿠키)
- `/src/app/api/sessions/[id]/snapshot/route.test.ts` — API 테스트 패턴 (Request 직접 생성)
- `/src/app/api/holds/route.ts` — zod 검증·에러 응답 패턴
- `/src/services/seat-store.ts` — `SeatStore` 인터페이스 (변경 금지 대상)
- `/src/services/index.ts` — `getSeatStore`, `getShowStore`
- `/src/lib/seat-preset.ts` — `getPreset(presetId).totalSeats`
- `/src/lib/seat-map.ts` — `TOTAL_SEATS`
- `/src/lib/basic-auth.ts` — `isProtectedPath` (수정 대상)
- `/src/lib/basic-auth.test.ts` — 기존 테스트 5건
- `/src/middleware.ts` — `isProtectedPath`를 소비하는 곳
- `/src/types/index.ts` — `SeatSnapshot`, `SeatSnapshotEntry`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Admin 화면의 숫자 카드 4개(전체 / 예매가능 / 홀드중 / 판매완료)를 위한 집계 API를 만든다.

이 step은 **두 파일을 건드린다**: 새 route와 `basic-auth.ts`의 보호 경로 확장. 둘 다 TDD 강제 구간이므로 테스트를 먼저 작성하라.

### 1. 보호 경로 확장 (`src/lib/basic-auth.ts`)

현재 `isProtectedPath`는 `/admin`과 `/seller`만 보호한다. `/api/admin/*`는 대상이 아니라서, 새로 만들 집계 API가 **인증 없이 열린다.** Admin 화면은 막혀 있는데 그 데이터를 내려주는 API가 열려 있으면 보호가 무의미하다.

- `src/lib/basic-auth.test.ts`에 `isProtectedPath("/api/admin/stats") === true`를 검증하는 테스트를 먼저 추가하라.
- `/api/admin`과 `/api/admin/`으로 시작하는 경로를 보호 대상에 추가하라.
- 기존 `/admin`·`/seller` 판정과 기존 테스트 5건은 그대로 유지한다.
- `/api/shows`, `/api/holds` 같은 관람객 API가 실수로 보호 대상이 되지 않는지 확인하는 테스트도 넣어라. 그 API들이 막히면 예매 플로우 전체가 죽는다.

### 2. 테스트 먼저 작성 (`src/app/api/admin/stats/route.test.ts`)

테스트 패턴은 `/src/app/api/sessions/[id]/snapshot/route.test.ts`를 참조하라 — `Request`를 직접 만들어 핸들러에 넘기는 얇은 통합 테스트다.

테스트 케이스:
- 유효한 `sessionId`로 200과 집계 4종 반환
- 좌석을 hold한 뒤 조회하면 `held`가 그 수만큼 증가하고 `available`이 그만큼 감소한다
- 좌석을 confirm한 뒤 조회하면 `sold`가 증가한다
- `available + held + sold === total`이 항상 성립한다
- 존재하지 않는 `sessionId`면 404
- `sessionId` 쿼리 파라미터가 없으면 400
- 쿠키가 없으면 401
- **응답 JSON 어디에도 `userId` 문자열이 없다** (직렬화 결과를 문자열로 검사하라)

### 3. 구현 (`src/app/api/admin/stats/route.ts`)

```typescript
export async function GET(request: Request): Promise<Response>;
```

`GET /api/admin/stats?sessionId=...` 응답:

```jsonc
{
  "total": 2000,
  "available": 1985,
  "held": 8,
  "sold": 7,
  "version": 12,
  "serverNow": 1760000000000
}
```

동작 흐름:
1. `getUserIdFromRequest(request)` — null이면 401
2. 쿼리에서 `sessionId`를 읽어 zod로 검증 — 없거나 빈 값이면 400
3. `getShowStore().getBySessionId(sessionId)` — null이면 404
4. `getSeatStore().getSnapshot(sessionId, userId)` 호출
5. 스냅샷의 `seats` 맵을 순회해 `held`/`sold`를 센다
6. `total`은 공연의 `presetId`로 결정: 있으면 `getPreset(show.presetId).totalSeats`, 없으면 `TOTAL_SEATS`
7. `available = total - held - sold`

핵심 규칙:
- **집계는 `SeatStore.getSnapshot()` 결과에서만 파생하라. `SeatStore` 인터페이스에 새 메서드를 추가하지 마라.** 이유: 인터페이스를 늘리면 phase 9에서 Redis 구현체도 따라 늘어난다. 스냅샷은 점유 좌석만 담고 있어 1회 조회로 집계가 나온다
- **`total`을 2000으로 하드코딩하지 마라.** 프리셋 공연은 500석(small)·1000석(medium)이다
- **응답에 `userId`를 절대 싣지 마라.** Admin이라도 예외 없다 (CLAUDE.md CRITICAL). 스냅샷의 `mine` 필드도 집계에는 불필요하므로 응답에 넣지 마라

## Acceptance Criteria

```bash
npx vitest run src/app/api/admin/stats/route.test.ts src/lib/basic-auth.test.ts
npm run lint
npm test
npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/8-admin/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `SeatStore` 인터페이스에 집계용 메서드를 추가하지 마라. 이유: phase 9에서 Redis 구현체 3종이 같은 인터페이스를 구현해야 한다. 인터페이스가 커질수록 교체 비용이 커지고, 스냅샷 1회로 충분하다
- 응답에 `userId`나 `mine`을 싣지 마라. 이유: 남의 `userId`를 응답에 싣지 않는 것은 CLAUDE.md CRITICAL이다
- `sessionId`를 검증 없이 store에 넘기지 마라. 이유: phase 9에서 이 값이 Redis 키(`session:{sessionId}:seats`)가 된다. 키 인젝션 경로다
- `/api/shows`나 `/api/holds`를 보호 대상에 넣지 마라. 이유: 익명 관람객이 쓰는 API다. 막으면 예매 플로우 전체가 죽는다
- Admin 화면 컴포넌트를 이 step에서 만들지 마라. 이유: Step 5의 스코프다
- 기존 테스트를 깨뜨리지 마라

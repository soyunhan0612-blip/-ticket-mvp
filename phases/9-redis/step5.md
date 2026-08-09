# Step 5: factory-swap

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` — 구현체 절: "이 교체가 성공하는 것 자체가 'API route만 갈아끼우면 프론트는 그대로'라는 주장의 증거이므로 별도 커밋으로 남긴다"
- `/docs/ADR.md` — ADR-003
- `/src/services/index.ts` — **이 step에서 수정할 유일한 소스 파일**
- `/src/services/index.test.ts` — 기존 싱글턴 테스트
- `/src/services/redis-client.ts` — `hasRedisConfig`, `getRedisClient`
- `/src/services/seat-store-redis.ts` — Step 2
- `/src/services/show-store-redis.ts` — Step 3
- `/src/services/reservation-store-redis.ts` — Step 4
- `/src/services/seat-store-memory.ts` — 폴백 대상

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경 — 이 step이 이 phase의 핵심이다

이 프로젝트는 "Store를 인터페이스로 추상화했으니 영속성 구현체를 갈아끼워도 API route와 프론트엔드는 그대로다"라고 주장한다. `docs/ARCHITECTURE.md`는 이 교체가 성공하는 것 **자체가 그 주장의 증거**라고 명시한다.

따라서 이 커밋의 diff가 `src/services/index.ts` 한 파일에 국한될수록 증거로서의 가치가 크다. 반대로 route나 컴포넌트 수정이 섞이면 주장이 무효화된다.

## 작업

`src/services/index.ts`를 수정해 환경변수 유무로 구현체를 분기한다.

```typescript
export function getShowStore(): ShowStore;
export function getSeatStore(): SeatStore;
export function getReservationStore(): ReservationStore;
```

동작 규칙:
- `hasRedisConfig()`가 `true`면 redis 구현체, `false`면 기존 memory 구현체를 반환한다
- 기존의 싱글턴 지연 생성 패턴을 유지한다
- `getReservationStore()`가 `getSeatStore()`를 인자로 넘기는 현재 구조를 유지한다. 두 store가 서로 다른 백엔드를 쓰는 상태(예: seat은 redis, reservation은 memory)가 절대 생기면 안 된다 — 분기는 한 곳에서 일관되게 하라
- 타입 re-export(`ShowStore`, `SeatStore`, `ReservationStore`)를 유지한다

`src/services/index.test.ts`를 갱신하라:
- 환경변수가 없으면 memory 구현체가 반환된다
- 환경변수가 있으면 redis 구현체가 반환된다
- 같은 함수를 두 번 호출하면 같은 인스턴스가 반환된다 (싱글턴)
- 세 store가 같은 백엔드 계열에서 나온다

## 이 커밋의 diff 제약 — 반드시 지켜라

**다음 경로를 이 step에서 일절 수정하지 마라:**

- `src/app/api/**`
- `src/components/**`
- `src/hooks/**`
- `src/atoms/**`
- `src/app/**/page.tsx`, `src/app/**/layout.tsx`

만약 이들 중 하나를 고쳐야만 동작한다면, 그것은 **Step 2~4의 구현이 인터페이스 계약을 지키지 못했다는 신호다.** 그 경우 여기서 우회하지 말고 해당 store 구현체로 돌아가 계약을 맞춰라. 구체적으로는 다음을 의심하라:

- 에러 문자열 프리픽스(`FORBIDDEN:` / `EXPIRED:` / `NOT_FOUND:` / `ALREADY_CANCELLED:`)가 다르다
- `hold`가 `Hold | { conflict: string[] }` 형태를 반환하지 않는다
- `getSnapshot`이 `{ version, serverNow, seats }` 형태를 벗어난다
- 메서드가 `Promise`를 반환하지 않는다

작업을 마친 뒤 다음 명령으로 변경 범위를 **직접 확인하라**:

```bash
git status --porcelain
git diff --stat
```

`src/services/` 바깥의 소스 파일이 변경 목록에 있으면 되돌려라.

## Acceptance Criteria

```bash
npm run lint
npm test
npm run build
git diff --stat
```

`git diff --stat` 결과에 `src/app/`, `src/components/`, `src/hooks/`, `src/atoms/` 경로가 **나타나지 않아야 한다.**

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/9-redis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

summary에는 **변경된 파일 목록을 명시하라.** 이 커밋의 범위가 곧 이 phase의 산출물이다.

## 금지사항

- `src/app/**`, `src/components/**`, `src/hooks/**`, `src/atoms/**`를 수정하지 마라. 이유: 이 커밋의 diff 범위가 곧 "API route만 갈아끼우면 프론트는 그대로"라는 주장의 증거다. 프론트 수정이 섞이면 증거가 아니라 반증이 된다
- 인터페이스 불일치를 route handler 수정으로 우회하지 마라. 이유: 문제의 원인은 store 구현체이고, 우회하면 추상화가 실패했다는 사실만 감춰진다. Step 2~4로 돌아가 고쳐라
- 환경변수가 없을 때 throw하게 만들지 마라. 이유: 키 없는 환경(CI, 심사자 로컬)에서도 앱이 인메모리로 떠야 한다
- seat과 reservation이 서로 다른 백엔드를 쓰는 상태를 허용하지 마라. 이유: `ReservationStore`가 `SeatStore`를 호출하는 구조라 백엔드가 갈리면 좌석과 예약이 다른 저장소에 흩어진다
- 이 step에서 실제 Upstash에 연결해 검증하려 하지 마라. 이유: Step 6의 스코프다. 여기서는 분기 로직과 타입만 맞춘다
- 기존 테스트를 깨뜨리지 마라

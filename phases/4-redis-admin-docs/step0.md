# Step 4-0: admin-dashboard

## 읽어야 할 파일

- `/docs/PRD.md` — 3대 함정 2번 (차트 라이브러리 금지), Day 9 항목
- `/docs/ARCHITECTURE.md` — Admin은 좌석맵 재사용 원칙
- 이전 phase 산출물: `src/components/seat/{SeatMap,Seat,ZoomPanSvg}.tsx`, `src/app/api/sessions/[id]/snapshot/route.ts`, `src/middleware.ts` (Basic Auth 이미 걸림)

## 작업

Admin이 실시간 점유 현황을 관찰. **좌석맵 컴포넌트 그대로 재사용** + 숫자 카드 4개. 차트 X.

### 1. `src/app/admin/page.tsx`

- client component (또는 client wrapper를 감싼 RSC)
- **회차 선택 dropdown**: 전체 회차 목록 (`/api/shows` 호출로 얻은 sessions 평탄화)
- 선택된 회차의 스냅샷을 3초 폴링 (`useQuery` + `refetchInterval: 3000`)
- **좌석맵**: `SeatMap` 컴포넌트를 그대로 사용. 단 클릭 이벤트 무시(read-only mode)
- **숫자 카드 4개** (Tailwind):
  1. 총 좌석 (프리셋으로 계산)
  2. 판매 완료 (sold 수)
  3. 잡힘 중 (held 수)
  4. 남음 (available 수 = 총 - sold - held)

### 2. `SeatMap`에 read-only 모드 옵션

`SeatMap` 기존 signature 확장:
```tsx
export function SeatMap({ seats, readOnly = false }: { seats: Seat[]; readOnly?: boolean });
```

- `readOnly === true`이면 Seat 컴포넌트의 클릭 핸들러가 no-op
- 색은 그대로 4상태 유지 (available/held-mine이 admin 시점에서는 held-other로 통합되어도 OK — 하지만 admin은 자기 자신이 소유한 좌석이 없으므로 자연스럽게 mine 없음)

Admin은 별도의 uid로 세션이 잡히므로 스냅샷의 `mine`은 항상 false. UI 표현은 그대로.

### 3. Basic Auth 확인

Phase 3 Step 5에서 `/admin` 경로가 이미 보호됨. 이 step에서는 middleware 손대지 않음.

### 4. 관람객 조작 반영 확인

관람객이 좌석을 hold/confirm/cancel하면 Admin 대시보드의 숫자 카드와 좌석 색이 다음 폴링 주기(3~4초) 안에 변화.

## Acceptance Criteria

```bash
npm run build
npm run test
npm run dev &
sleep 3
# 수동:
#   1. 시크릿 창에서 /admin → 401 (인증 확인)
#   2. 인증 후 admin 페이지에서 회차 선택 → 좌석맵 표시 + 카드 4개
#   3. 다른 브라우저에서 관람객으로 좌석 hold → admin에서 3~4초 안에 반영
kill %1
```

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - 차트 라이브러리 import 없음? (grep으로 검증: chart, recharts, victory, plotly 등)
   - `SeatMap`을 재사용 (별도 SeatMapAdmin 만들지 않음)?
   - readOnly 모드에서 Seat 클릭이 hold 요청을 보내지 않음?
   - 숫자 카드가 스냅샷에서 계산 (별도 API 없이)?
3. 결과에 따라 `phases/4-redis-admin-docs/index.json`의 step 0을 업데이트:
   - 성공 → `"summary": "/admin 좌석맵 재사용 + 숫자 카드 4개. 관람객 조작이 3~4초 안에 반영"`

## 금지사항

- 차트 라이브러리 설치·import 하지 마라. 이유: PRD 3대 함정 2번. 번들만 키우고 좌석맵 재사용이 더 강한 시각적 증거
- Admin 전용 API route 만들지 마라 (`/api/admin/*`). 이유: 기존 snapshot route 재사용으로 충분. 별도 만들면 코드 중복
- Admin 페이지에서 hold API 호출 마라. 이유: read-only. 관찰만
- 세션 dropdown이 없는 채로 특정 세션 하드코딩 마라. 이유: 심사자가 여러 회차 못 봄
- Seat 컴포넌트를 복사하지 마라. readOnly prop으로 분기 (컴포넌트 재사용)
- 기존 테스트를 깨뜨리지 마라

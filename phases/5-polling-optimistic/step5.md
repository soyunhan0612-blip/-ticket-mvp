# Step 5: hold-timer

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — HoldTimer 설명, serverNow 보정
- `/docs/UI_GUIDE.md` — 컴포넌트 스타일, 색상 팔레트
- `/src/atoms/seat.ts` — Step 0에서 추가된 myHoldExpiresAtAtom, serverNowAtom
- `/src/lib/hold.ts` — HOLD_TTL_MS (참조용)
- `/src/components/seat/SeatMapContainer.tsx` — Step 3에서 생성됨

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. `src/components/seat/HoldTimer.tsx` 생성

hold 성공 후 expiresAt까지 카운트다운을 표시하는 컴포넌트.

#### 핵심 로직

1. `myHoldExpiresAtAtom`과 `serverNowAtom`을 구독
2. 서버-클라이언트 시간 차이 보정: `clockDrift = Date.now() - serverNow`
3. 클라이언트 기준 만료 시각: `clientExpiresAt = expiresAt + clockDrift`
4. 1초 간격 `setInterval`로 남은 초 계산
5. `remainingSeconds <= 0`이면 컴포넌트 숨김 (null 반환)
6. 표시 형식: `"남은 시간 M:SS"`

#### 조건부 렌더링

- `expiresAt === null` 또는 `serverNow === 0`이면 렌더하지 않음
- `remainingSeconds <= 0`이면 렌더하지 않음

### 2. `src/components/seat/SeatMapContainer.tsx` 수정

`<HoldTimer />`를 SeatMap 아래에 배치한다.

이 파일은 `src/components/`에 위치하며 TDD 가드 대상이 아니다.

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 체크리스트를 확인한다:
   - `clockDrift`로 서버-클라이언트 시간 차이를 보정하는가?
   - 1초 간격으로 카운트다운이 갱신되는가?
   - 만료 시 컴포넌트가 사라지는가?
   - UI_GUIDE의 색상 팔레트를 따르는가? (neutral-900 배경, neutral-300 텍스트, white 강조)
3. 결과에 따라 `phases/5-polling-optimistic/index.json`의 해당 step을 업데이트한다.

## 금지사항

- `Date.now()`만 사용하여 서버 시간 보정 없이 카운트다운하지 마라.
- `HOLD_TTL_MS`를 하드코딩하지 마라 (expiresAt에서 역산).
- 타이머 만료 시 서버에 release 요청을 보내지 마라 (서버가 자체 만료 정리, 다음 폴링에서 반영).
- 기존 테스트를 깨뜨리지 마라.

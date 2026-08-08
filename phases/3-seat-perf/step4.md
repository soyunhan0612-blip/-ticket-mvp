# Step 4: measurement-docs — PROGRESS.md Day 4 섹션 작성

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PROGRESS.md` — 기존 Day 0~3 섹션 (스타일과 구조를 따라야 함)
- `/docs/ADR.md` — ADR-002 (before/after 측정, 서사 정직 유지 원칙)
- `/src/atoms/seat.ts` — Step 0에서 생성한 atom (기술적 관점 기록용)
- `/src/components/seat/Seat.tsx` — Step 1에서 수정한 컴포넌트 (기술적 관점 기록용)
- `/src/components/seat/SeatMap.tsx` — Step 2에서 수정한 컴포넌트 (기술적 관점 기록용)
- `/src/components/seat/SelectionBar.tsx` — Step 2~3에서 수정한 컴포넌트

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### `docs/PROGRESS.md` Day 4 섹션 작성

기존 Day 0~3 섹션의 구조(기능적 관점 / 기술적 관점 / 아키텍처 관점 / 결정 근거 / 참조)를 따라 Day 4 섹션을 작성한다.

기존 Day 4 placeholder:
```markdown
## Day 4 — 좌석 최적화 after (예정)

> 이 자리에 `atomFamily` 적용 후 리렌더 수치 · before/after 대비.
> "클릭당 리렌더 2000 → 1~2"로 한정해 기록, 초기 마운트 비용은 별도로 병기 (과장 금지).
```

이 placeholder를 완전한 Day 4 섹션으로 교체한다.

#### 필수 포함 내용

**기능적 관점:**
- 좌석 클릭 시 리렌더 범위가 해당 좌석 1~2개로 한정 (이전: ~2000개)
- 기능적 동작(선택/해제/4석 상한/SelectionBar 표시)은 Day 3과 동일

**기술적 관점:**
- `atoms/seat.ts`: atomFamily 4종 (seatStatusAtomFamily, selectedSeatIdsAtom, toggleSeatAtom, seatVisualStateAtomFamily)
- `Seat.tsx`: React.memo + useAtomValue + useSetAtom — props에서 state/onClick 제거
- `SeatMap.tsx`: useState 제거, Seat에 기하학 props만 전달
- `SelectionBar.tsx`: props 제거, selectedSeatIdsAtom 직접 구독

**아키텍처 관점:**
- seatStatusAtomFamily가 Day 5 폴링의 진입점 (이번 phase에서는 기본값 null만 사용)
- 서버 상태(seatStatusAtom)와 클라이언트 선택(selectedSeatIdsAtom) 분리
- SeatVisualState 타입을 types/index.ts로 이동하여 순환 의존 해소

**결정 근거:**
- 왜 Seat 내부에서 toggleSeatAtom 직접 호출: onClick prop 클로저가 memo를 무력화
- 왜 SelectionBar 가시성을 내부에서 판단: SeatMap atom 구독 방지
- 왜 held-mine을 selected와 동일 처리: UI_GUIDE 4색 체계 유지, 사용자에게 "내 좌석"이라는 동일한 시각 신호

**after 측정 섹션 (placeholder):**
```markdown
### after 측정 (React DevTools Profiler)
> 아래는 브라우저에서 수동 측정 후 사람이 채운다.

- 초기 마운트 시간: **_ ms** (Day 3: **_ ms**)
- 좌석 1회 클릭 시 리렌더 컴포넌트 수: **_** (Day 3: **_**)
- 측정 절차: `npm run dev` → `/sessions/session-01/seats` → React DevTools Profiler → 좌석 클릭
- 스크린샷: `docs/assets/day4-after-profiler.png`
```

**참조:**
- 이 phase 커밋: `feat(3-seat-perf): ...`
- ADR-002: "클릭당 리렌더 2000 → 1~2"로 한정. 초기 마운트 비용은 별도 수치로 정직 병기

#### 서사 정직 유지 원칙 (ADR-002에서 발췌)

> atomFamily가 개선하는 건 업데이트 시 리렌더 수이지 초기 마운트 비용이 아니다. 초기 마운트는 2000개 노드를 만드는 이상 구조적으로 남는다. "클릭당 리렌더 2000 → 1~2"로 한정해 쓰고, 초기 렌더 시간은 별도 수치로 정직하게 병기한다. 과장하면 면접에서 그 자리에서 깨진다.

이 원칙이 Day 4 섹션에 반영되어야 한다. 초기 마운트가 개선되었다고 쓰지 마라.

## Acceptance Criteria

```bash
npm run lint   # 린트 에러 없음
npm run test   # 모든 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. PROGRESS.md를 읽어 Day 4 섹션이 기존 Day 0~3과 동일한 구조를 따르는지 확인한다.
3. "클릭당 리렌더 2000 → 1~2"로 한정하고, 초기 마운트는 별도 placeholder로 분리했는지 확인한다.
4. 결과에 따라 `phases/3-seat-perf/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 측정값을 임의로 채우지 마라. 이유: 실제 브라우저 측정값만 유효하다. placeholder로 남겨라
- 초기 마운트 비용이 개선되었다고 쓰지 마라. 이유: ADR-002 서사 정직 원칙 위반
- 소스 코드를 수정하지 마라. 이유: 이 step은 문서만 다룬다
- 기존 Day 0~3 섹션을 수정하지 마라
- 기존 테스트를 깨뜨리지 마라

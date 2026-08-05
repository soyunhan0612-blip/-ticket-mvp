# Step 4-3: docs-finalize

## 읽어야 할 파일

- `/docs/PRD.md` — MVP 제외 사항, 3대 함정 ("알고도 제외한 것" 근거)
- `/docs/ARCHITECTURE.md` — 좌석 성능 전략 (README에 요약)
- `/docs/ADR.md` — 5개 ADR (README에서 링크)
- `/docs/UI_GUIDE.md` — Day 3 후 채워졌어야 할 값들 (미확정이면 이 step에서 마무리)
- `docs/perf/before.md`, `docs/perf/after.md` (Phase 1)
- `docs/perf/deploy-verification.md` (Phase 4 Step 2)

## 작업

README와 최종 문서. **과장 금지**. 포트폴리오는 정직할 때 강하다.

### 1. `README.md` 최종본

기존 README (Phase 0 Step 4에서 뼈대)를 다음 구조로 확장:

```markdown
# 티켓 예매 MVP

포트폴리오용 티켓링크형 예매 서비스. 좌석 선택의 실시간 경합을 서버 hold + 3초 폴링으로 재현하고, 2000석 SVG의 리렌더 폭발을 atomFamily로 격리한다.

## 데모
- URL: <배포 URL>
- 심사자 계정: `demo` / <PASS>
- 데모 GIF: [탭 2개 충돌 시나리오](docs/media/collision.gif)

## 핵심 기술 선택 (근거)
- **서버 hold + 3초 폴링**: 실제 좌석 경합을 재현. SSE 대신 폴링은 세션 Hash 설계로 Upstash Free 한도의 0.4% 사용
- **Jotai atomFamily**: 2000석의 클릭당 리렌더를 2000 → 1~2로 격리
- **Store 인터페이스 + Redis 팩토리 교체**: 개발 내내 인메모리, 배포 시 Redis 한 줄 스위치

자세한 배경: [ADR.md](docs/ADR.md)

## 성능 (before / after)
| 지표 | Before (naive) | After (atomFamily) |
|---|---|---|
| 클릭당 리렌더 컴포넌트 수 | 2000 | 1~2 |
| 초기 마운트 시간 | <값> | <값> (개선 대상 아님 — 2000 노드는 여전히 생성) |

측정 근거 커밋: `<SHA-before>` → `<SHA-after>`. 상세: [before.md](docs/perf/before.md) / [after.md](docs/perf/after.md)

## 알고도 제외한 것 (Why not)
- **좌석 키보드 내비게이션 / 스크린리더**: 2000석 SVG에서 제대로 하려면 별도 접근성 설계 필요 (본 MVP 스코프 초과)
- **E2E (Playwright)**: 좌석 페이지의 client 폴링·낙관적 업데이트를 E2E로 검증하려면 시간이 크게 든다. lib/services/route 단위 테스트로 대체
- **SSE / WebSocket**: 3초 폴링으로 충분. Vercel 함수 수명 이슈로 시간 잡아먹음 (ADR-001)
- **좌석 배치 에디터**: 드래그 배치 툴은 2주. 프리셋 3개로 대체
- **차트 라이브러리**: Admin 매출 그래프. 번들만 키움. 좌석맵 재사용이 더 강함
- **실사용자 인증·결제**: 익명 UUID 쿠키 + Basic Auth로만 보호. 실서비스 스코프 아님
- **CSRF 토큰**: `sameSite: 'lax'` 쿠키로 대체. 실서비스라면 필요

모르고 안 한 것과 알고 안 한 것은 다르게 읽힌다.

## 로컬 실행
1. `.env.example` → `.env.local` 복사 후 값 채우기
2. `npm install`
3. `npm run dev`

## 스크립트
- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm run test` — vitest
- `npm run lint` — eslint

## 문서
- [PRD.md](docs/PRD.md) — 제품 요구, 10일 일정, 검증 시나리오
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — 렌더링 경계, Store 인터페이스, Redis 자료구조, 폴링 페이로드
- [ADR.md](docs/ADR.md) — 5개 결정 사항 + 착수 전 처리
- [UI_GUIDE.md](docs/UI_GUIDE.md) — 디자인 규칙, 좌석 시각 규칙
```

### 2. `docs/UI_GUIDE.md` 마무리

Day 3 이후 미확정된 색상·간격 값이 있으면 실제 채워진 값으로 갱신 (실제 코드에서 사용한 Tailwind 클래스나 색 코드).

### 3. `docs/ADR.md` 최종 검토

- 5개 ADR + 착수 전 처리 3가지. 구현 후 회고로 **바뀐 판단이 있으면 그걸 반영**한 뒤 최종화
  - 예: Lua 스크립트 구현에서 예상 못한 함정이 있었다면 ADR-004 "트레이드오프"에 추가
  - 예: atomFamily 실제 측정 결과가 다르면 ADR-002 갱신

### 4. `docs/perf/` 최종 정리

- `before.md` / `after.md`에 실제 커밋 SHA 채워넣기
- `deploy-verification.md`에 9개 시나리오 결과 표

### 5. 커밋 히스토리 확인 (수동)

- Phase 1 Step 0의 naive 커밋이 히스토리에 남아있는지 확인. `git log --oneline | grep naive`
- 없으면 서사가 통째로 증발. 이 경우 error로 마크하고 이전 phase 재검토 요청

## Acceptance Criteria

```bash
npm run test        # 최종 회귀 확인
npm run build       # 최종 빌드
npm run lint

# 문서 파일 존재 확인
test -f README.md
test -f docs/PRD.md
test -f docs/ARCHITECTURE.md
test -f docs/ADR.md
test -f docs/UI_GUIDE.md
test -f docs/perf/before.md
test -f docs/perf/after.md
test -f docs/perf/deploy-verification.md

# README 필수 섹션
grep -q '알고도 제외한 것' README.md
grep -q '성능' README.md
grep -q '## 데모' README.md

# 순진한 구현 커밋이 히스토리에 남아있는지 (성능 서사의 근거)
git log --oneline | grep -qi 'naive\|before'
```

## 검증 절차

1. AC 통과.
2. 문서 정직성 체크리스트:
   - README에 "초기 마운트는 개선 대상 아님" 문구 있음? (ARCHITECTURE·ADR과 일관)
   - "알고도 제외한 것"에 실제 이유 (한 줄 이상) 붙어있음?
   - 성능 표에 before/after 실제 숫자? (플레이스홀더 X)
   - 배포 URL과 심사자 계정이 실제 값?
   - Day 3 naive 커밋 SHA가 README에 링크됨?
3. 결과에 따라 `phases/4-redis-admin-docs/index.json`의 step 3을 업데이트, 그리고 `phases/index.json`의 `4-redis-admin-docs` phase도 `"completed"`로:
   - 성공 → `"summary": "README + 성능표 + 알고도 제외한 것 명시. ADR·UI_GUIDE 최종본. before/after 커밋 SHA 문서화"`

## 금지사항

- 성능 수치를 과장 마라. 이유: 면접에서 그 자리에서 깨짐. ARCHITECTURE.md·ADR.md의 "정직성" 원칙 (반복 명시)
- README에 "미완" 기능을 완료된 것처럼 쓰지 마라
- "AI로 자동 생성된 README" 스타일(이모지 폭발, 과장된 형용사) 만들지 마라. 이유: 심사자가 즉시 알아봄
- 데모 GIF 없이 "동작 화면 참조" 문구만 두지 마라. GIF 파일 자리는 만들되, 실제 캡처는 수동 (있을 수 없으면 정직하게 "캡처 예정")
- Phase 1의 naive 커밋을 삭제/스쿼시 마라. 이유: 서사의 근거
- 기존 테스트를 깨뜨리지 마라

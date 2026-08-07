# Step 5: deploy-vercel

## 읽어야 할 파일

- `/CLAUDE.md`
- `/README.md` — 배포 URL을 여기에 추가
- `/docs/PRD.md` — Day 2 마지막 항목: "빈 껍데기 상태로 Vercel 1회 배포"
- `/next.config.ts`
- `/package.json`

## 작업

**이 step은 외부 인증·수동 설정이 필요할 가능성이 매우 높다.** 아래 순서로 진행하되, 어느 지점에서든 사용자 개입이 필요하면 **즉시 `blocked` 처리**하고 중단하라.

### 순서

1. Vercel CLI 존재 여부 확인
   ```bash
   vercel --version
   ```
   - 없으면 → 아래 blocked 처리로 이동

2. Vercel 로그인 상태 확인
   ```bash
   vercel whoami
   ```
   - 로그인 안 되어 있으면 → 아래 blocked 처리로 이동

3. 프로젝트 링크 (한 번만 필요)
   ```bash
   vercel link --yes
   ```
   - 프롬프트가 뜨거나 실패하면 → blocked

4. 프로덕션 배포
   ```bash
   vercel --prod --yes
   ```
   - 배포 URL을 캡처

5. 배포 URL로 스모크 확인
   - `curl -sI <URL>/shows` → HTTP 200
   - `curl -sI <URL>/shows/show-01` → HTTP 200
   - `curl -sI <URL>/shows/nonexistent` → HTTP 404

6. `README.md`에 배포 URL 섹션 추가:
   ```markdown
   ## 배포

   - 프로덕션: <배포 URL>
   ```

### blocked 처리 규칙

아래 조건 중 하나라도 해당하면 **즉시 index.json의 이 step을 `blocked`로 설정하고 중단**:

- `vercel` CLI가 시스템에 설치되어 있지 않다
- `vercel whoami`가 인증되지 않은 상태를 반환한다
- `vercel link`가 인터랙티브 프롬프트를 요구한다
- `vercel --prod`가 프로젝트 소유자·팀 선택 프롬프트를 요구한다
- 환경변수 미설정으로 배포는 성공했으나 페이지가 500을 반환한다 (이번 스코프에서는 필요한 env가 없어야 정상이지만 혹시 있다면)

`blocked_reason` 예시 (구체적으로):
- "Vercel CLI 미설치. `npm i -g vercel` 후 `vercel login` 실행 후 재실행"
- "Vercel 미인증. `vercel login` 실행 후 재실행"
- "Vercel 프로젝트 링크 필요. `vercel link` 실행 후 재실행"

**절대 하지 말 것**: `--dangerously-*` 계열 플래그로 프롬프트를 우회하려 하지 마라. 사용자 계정 자원이므로 사용자 손을 거쳐야 한다.

## Acceptance Criteria

```bash
# 배포 URL이 정해진 뒤 수동 확인
curl -sI https://<배포-URL>/shows | grep "^HTTP"           # → HTTP/2 200
curl -sI https://<배포-URL>/shows/show-01 | grep "^HTTP"   # → HTTP/2 200
curl -sI https://<배포-URL>/shows/xxx | grep "^HTTP"       # → HTTP/2 404
```

빌드는 Vercel 서버에서 수행되므로 로컬 `npm run build`는 사전 안전판일 뿐. 그러나 아래는 통과해야 배포에 의미가 있다:

```bash
npm run lint
npm run test
npm run build
```

## 검증 절차

1. 로컬 lint/test/build 통과 확인
2. Vercel CLI로 배포 시도 → 실패 시 blocked, 성공 시 스모크 3건 확인
3. README에 배포 URL 반영
4. 결과에 따라 `phases/1-shows-rsc/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약 (예: Vercel 프로덕션 배포, /shows·/shows/[id] 200 확인, README 갱신)"`
   - blocked → `"status": "blocked"`, `"blocked_reason": "위 blocked 처리 규칙 참고 구체적 사유"`
   - 3회 시도 후 실패 (인증 문제 외) → `"status": "error"`, `"error_message": "구체적 에러 내용"`

## 금지사항

- AI 키(`ANTHROPIC_API_KEY`)를 Vercel 환경변수에 넣지 마라. 이유: Day 8 스코프
- Upstash 토큰을 Vercel 환경변수에 넣지 마라. 이유: Day 9 스코프
- Basic Auth 계정을 Vercel 환경변수에 넣지 마라. 이유: Day 8 스코프
- `vercel --prod` 대신 `vercel` (preview)만 배포하지 마라. 이유: PRD가 명확히 프로덕션 배포를 요구
- 배포 실패 시 무한 재시도하지 마라. 3회 시도 후 error 또는 인증 관련이면 blocked
- README 배포 URL을 임의로 지어내지 마라. 실제 `vercel --prod` 출력을 사용
- 기존 테스트를 깨뜨리지 마라

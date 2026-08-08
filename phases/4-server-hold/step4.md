# Step 4: zod-install

## 읽어야 할 파일

- `/package.json` — 현재 의존성 확인

## 작업

`npm install zod`를 실행하여 zod를 **dependencies**에 추가한다 (devDependencies가 아님 — route handler에서 런타임에 사용).

이 step이 별도인 이유: Step 5의 API route에서 zod 검증을 사용하는데, 현재 package.json에 zod가 없다. 의존성 설치를 route 구현과 분리하면 step 실패 시 원인 격리가 쉽다.

## Acceptance Criteria

```bash
npm run test && npm run lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `package.json`의 `dependencies`에 `"zod"`가 있는가? (`devDependencies`가 아닌지 확인)
3. 결과에 따라 `phases/4-server-hold/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- devDependencies에 넣지 마라. dependencies에 넣어라. 이유: route handler에서 런타임에 사용.
- 기존 테스트를 깨뜨리지 마라.

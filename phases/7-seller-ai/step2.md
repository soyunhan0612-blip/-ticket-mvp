# Step 2: poster-preset

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` — CRITICAL 규칙 (임의 URL 금지)
- `/docs/ARCHITECTURE.md` — 보안 경계
- `/docs/UI_GUIDE.md` — 스타일 규칙
- `/src/types/index.ts` — Show.posterUrl
- `/next.config.ts` — 현재 설정

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

### 1. 테스트 작성 (`src/lib/poster-preset.test.ts` 생성)

**테스트 케이스:**
- `POSTER_PRESETS` 배열에 최소 3개 프리셋이 있다
- 각 프리셋에 id, label, url이 있다
- `isValidPosterPresetId(id)` — 유효한 ID에 true, 잘못된 ID에 false
- `getPosterUrl(id)` — 유효한 ID에 대해 `/posters/`로 시작하는 경로를 반환한다
- `getPosterUrl("invalid")` — null을 반환한다

### 2. 구현 (`src/lib/poster-preset.ts` 생성)

아래 시그니처를 따르되 내부 구현은 자유롭게 하라:

```typescript
export interface PosterPreset {
  id: string;
  label: string;     // "콘서트", "뮤지컬", "연극" 등
  url: string;       // /posters/concert.svg 등 로컬 경로
}

export const POSTER_PRESETS: readonly PosterPreset[];

export function isValidPosterPresetId(id: string): boolean;

export function getPosterUrl(id: string): string | null;
```

핵심 규칙:
- 사용자가 임의 URL을 입력할 수 없도록 사전 정의된 프리셋에서만 선택한다
- 포스터 프리셋은 장르별로 최소 3개: concert, musical, theater (추가 가능)

### 3. 플레이스홀더 SVG 생성 (`public/posters/` 디렉토리)

각 프리셋에 대응하는 플레이스홀더 SVG 파일을 `/public/posters/` 아래에 생성한다.
- 간단한 SVG로 장르를 텍스트로 표시하는 수준이면 충분하다
- 예: `concert.svg`, `musical.svg`, `theater.svg`
- 크기: 400x600 (포스터 비율 2:3)
- 배경은 neutral 계열 (UI_GUIDE.md 참조)

## Acceptance Criteria

```bash
npx vitest run src/lib/poster-preset.test.ts
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/7-seller-ai/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 사용자가 임의 URL을 입력하게 하지 마라. 이유: XSS/SSRF 방지, PRD에서 "프리셋 중 선택"을 명시
- next/image의 remotePatterns를 무분별하게 열지 마라
- 기존 테스트를 깨뜨리지 마라

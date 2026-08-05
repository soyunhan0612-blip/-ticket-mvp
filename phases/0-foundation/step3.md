# Step 3: shows-rsc

## 읽어야 할 파일

- `/CLAUDE.md` — 아키텍처 규칙 (API는 route handler에서만)
- `/docs/ARCHITECTURE.md` — 렌더링 경계 표, 데이터 흐름
- `/docs/PRD.md` — Day 2 항목 (개발 지연/실패 플래그)
- 이전 step 산출물: `src/types/index.ts`, `src/lib/mock-data.ts`

## 작업

공연 목록·상세를 **RSC**로 만든다. 좌석 페이지·client 컴포넌트는 이 step 대상 아님.

### 1. `src/app/api/shows/route.ts`

**tdd-guard 대상. 테스트 먼저** (`route.test.ts`).

```ts
// GET /api/shows       → Show[] (mock 시드)
// GET /api/shows/[id]  → Show + sessions (동일 route에서 하지 말고 [id]/route.ts 분리 권장)
export async function GET(req: Request): Promise<Response>;
```

응답 JSON 스키마는 `Show` / `Session` 타입 그대로.

### 2. `src/app/api/shows/[id]/route.ts`

```ts
export async function GET(req: Request, { params }: { params: { id: string } }): Promise<Response>;
```

- 없는 id → 404
- 있으면 `{ show, sessions }` 반환

### 3. 개발 전용 지연·실패 플래그

**PRD 안전장치**: 로딩/에러 UI 검증용. **공개 데모·좌석 폴링에는 절대 X**.

`src/lib/dev-latency.ts` (테스트 먼저: `dev-latency.test.ts`):

```ts
// process.env.DEV_LATENCY === 'true'일 때만 지연/실패 주입
export async function maybeDelay(): Promise<void>;   // 200~600ms 지연
export function maybeFail(): void;                    // 5% 확률로 throw
```

- 프로덕션(`NODE_ENV === 'production'`)에서는 플래그 무관하게 **반드시 no-op**
- **`app/api/holds/`, `app/api/sessions/*/snapshot`, `app/api/reservations/`에 절대 호출 X** — 폴링/hold에 지연 주입되면 데모가 깨진다. `app/api/shows/`에만 호출

`app/api/shows/**/route.ts`에서만 `maybeDelay()` + `maybeFail()` 호출.

### 4. `src/app/(viewer)/shows/page.tsx` — 목록 (RSC)

- `mock-data`에서 직접 읽거나 내부 route를 fetch (내부에서 fetch할 거면 `no-store`로)
- 카드 목록. UI는 소박하게: 제목, 포스터 자리, 회차 수. Tailwind 최소한
- 각 카드 클릭 → `/shows/[id]`
- **default export는 async function**

### 5. `src/app/(viewer)/shows/[id]/page.tsx` — 상세 (RSC)

- 공연 정보 + 회차 목록
- 회차 클릭 → `/sessions/[id]/seats` (아직 페이지 없음. Phase 2 Step 3에서 만듦. **여기서는 링크 URL만 미리 걸어둔다** — 클릭하면 404가 정상)
- **default export는 async function**

### 6. 로딩·에러 UI

- `src/app/(viewer)/shows/loading.tsx` — 스켈레톤 텍스트 (Tailwind pulse 애니메이션 정도)
- `src/app/(viewer)/shows/error.tsx` — client component, 재시도 버튼

## Acceptance Criteria

```bash
npm run test          # route.test.ts, dev-latency.test.ts 통과
npm run build         # RSC 빌드 성공
npm run dev &         # 개발 서버 백그라운드 실행
sleep 3
curl -s http://localhost:3000/shows | grep -q '<html'    # HTML 응답 존재
curl -s http://localhost:3000/api/shows | grep -q '"id"' # JSON 배열
kill %1
```

수동 확인:
- `view-source:http://localhost:3000/shows` 열어 **HTML에 공연 제목 문자열이 들어있는지** (RSC 검증 — client 렌더가 아니라는 증거)

## 검증 절차

1. AC 통과.
2. 아키텍처 체크리스트:
   - `/shows`, `/shows/[id]`가 async function이고 `'use client'`가 없음?
   - `dev-latency`가 `NODE_ENV === 'production'`에서 no-op?
   - `dev-latency`가 `holds`, `snapshot`, `reservations` route에서 호출되지 **않음**?
   - `route.ts`가 `zod` 없이 URL param을 그대로 store에 던지지는 않음? (id 정도는 문자열 화이트리스트 검증)
3. 결과에 따라 `phases/0-foundation/index.json`의 step 3을 업데이트:
   - 성공 → `"summary": "/shows RSC 목록/상세 + api/shows GET 완료. dev-latency는 shows route에만"`

## 금지사항

- `/shows`, `/shows/[id]`에 `'use client'`를 붙이지 마라. 이유: RSC로 SEO·초기 HTML 확보하는 것이 이 페이지들의 목적
- `useState`, `useEffect`를 목록 페이지에 쓰지 마라. 이유: 서버에서 렌더 완결
- `dev-latency`를 좌석 관련 route에 호출하지 마라. 이유: 폴링·hold에 지연이 섞이면 데모 자체가 깨짐
- 좌석 페이지(`/sessions/[id]/seats`)를 만들지 마라. 이유: Phase 2 Step 3 스코프
- Tanstack Query Provider를 붙이지 마라. 이유: 아직 client 훅 사용자가 없음
- 기존 테스트를 깨뜨리지 마라

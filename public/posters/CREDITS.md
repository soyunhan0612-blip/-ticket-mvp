# 포스터 이미지 출처

시드 공연 8건의 포스터는 Unsplash 사진이다. Unsplash License는 저작자 표시를
요구하지 않지만 출처 추적을 위해 기록한다. https://unsplash.com/license

각 공연은 두 파일을 갖는다.

- `{slug}.jpg` — 카드 썸네일 (3:4, 800×1067)
- `hero/{slug}.jpg` — 랜딩 히어로 배경 (16:9, 1600×900)

같은 원본에서 비율만 다르게 크롭했으므로 사진 ID는 둘이 동일하다.

| 공연 | slug | Unsplash 사진 |
|---|---|---|
| show-01 여름밤 시티 팝 콘서트 | `city-pop` | https://unsplash.com/photos/photo-1444723121867 |
| show-02 뮤지컬 별을 걷는 사람들 | `musical-stars` | https://unsplash.com/photos/photo-1503095396549 |
| show-03 서울 심포니 마스터피스 | `symphony` | https://unsplash.com/photos/photo-1465847899084 |
| show-04 오늘의 재즈 쿼텟 | `jazz` | https://unsplash.com/photos/photo-1511192336575 |
| show-05 연극 마지막 편지 | `letter` | https://unsplash.com/photos/photo-1507924538820 |
| show-06 우리 소리 한마당 | `gugak` | https://unsplash.com/photos/photo-1519892300165 |
| show-07 컨템포러리 댄스 흐름 | `dance` | https://unsplash.com/photos/photo-1518834107812 |
| show-08 인디 밴드 라이브 스테이지 | `indie` | https://unsplash.com/photos/photo-1471478331149 |

## 선정 기준

`docs/UI_GUIDE.md`의 "포스터 이미지" 절을 따른다. 요약하면:

- 보라·인디고 조명 사진을 쓰지 않는다 (AI 슬롭 안티패턴). 무대 사진에서 매우 흔하므로
  실질적으로 가장 자주 걸리는 필터다
- 어둡고 대비가 낮은 사진을 우선한다. 히어로는 ink 오버레이 위에 흰 텍스트를 올린다
- 얼굴 클로즈업을 피한다. 3:4와 16:9 두 비율로 잘릴 때 얼굴이 잘리면 즉시 티가 난다
- 파일당 상한은 썸네일 150KB, 히어로 220KB다. `q` 파라미터를 낮춰 맞춘다

## 이 디렉터리의 SVG는 Unsplash가 아니다

`concert.svg`, `musical.svg`, `theater.svg`는 이 리포지토리에서 직접 만든 셀러 등록용
플레이스홀더다. `src/lib/poster-preset.ts`가 참조하며 사진 포스터와는 별개 레인이다.

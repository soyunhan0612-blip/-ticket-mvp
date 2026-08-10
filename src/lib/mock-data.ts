import {
  COLS_PER_ROW,
  ROWS_PER_SECTION,
  SECTIONS,
  toSeatId,
} from "@/lib/seat-map";
import type { Seat, Session, Show } from "@/types";

/*
 * posterUrl은 /posters/{slug}.jpg 형식의 로컬 썸네일(3:4)이다. 대응하는 히어로
 * 와이드(16:9)는 lib/poster-image.ts가 경로에서 유도한다 — 두 파일이 늘 짝을
 * 이뤄야 하므로 하나만 추가하지 않는다.
 *
 * 셀러 등록 포스터(/posters/*.svg)와는 별개 레인이다. lib/poster-preset.ts의
 * 프리셋 목록에 이 사진들을 넣지 않는다 — 등록 폼의 선택지가 늘어나 점진적 공개
 * 원칙(UX_PRINCIPLES.md)을 깬다.
 *
 * 사진 출처와 선정 기준은 public/posters/CREDITS.md 참조.
 */
export const MOCK_SHOWS: readonly Show[] = [
  {
    id: "show-01",
    title: "여름밤 시티 팝 콘서트",
    description:
      "도시의 야경과 어울리는 시티 팝 명곡을 밴드의 풍성한 라이브 사운드로 만나는 공연입니다.",
    posterUrl: "/posters/city-pop.jpg",
  },
  {
    id: "show-02",
    title: "뮤지컬 별을 걷는 사람들",
    description:
      "서로 다른 꿈을 품은 청춘들이 작은 극장에서 만나 함께 무대를 완성해 가는 창작 뮤지컬입니다.",
    posterUrl: "/posters/musical-stars.jpg",
  },
  {
    id: "show-03",
    title: "서울 심포니 마스터피스",
    description:
      "웅장한 관현악의 매력을 한자리에서 느낄 수 있도록 시대를 대표하는 교향곡을 선보입니다.",
    posterUrl: "/posters/symphony.jpg",
  },
  {
    id: "show-04",
    title: "오늘의 재즈 쿼텟",
    description:
      "네 명의 연주자가 섬세한 호흡과 자유로운 즉흥 연주로 완성하는 친밀한 재즈 무대입니다.",
    posterUrl: "/posters/jazz.jpg",
  },
  {
    id: "show-05",
    title: "연극 마지막 편지",
    description:
      "오래된 편지 한 통을 계기로 다시 마주한 가족의 기억과 화해를 담담하게 그린 연극입니다.",
    posterUrl: "/posters/letter.jpg",
  },
  {
    id: "show-06",
    title: "우리 소리 한마당",
    description:
      "판소리와 사물놀이의 힘찬 울림을 현대적인 무대 구성으로 풀어낸 전통 예술 공연입니다.",
    posterUrl: "/posters/gugak.jpg",
  },
  {
    id: "show-07",
    title: "컨템포러리 댄스 흐름",
    description:
      "움직임과 빛이 만들어 내는 변화에 집중하며 몸의 언어로 관계와 시간을 탐구하는 무용 공연입니다.",
    posterUrl: "/posters/dance.jpg",
  },
  {
    id: "show-08",
    title: "인디 밴드 라이브 스테이지",
    description:
      "개성 있는 세 팀의 인디 밴드가 선명한 기타 사운드와 새로운 노래를 들려주는 합동 공연입니다.",
    posterUrl: "/posters/indie.jpg",
  },
];

const SEED_SHOW_ORDER = new Map(
  MOCK_SHOWS.map((show, index) => [show.id, index]),
);

/**
 * 공연 목록의 표시 순서를 정한다. 시드 공연이 작성 순서대로 먼저 오고,
 * 셀러가 등록한 공연이 그 뒤에 ID 순으로 붙는다.
 *
 * Redis `hgetall`은 필드 순서를 보장하지 않으므로 호출자가 정렬해야 한다.
 * 단순 문자열 정렬로는 부족하다 — 셀러 공연 ID는 UUID이고 소문자 16진수로
 * 시작해 "show-"보다 앞서므로, 임의 등록물이 랜딩 카드 세 자리를 통째로
 * 차지하게 된다.
 */
export function compareShowOrder(a: Show, b: Show): number {
  const aSeed = SEED_SHOW_ORDER.get(a.id);
  const bSeed = SEED_SHOW_ORDER.get(b.id);

  if (aSeed !== undefined && bSeed !== undefined) return aSeed - bSeed;
  if (aSeed !== undefined) return -1;
  if (bSeed !== undefined) return 1;

  return a.id.localeCompare(b.id);
}

export const MOCK_SESSIONS: readonly Session[] = [
  { id: "session-01", showId: "show-01", startsAt: "2026-09-04T10:30:00.000Z" },
  { id: "session-02", showId: "show-01", startsAt: "2026-09-05T09:00:00.000Z" },
  { id: "session-03", showId: "show-01", startsAt: "2026-09-05T11:30:00.000Z" },
  { id: "session-04", showId: "show-02", startsAt: "2026-09-11T10:30:00.000Z" },
  { id: "session-05", showId: "show-02", startsAt: "2026-09-12T06:00:00.000Z" },
  { id: "session-06", showId: "show-02", startsAt: "2026-09-12T10:30:00.000Z" },
  { id: "session-07", showId: "show-03", startsAt: "2026-09-18T10:30:00.000Z" },
  { id: "session-08", showId: "show-03", startsAt: "2026-09-19T09:00:00.000Z" },
  { id: "session-09", showId: "show-03", startsAt: "2026-09-20T06:00:00.000Z" },
  { id: "session-10", showId: "show-04", startsAt: "2026-09-25T11:00:00.000Z" },
  { id: "session-11", showId: "show-04", startsAt: "2026-09-26T10:00:00.000Z" },
  { id: "session-12", showId: "show-04", startsAt: "2026-09-27T08:00:00.000Z" },
  { id: "session-13", showId: "show-05", startsAt: "2026-10-02T10:30:00.000Z" },
  { id: "session-14", showId: "show-05", startsAt: "2026-10-03T06:00:00.000Z" },
  { id: "session-15", showId: "show-05", startsAt: "2026-10-03T10:30:00.000Z" },
  { id: "session-16", showId: "show-06", startsAt: "2026-10-09T10:30:00.000Z" },
  { id: "session-17", showId: "show-06", startsAt: "2026-10-10T06:00:00.000Z" },
  { id: "session-18", showId: "show-06", startsAt: "2026-10-11T06:00:00.000Z" },
  { id: "session-19", showId: "show-07", startsAt: "2026-10-16T11:00:00.000Z" },
  { id: "session-20", showId: "show-07", startsAt: "2026-10-17T09:00:00.000Z" },
  { id: "session-21", showId: "show-07", startsAt: "2026-10-18T07:00:00.000Z" },
  { id: "session-22", showId: "show-08", startsAt: "2026-10-23T11:00:00.000Z" },
  { id: "session-23", showId: "show-08", startsAt: "2026-10-24T09:00:00.000Z" },
  { id: "session-24", showId: "show-08", startsAt: "2026-10-24T11:30:00.000Z" },
];

export function generateSeats(): Seat[] {
  const seats: Seat[] = [];

  for (const section of SECTIONS) {
    for (let row = 1; row <= ROWS_PER_SECTION; row += 1) {
      for (let col = 1; col <= COLS_PER_ROW; col += 1) {
        seats.push({
          id: toSeatId(section, row, col),
          section,
          row,
          col,
        });
      }
    }
  }

  return seats;
}

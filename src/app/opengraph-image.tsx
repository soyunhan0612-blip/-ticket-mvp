import { ImageResponse } from "next/og";

/*
 * 링크를 메신저·메일에 붙였을 때 뜨는 카드 이미지.
 * ImageResponse의 기본 폰트는 한글 글리프가 없어 두부(□)로 렌더되므로
 * 이미지 안 문구는 라틴 문자와 숫자로만 쓴다. 한국어 설명은 metadata의
 * description이 담당한다.
 */

export const alt = "ticket-mvp — 2,000-seat live seat map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SEAT_COLUMNS = 16;
const SEAT_ROWS = 6;

/* 1인 최대 4석(MAX_SEATS_PER_HOLD)이므로 흰 좌석도 정확히 4개, 그것도 붙어 있어야 한다. */
const MINE = new Set([53, 54, 55, 56]);

/* 좌석 4색을 결정적으로 배치한다. 렌더마다 다른 그림이 나오면 안 되므로 난수를 쓰지 않는다. */
function seatColor(index: number): string {
  if (MINE.has(index)) return "#ffffff"; // mine
  if (index % 7 === 0) return "#404040"; // held-other
  if (index % 11 === 0) return "#262626"; // sold
  return "#737373"; // available
}

export default function OpengraphImage() {
  const seats = Array.from(
    { length: SEAT_COLUMNS * SEAT_ROWS },
    (_, index) => index,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.03em",
            }}
          >
            ticket-mvp
          </div>
          <div style={{ fontSize: 34, color: "#a3a3a3", marginTop: 16 }}>
            2,000-seat live seat map · server-side hold · optimistic rollback
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 1040,
            gap: 10,
            margin: "36px 0",
          }}
        >
          {seats.map((index) => (
            <div
              key={index}
              style={{
                width: 55,
                height: 34,
                borderRadius: 6,
                backgroundColor: seatColor(index),
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: 26, color: "#737373" }}>
          Next.js 15 App Router · TanStack Query · Jotai · Upstash Redis
        </div>
      </div>
    ),
    size,
  );
}

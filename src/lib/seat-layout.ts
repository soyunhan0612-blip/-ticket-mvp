import type { Section } from "@/lib/seat-map";
import { COLS_PER_ROW, ROWS_PER_SECTION } from "@/lib/seat-map";
import type { Seat } from "@/types";

export const SEAT_PITCH = 14;
export const SECTION_GAP = 40;
export const SEAT_AREA_TOP = 40;

const SECTION_WIDTH = COLS_PER_ROW * SEAT_PITCH;
const SECTION_HEIGHT = ROWS_PER_SECTION * SEAT_PITCH;

export interface LayoutBox {
  width: number;
  height: number;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getSeatPosition(
  seat: Seat,
  sections: readonly Section[],
): { x: number; y: number } {
  const sectionIndex = sections.indexOf(seat.section);
  if (sectionIndex === -1) {
    throw new RangeError(`Seat section is not in the layout: ${seat.section}`);
  }

  const columnCount = Math.min(sections.length, 2);
  const sectionColumn = sectionIndex % columnCount;
  const sectionRow = Math.floor(sectionIndex / columnCount);

  return {
    x:
      sectionColumn * (SECTION_WIDTH + SECTION_GAP) +
      (seat.col - 1) * SEAT_PITCH,
    y:
      SEAT_AREA_TOP +
      sectionRow * (SECTION_HEIGHT + SECTION_GAP) +
      (seat.row - 1) * SEAT_PITCH,
  };
}

export function getLayoutBox(sections: readonly Section[]): LayoutBox {
  const columnCount = Math.min(sections.length, 2);
  const rowCount = Math.ceil(sections.length / columnCount);

  return {
    width:
      columnCount * SECTION_WIDTH + Math.max(0, columnCount - 1) * SECTION_GAP,
    height:
      SEAT_AREA_TOP +
      rowCount * SECTION_HEIGHT +
      Math.max(0, rowCount - 1) * SECTION_GAP,
  };
}

export function getInitialViewBox(box: LayoutBox): ViewBox {
  const width = box.width / 2;
  const height = box.height / 2;

  return {
    x: (box.width - width) / 2,
    y: 0,
    width,
    height,
  };
}

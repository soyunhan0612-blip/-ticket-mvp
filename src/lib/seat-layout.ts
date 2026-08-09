import {
  COLS_PER_ROW,
  ROWS_PER_SECTION,
} from "@/lib/seat-map";
import type { Seat } from "@/types";

export const SEAT_PITCH = 14;
export const SECTION_GAP = 40;
export const SEAT_AREA_TOP = 40;

const SECTION_WIDTH = COLS_PER_ROW * SEAT_PITCH;
const SECTION_HEIGHT = ROWS_PER_SECTION * SEAT_PITCH;
const INITIAL_VIEW_SCALE = 0.5;

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
  sections: readonly string[],
): { x: number; y: number } {
  const sectionIndex = sections.indexOf(seat.section);
  if (sectionIndex === -1) {
    throw new RangeError(`Seat section is not in the layout: ${seat.section}`);
  }

  const columnCount = Math.min(sections.length, 2);
  const sectionColumn = sectionIndex % columnCount;
  const sectionRow = Math.floor(sectionIndex / columnCount);

  return {
    x: sectionColumn * (SECTION_WIDTH + SECTION_GAP) +
      (seat.col - 1) * SEAT_PITCH,
    y: SEAT_AREA_TOP +
      sectionRow * (SECTION_HEIGHT + SECTION_GAP) +
      (seat.row - 1) * SEAT_PITCH,
  };
}

export function getLayoutBox(sections: readonly string[]): LayoutBox {
  if (sections.length === 0) {
    throw new RangeError("A seat layout requires at least one section");
  }

  const columnCount = Math.min(sections.length, 2);
  const rowCount = Math.ceil(sections.length / columnCount);

  return {
    width: columnCount * SECTION_WIDTH + (columnCount - 1) * SECTION_GAP,
    height: SEAT_AREA_TOP +
      rowCount * SECTION_HEIGHT +
      (rowCount - 1) * SECTION_GAP,
  };
}

export function getInitialViewBox(box: LayoutBox): ViewBox {
  const width = box.width * INITIAL_VIEW_SCALE;
  const height = box.height * INITIAL_VIEW_SCALE;

  return {
    x: (box.width - width) / 2,
    y: 0,
    width,
    height,
  };
}

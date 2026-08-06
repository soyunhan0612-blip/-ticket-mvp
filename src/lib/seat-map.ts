export const SECTIONS = ["A", "B", "C", "D"] as const;
export type Section = (typeof SECTIONS)[number];

export const ROWS_PER_SECTION = 25;
export const COLS_PER_ROW = 20;
export const SEATS_PER_SECTION = ROWS_PER_SECTION * COLS_PER_ROW;
export const TOTAL_SEATS = SECTIONS.length * SEATS_PER_SECTION;

const SEAT_ID_PATTERN =
  /^([A-D])-([1-9]|1[0-9]|2[0-5])-([1-9]|1[0-9]|20)$/;

function isSection(value: string): value is Section {
  return SECTIONS.some((section) => section === value);
}

function isIntegerInRange(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function toSeatId(section: Section, row: number, col: number): string {
  if (
    !isSection(section) ||
    !isIntegerInRange(row, 1, ROWS_PER_SECTION) ||
    !isIntegerInRange(col, 1, COLS_PER_ROW)
  ) {
    throw new RangeError("Invalid seat coordinates");
  }

  return `${section}-${row}-${col}`;
}

export function parseSeatId(
  seatId: string,
): { section: Section; row: number; col: number } | null {
  if (typeof seatId !== "string") {
    return null;
  }

  const match = SEAT_ID_PATTERN.exec(seatId);
  if (!match) {
    return null;
  }

  const [, section, row, col] = match;
  if (!isSection(section)) {
    return null;
  }

  return {
    section,
    row: Number(row),
    col: Number(col),
  };
}

export function isValidSeatId(seatId: string): boolean {
  return parseSeatId(seatId) !== null;
}

import { expectTypeOf, it } from "vitest";

import type { SeatStore } from "./seat-store";

it("defines the seat store contract", () => {
  expectTypeOf<SeatStore>().toHaveProperty("hold");
  expectTypeOf<SeatStore>().toHaveProperty("release");
  expectTypeOf<SeatStore>().toHaveProperty("getSnapshot");
});

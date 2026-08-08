import { expectTypeOf, it } from "vitest";

import type { ReservationStore } from "./reservation-store";

it("defines the reservation store contract", () => {
  expectTypeOf<ReservationStore>().toHaveProperty("create");
  expectTypeOf<ReservationStore>().toHaveProperty("listByUser");
  expectTypeOf<ReservationStore>().toHaveProperty("cancel");
});

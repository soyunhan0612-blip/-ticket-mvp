import { expect, it } from "vitest";

import { getSeatStore } from "./index";

it("returns the same seat store instance", () => {
  expect(getSeatStore()).toBe(getSeatStore());
});

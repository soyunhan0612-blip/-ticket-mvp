import { describe, expect, it } from "vitest";

import type { ShowStore } from "./show-store";

describe("ShowStore interface", () => {
  it("requires getBySessionId method in implementations", () => {
    const methods: (keyof ShowStore)[] = [
      "list",
      "get",
      "getBySessionId",
      "create",
    ];

    expect(methods).toContain("getBySessionId");
  });
});

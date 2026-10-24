import { describe, expectTypeOf, it } from "vitest";

import type { Env } from "../src/env.js";

describe("environment", () => {
  it("should not include qq", () => {
    // QQ mini-program support has been dropped
    expectTypeOf<Env>().toEqualTypeOf<"wx" | "donut" | "js">();
  });
});

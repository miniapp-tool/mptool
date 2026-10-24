import { describe, expectTypeOf, it } from "vitest";

import type { RequestOptions } from "../src/request.js";

describe("request options", () => {
  it("should not accept caller-provided success or fail callbacks", () => {
    expectTypeOf<"success" extends keyof RequestOptions ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<"fail" extends keyof RequestOptions ? true : false>().toEqualTypeOf<false>();
  });
});

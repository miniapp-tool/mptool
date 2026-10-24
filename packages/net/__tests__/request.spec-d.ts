import { describe, expectTypeOf, it } from "vitest";

import type { RequestOptions, RequestPromise, RequestResponse } from "../src/request.js";

describe("request options", () => {
  it("should not accept caller-provided success or fail callbacks", () => {
    expectTypeOf<"success" extends keyof RequestOptions ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<"fail" extends keyof RequestOptions ? true : false>().toEqualTypeOf<false>();
  });
});

describe("request result", () => {
  it("should keep the promise interface and expose abort/task", () => {
    expectTypeOf<RequestPromise>().toExtend<Promise<RequestResponse>>();
    expectTypeOf<RequestPromise>().toHaveProperty("abort");
    expectTypeOf<RequestPromise>().toHaveProperty("task");
  });
});

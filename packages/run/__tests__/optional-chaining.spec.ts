import { describe, it } from "vitest";

import { expectError, runBoth } from "./golden.js";

describe("optional chain propagation", () => {
  it("should short-circuit the whole chain for read links", () => {
    runBoth("const o = null; o?.a.b");
    runBoth("const o = null; o?.a.b.c");
    runBoth("const o = null; o?.[0].b");
    runBoth("const o = { a: { b: 2 } }; o?.a.b");
    runBoth("const o = null; o?.a?.b");
  });

  it("should short-circuit calls and leave argument expressions untouched", () => {
    runBoth("const o = null; o?.a()");
    runBoth("const o = null; o?.a(1).b");
    runBoth(
      "let calls = 0; const g = () => { calls += 1; return 1; }; const f = null; f?.(g()); calls",
    );
    runBoth(
      "let calls = 0; const g = () => { calls += 1; return 1; }; const o = null; o?.m(g()); calls",
    );
  });

  it("should still throw when a non-optional link hits a nullish value", () => {
    expectError("const o = { a: null }; o?.a.b");
    expectError("const o = {}; o?.a()");
    expectError("const o = { a: null }; o?.a()");
  });
});

import { describe, expect, it } from "vitest";

import { run, runBoth } from "./golden.js";

/**
 * Assert that both Node and the interpreter throw a TypeError.
 *
 * 断言 Node 与解释器都会抛 TypeError。
 *
 * @param code - Source code / 源码
 */
const expectTypeError = (code: string): void => {
  expect(() => {
    (0, eval)(code);
  }).toThrow(TypeError);
  expect(() => run(code)).toThrow(TypeError);
};

describe("delete with optional chains", () => {
  it("should not evaluate the computed key of a short-circuited chain", () => {
    runBoth(
      "let calls = 0; const f = () => { calls += 1; return 'k'; }; const o = null; delete o?.[f()]; calls",
    );
    runBoth(
      "let calls = 0; const f = () => { calls += 1; return 'k'; }; const o = {}; delete o?.[f()]; calls",
    );
  });

  it("should evaluate the computed key once for a live chain", () => {
    runBoth(
      "let calls = 0; const f = () => { calls += 1; return 'k'; }; const o = { k: 1 }; delete o[f()]; [calls, 'k' in o]",
    );
  });

  it("should keep deleting through a live optional link", () => {
    runBoth("const o = { a: 1 }; delete o?.a; 'a' in o");
    runBoth("const o = null; delete o?.a");
  });

  it("should still throw when a non-optional link hits null", () => {
    expectTypeError("const o = { a: null }; delete o?.a.b");
  });

  it("should skip computed keys of short-circuited chains in async code", async () => {
    const result = await run(
      "async function f() { let calls = 0; const g = () => { calls += 1; return 'k'; }; const o = null; delete o?.[g()]; return calls; } f()",
    );

    expect(result).toBe(0);
  });
});

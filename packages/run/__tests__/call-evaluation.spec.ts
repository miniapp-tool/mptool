import { describe, it } from "vitest";

import { runBoth } from "./golden.js";

describe("call evaluation order", () => {
  it("should evaluate the callee before the arguments", () => {
    runBoth(
      "let log = []; const mark = (x) => (log.push(x), x); const o = { get m() { log.push('callee'); return () => 0; } }; o.m(mark('arg')); JSON.stringify(log)",
    );
    runBoth(
      "let calls = 0; const o = { get m() { throw new Error('boom'); } }; const g = () => { calls += 1; }; try { o.m(g()); } catch (e) {} calls",
    );
  });

  it("should evaluate a computed method key when reading the callee", () => {
    runBoth("const o = { v: 3, m() { return this.v; } }; const k = 'm'; o[k]()");
  });
});

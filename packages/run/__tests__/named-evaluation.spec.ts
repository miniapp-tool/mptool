import { describe, expect, it } from "vitest";

import { run, runBoth } from "./golden.js";

/**
 * NamedEvaluation cases adapted from Test262 (`test/language/statements/let/fn-name-*.js`).
 *
 * Test262 is Copyright Ecma International and distributed under the BSD license; these cases are
 * rewritten against this package's `run`/`runBoth` helpers instead of the Test262 harness.
 */
describe("named evaluation", () => {
  it("should infer a name only for direct anonymous function definitions", () => {
    runBoth("let xCover = (0, function() {}); xCover.name");
    runBoth("let cover = (function() {}); cover.name");
    runBoth("let fn = function() {}; fn.name");
    runBoth("let arrow = () => {}; arrow.name");
  });

  it("should not infer a name from a sequence expression", () => {
    expect(run("let xCover = (0, function() {}); xCover.name")).toBe("");
    expect(run("let xCover = (0, () => {}); xCover.name")).toBe("");
  });

  it("should infer names for destructuring defaults", () => {
    runBoth("let { f = function() {} } = {}; f.name");
    runBoth("let [g = () => {}] = []; g.name");
    expect(run("let { f = function() {} } = {}; f.name")).toBe("f");
    expect(run("let [g = () => {}] = []; g.name")).toBe("g");
  });

  it("should infer names for simple assignments but not sequence assignments", () => {
    runBoth("(function () { let x; x = function () {}; return x.name; })()");
    runBoth("(function () { const o = {}; o.foo = function () {}; return o.foo.name; })()");
    expect(
      run("(function () { const o = {}; o.bar = (0, function () {}); return o.bar.name; })()"),
    ).toBe("");
  });
});

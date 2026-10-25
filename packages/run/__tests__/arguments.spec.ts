import { describe, expect, it } from "vitest";

import { run, runBoth } from "./golden.js";

describe("arguments object", () => {
  it("should map simple parameters in sloppy mode", () => {
    runBoth("(function (a) { a = 2; return arguments[0]; })(1)");
    runBoth("(function (a) { arguments[0] = 5; return a; })(1)");
    runBoth("(function (a, b) { b = 3; return [a, arguments[1]]; })(1, 2)");
    runBoth("(function (a) { return arguments.length; })(1, 2, 3)");
  });

  it("should not map when any parameter is non-simple", () => {
    runBoth("(function (a, [b]) { a = 2; return arguments[0]; })(1, [3])");
    runBoth("(function (a = 1, b) { a = 2; return arguments[0]; })(1, 2)");
    runBoth("(function (a, ...rest) { a = 2; return arguments[0]; })(1, 2)");
    runBoth("(function ({ a }) { a = 2; return arguments[0].a; })({ a: 1 })");
  });

  it("should expose callee in sloppy mode", () => {
    runBoth("(function f() { return arguments.callee === f; })()");
  });

  it("should be iterable", () => {
    runBoth("(function () { return [...arguments]; })(1, 2)");
    runBoth(
      "(function () { for (const value of arguments) {} return arguments.length; })(1, 2, 3)",
    );
    runBoth("(function () { return Array.from(arguments); })(1, 2)");
  });

  it("should report the Arguments toString tag", () => {
    runBoth("(function () { return Object.prototype.toString.call(arguments); })()");
  });

  it("should keep arguments unmapped under strict mode", () => {
    const code = "function f(a) { a = 2; return arguments[0]; } f(1)";

    expect(run(code, { strict: true })).toBe(1);
    expect((0, eval)(`"use strict"; ${code}`)).toBe(1);
  });

  it("should keep mapped arguments in async sloppy functions", async () => {
    await expect(run("(async function (a) { a = 2; return arguments[0]; })(1)")).resolves.toBe(2);
  });
});

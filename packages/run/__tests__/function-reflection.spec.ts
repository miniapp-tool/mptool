import { describe, expect, it } from "vitest";

import { run, runBoth } from "./golden.js";

describe("function reflection", () => {
  it("should expose the source function name and length", () => {
    runBoth("const f = function named(a, b) {}; [f.name, f.length]");
    runBoth("function g(a, b = 1, c) {}; [g.name, g.length]");
    runBoth("function h(a, ...rest) {}; [h.name, h.length]");
    runBoth("function i(a, [b]) {}; [i.name, i.length]");
  });

  it("should expose arrow function length", () => {
    runBoth("(function () { const k = (a, b) => a; return k.length; })()");
    runBoth("(function () { const k = (a = 1, b) => a; return k.length; })()");
  });

  it("should expose the original source through toString", () => {
    runBoth("(function () { function f(a) { return a } return String(f); })()");
    runBoth("(function () { const f = function (a) { return a + 1 }; return String(f); })()");
  });

  it("should keep arrow/method prototypes undefined", () => {
    expect(run("(() => {}).prototype")).toBeUndefined();
    expect(run("({ m() {} }).m.prototype")).toBeUndefined();
    expect(run("(function () {}).prototype === undefined")).toBe(false);
    // arrows and methods are not constructors
    expect(() => run("new (() => {})()")).toThrow(TypeError);
    expect(() => run("new ({ m() {} }).m()")).toThrow(TypeError);
  });

  it("should keep host-callable functions working after reflection changes", () => {
    runBoth("[1, 2, 3].map((n) => n * 2)");
    runBoth("(function (a, b) { return a + b })(1, 2)");
  });
});

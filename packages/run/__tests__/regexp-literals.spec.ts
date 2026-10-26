import { describe, it } from "vitest";

import { runBoth } from "./golden.js";

describe("regular expression literals", () => {
  it("should allow a regex literal at the start of a statement", () => {
    runBoth("if (true) /a/.test('a')");
    runBoth("while (false) /a/; 1");
    runBoth("for (;;) break; /a/.test('a')");
    runBoth("do {} while (false); /a/.test('a')");
  });

  it("should allow a regex literal after a block or function declaration", () => {
    runBoth("{ } /a/.test('a')");
    runBoth("function f() {} /a/.test('a')");
    runBoth("try {} catch (e) {} /a/.test('a')");
    runBoth("try {} finally {} /a/.test('a')");
    runBoth("let r; switch (1) { case 1: {} r = /a/.test('a') } r");
    runBoth("if (true) { {} /a/.test('a') }");
  });

  it("should keep `/` as division in expression position", () => {
    runBoth("const a = 4; a / 2");
    runBoth("({}) / 2");
    runBoth("(function () {}) / 2");
    runBoth("(() => {}) / 2");
    runBoth("const a = [4]; a[0] / 2");
  });

  it("should accept the d flag", () => {
    runBoth("/a/d.test('a')");
  });
});

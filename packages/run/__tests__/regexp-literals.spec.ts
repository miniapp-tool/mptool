import { describe, expect, it } from "vitest";

import { parse, ParseError } from "../src/parser.js";
import { run, runBoth } from "./golden.js";

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

  it("should allow a regex literal after a buffered lookahead", () => {
    // the `else` lookahead used to read the following `/` as division and cache it
    // `else` 预读曾把后面的 `/` 读作除号并缓存
    runBoth("if (true) { 1 }\n/a/.test('a')");
    runBoth("if (false) { 1 } else {}\n/a/.test('a')");
    runBoth("do {} while (false)\n/a/.test('a')");
    runBoth("switch (1) {}\n/a/.test('a')");
  });

  it("should allow a regex literal after contextual keywords", async () => {
    // `await` and `of` are plain identifiers to the lexer, so they used to end an expression
    // `await` 与 `of` 对词法分析器而言是普通标识符，曾被判定为可结束表达式
    await expect(run("async function f() { return (await /a/).source; } f()")).resolves.toBe("a");
    expect(() => run("for (const x of /a/) {}")).toThrow(TypeError);
  });

  it("should keep `/` as division in expression position", () => {
    runBoth("const a = 4; a / 2");
    runBoth("({}) / 2");
    runBoth("(function () {}) / 2");
    runBoth("(() => {}) / 2");
    runBoth("const a = [4]; a[0] / 2");
    // an object literal ends an expression, so ASI cannot turn the next `/` into a regex
    // 对象字面量结束了表达式，因此 ASI 不能把下一行的 `/` 当作正则
    expect(() => parse("x = {}\n/a/.test('a')")).toThrow(ParseError);
  });

  it("should accept the d flag", () => {
    runBoth("/a/d.test('a')");
  });
});

import { describe, expect, it } from "vitest";

import { parse, ParseError } from "../src/parser.js";
import { runBoth } from "./golden.js";

/**
 * Assert that parsing rejects the given program.
 *
 * 断言给定程序会被解析器拒绝。
 *
 * @param code - Source code / 源码
 */
const expectParseError = (code: string): void => {
  expect(() => parse(code)).toThrow(ParseError);
};

describe("early errors", () => {
  it("should reject const declarations without an initializer", () => {
    expectParseError("const x;");
    expectParseError("const a = 1, b;");
    expectParseError("for (const x; ; ) {}");
    // for-in/of bindings do not need an initializer
    // for-in/of 绑定不需要初始化器
    runBoth("let n = 0; for (const x in { a: 1 }) n += 1; n");
    runBoth("let n = 0; for (const x of [1, 2]) n += x; n");
  });

  it("should reject invalid for-in/of headers", () => {
    expectParseError("for (let a, b in obj) {}");
    expectParseError("for (let a, b of obj) {}");
    expectParseError("for (let a = 1 in obj) {}");
    expectParseError("for (let a = 1 of obj) {}");
  });

  it("should reject reserved words as function names", () => {
    expectParseError("function if() {}");
    expectParseError("function class() {}");
    runBoth("function f() { return 1 } f()");
  });

  it("should reject duplicate or accessor constructors", () => {
    expectParseError("class A { constructor() {} constructor() {} }");
    expectParseError("class A { get constructor() {} }");
    expectParseError("class A { set constructor(v) {} }");
    expectParseError("class A { async constructor() {} }");
    runBoth("class A { constructor() { this.x = 1 } } new A().x");
    runBoth("class A { static constructor() { return 1 } } A.constructor()");
  });

  it("should reject illegal break/continue/return", () => {
    expectParseError("break;");
    expectParseError("continue;");
    expectParseError("return 1;");
    expectParseError("switch (1) { case 1: continue; }");
    expectParseError("while (1) { function f() { break; } }");
    expectParseError("while (1) { function f() { continue; } }");
    expectParseError("outer: { continue outer; }");
    expectParseError("break missing;");
    expectParseError("continue missing;");
    expectParseError("a: a: for (;;) {}");
  });

  it("should keep legal control flow working", () => {
    runBoth("let n = 0; while (n < 3) { n += 1; if (n === 2) continue; if (n === 3) break; } n");
    runBoth("let n = 0; switch (1) { case 1: n = 1; break; default: n = 2; } n");
    runBoth("let n = 0; outer: for (;;) { n += 1; break outer; } n");
    runBoth(
      "let n = 0; outer: for (let i = 0; i < 3; i += 1) { inner: while (true) { n += 1; continue outer; } } n",
    );
    runBoth("function f() { return 1 } f()");
    runBoth("const f = () => { return 2 }; f()");
    runBoth("const f = () => 3; f()");
  });

  it("should surface illegal control flow as ParseError instead of leaking a signal", () => {
    expect(() => parse("break;")).toThrow(ParseError);
    expect(() => parse("return 1;")).toThrow(ParseError);
    expect(() => parse("continue outer;")).toThrow(ParseError);
  });

  it("should reject CoverInitializedName in plain object literals", () => {
    expectParseError("const o = { a = 1 };");
    expectParseError("({ a = 1 });");
    expectParseError("f({ a = 1 });");
    expectParseError("({ x: { a = 1 } });");
    expectParseError("(() => ({ a = 1 }))");
    expectParseError("((x = () => ({ a = 1 })) => 0)");
    expectParseError("for ({ a = 1 };;) {}");
  });

  it("should keep CoverInitializedName in destructuring patterns", () => {
    runBoth("const { a = 5 } = {}; a");
    runBoth("let a; ({ a = 6 } = {}); a");
    runBoth("const f = ({ a = 7 }) => a; f({})");
    runBoth("let n = 0; for ({ a = 8 } of [{}]) n += a; n");
    runBoth("let n = 0; for ({ a = 9 } in {}) n += a; n");
  });
});

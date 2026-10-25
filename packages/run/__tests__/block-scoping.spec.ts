import { describe, expect, it } from "vitest";

import type { RunOptions } from "../src/index.js";
import { run, runBoth } from "./golden.js";

/**
 * Assert that both Node and the interpreter throw the given error type.
 *
 * 断言 Node 与解释器都会抛出指定类型的错误。
 *
 * @param code - Source code / 源码
 * @param ctor - Expected error constructor / 期望的错误构造器
 */
const expectBothThrow = (code: string, ctor: new (...args: never[]) => Error): void => {
  expect(() => {
    (0, eval)(code);
  }).toThrow(ctor);
  expect(() => run(code)).toThrow(ctor);
};

/**
 * Golden comparison for async code.
 *
 * Async 代码的黄金对照。
 *
 * @param code - Source code / 源码
 */
const runBothAsync = async (code: string): Promise<void> => {
  const expected: unknown = await (0, eval)(code);
  const actual = await run(code);

  expect(actual).toStrictEqual(expected);
};

/**
 * Golden comparison for strict-mode code.
 *
 * 严格模式代码的黄金对照。
 *
 * @param code - Source code / 源码
 * @param options - Runtime options / 运行时选项
 * @returns The completion value / 完成值
 */
const runStrict = (code: string, options?: RunOptions): unknown =>
  run(code, { ...options, strict: true });

describe("temporal dead zone", () => {
  it("should reject reads before a let/const/class declaration", () => {
    expectBothThrow("typeof x; let x;", ReferenceError);
    expectBothThrow("x; let x = 1;", ReferenceError);
    expectBothThrow("typeof C; class C {}", ReferenceError);
    expectBothThrow("x; const x = 1;", ReferenceError);
  });

  it("should reject reads before the declaration inside a block", () => {
    expectBothThrow("{ typeof y; let y = 1; }", ReferenceError);
    // the TDZ error can be caught like any other ReferenceError
    // TDZ 错误可以像普通 ReferenceError 一样被捕获
    runBoth(
      "{ try { y; } catch (e) { if (!(e instanceof ReferenceError)) throw e; } let y = 1; } 1",
    );
  });

  it("should apply TDZ in async functions", async () => {
    await expect(run("async function g() { typeof y; let y = 1; } g()")).rejects.toThrow(
      ReferenceError,
    );
  });
});

describe("duplicate lexical declarations", () => {
  it("should reject duplicate let/const/class names", () => {
    expectBothThrow("let x; let x;", SyntaxError);
    expectBothThrow("let x; const x = 1;", SyntaxError);
    expectBothThrow("let x; class x {}", SyntaxError);
    expectBothThrow("{ let x; let x; }", SyntaxError);
    expectBothThrow("function f(a) { let a; } f(1);", SyntaxError);
    expectBothThrow("switch (1) { case 1: let y = 1; break; case 2: let y = 2; }", SyntaxError);
  });

  it("should reject lexical declarations conflicting with var", () => {
    expectBothThrow("var x; let x;", SyntaxError);
    expectBothThrow("let x; var x;", SyntaxError);
    expectBothThrow("{ let x; { var x; } }", SyntaxError);
    expectBothThrow("function f() { var x; let x; } f();", SyntaxError);
  });

  it("should still allow shadowing in nested scopes", () => {
    runBoth("let x = 1; { let x = 2; } x");
    runBoth("var x = 1; { let x = 2; } x");
    runBoth("function f() { let x = 1; { let x = 2; } return x; } f()");
  });
});

describe("block and switch scoping", () => {
  it("should keep block declarations inside their block", () => {
    runBoth("(function () { { let blockVar = 1; } return typeof blockVar; })()");
    runBoth("(function () { { const blockConst = 1; } return typeof blockConst; })()");
    runBoth("(function () { { class BlockClass {} } return typeof BlockClass; })()");
  });

  it("should give switch statements their own block scope", () => {
    runBoth(
      "(function () { switch (1) { case 1: let switchVar = 1; } return typeof switchVar; })()",
    );
    runBoth(
      "(function () { const r = typeof switchVar; switch (2) { default: let switchVar = 1; } return [r, typeof switchVar]; })()",
    );
  });

  it("should scope block functions per mode", () => {
    // sloppy Annex B: the function becomes a var binding, undefined before the block runs
    // sloppy Annex B：函数成为 var 绑定，块执行前为 undefined
    runBoth(
      "(function () { const before = typeof f; { function f() { return 1 } } return [before, typeof f]; })()",
    );
    runBoth(
      "(function () { try { f(); } catch (e) { return e instanceof TypeError; } { function f() { return 1 } } })()",
    );
    // inside the block it is callable before its declaration
    // 块内可在声明前调用
    runBoth("(function () { { const value = f(); function f() { return 2 } return value; } })()");

    // strict mode: block scoped, invisible outside
    // 严格模式：块级作用域，块外不可见
    expect(runStrict("(function () { { function f() {} } return typeof f; })()")).toBe("undefined");
    expect(run("(function () { { return typeof f; function f() {} } })()", { strict: true })).toBe(
      "function",
    );
  });

  it("should keep async block/switch scoping consistent", async () => {
    await runBothAsync(
      "(async () => { const r = typeof blockVarAsync; { let blockVarAsync = 1; } return [r, typeof blockVarAsync]; })()",
    );
    await runBothAsync(
      "(async () => { const r = typeof switchVarAsync; switch (1) { case 1: let switchVarAsync = 1; } return [r, typeof switchVarAsync]; })()",
    );
    await runBothAsync(
      "(async () => { const before = typeof blockFnAsync; { function blockFnAsync() { return 1 } } return [before, typeof blockFnAsync]; })()",
    );
  });
});

import { describe, expect, it } from "vitest";

import type { RunOptions } from "../src/index.js";
import { Runtime } from "../src/interpreter.js";
import { parse } from "../src/parser.js";

/**
 * Run code through the interpreter.
 *
 * 用解释器运行代码。
 *
 * @param code - Source code / 源码
 * @param options - Runtime options / 运行时选项
 * @returns The completion value / 完成值
 */
const run = (code: string, options?: RunOptions): unknown => new Runtime(options).run(parse(code));

/**
 * Assert that running the code throws.
 *
 * 断言运行代码会抛错。
 *
 * @param code - Source code / 源码
 * @param options - Runtime options / 运行时选项
 */
const expectError = (code: string, options?: RunOptions): void => {
  expect(() => run(code, options)).toThrow(Error);
};

describe("call stack limit accounting", () => {
  it("should recover after a caught stack overflow", () => {
    // each overflow used to leak one `stackDepth`; after `maxStack` leaks every later call failed
    // 每次溢出过去会泄漏 1 个 `stackDepth`；泄漏满 `maxStack` 后后续任意调用都会失败
    const code = [
      "function boom() { try { boom(); } catch (e) {} }",
      "for (let i = 0; i < 64; i += 1) boom();",
      "function ok() { return 1; }",
      "ok();",
    ].join("\n");

    expect(run(code, { maxStack: 32 })).toBe(1);
  });

  it("should keep enforcing maxStack", () => {
    expectError("(function f() { return f(); })()", { maxStack: 20 });
    expectError("function g() { return g(); } g()", { maxStack: 20, strict: true });
  });
});

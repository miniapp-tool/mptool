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
 * Golden comparison: run the same code in Node (indirect `eval`) and in the interpreter, then
 * assert the results are strictly equal.
 *
 * Golden 对照：将同一段代码分别在 Node（间接 `eval`）与本解释器中运行，并断言结果严格相等。
 *
 * @param code - Source code / 源码
 */
const runBoth = (code: string): void => {
  const expected = (0, eval)(code);
  const actual = run(code);

  expect(actual).toStrictEqual(expected);
};

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

describe("sloppy-mode assignment semantics", () => {
  it("should silently ignore failed writes", () => {
    runBoth("Object.freeze({}).x = 1");
    runBoth("const o = { get x() { return 1; } }; o.x = 2; o.x");
    runBoth("const o = Object.preventExtensions({}); o.x = 1; 'x' in o");
  });

  it("should silently ignore writes on primitive receivers", () => {
    runBoth("const n = 5; n.x = 1; typeof n");
    runBoth("const s = 'a'; s.x = 1; s.length");
  });

  it("should box primitive this values", () => {
    runBoth("(function() { return typeof this; }).call(5)");
    runBoth("(function() { this.x = 1; return 1; }).call(5)");
    runBoth("(function() { return this.valueOf(); }).call(5)");
    runBoth("(function() { return typeof this; }).call('a')");
  });

  it("should keep throwing on failed writes in strict mode", () => {
    expectError("Object.freeze({}).x = 1;", { strict: true });
    expectError("const o = { get x() { return 1; } }; o.x = 2;", { strict: true });
    expectError("const n = 5; n.x = 1;", { strict: true });
  });
});

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
 * Assert that both Node and the interpreter throw.
 *
 * 断言 Node 与解释器都会抛错。
 *
 * @param code - Source code / 源码
 */
const expectError = (code: string): void => {
  expect(() => {
    (0, eval)(code);
  }).toThrow(SyntaxError);
  expect(() => run(code)).toThrow(Error);
};

describe("super() in arrow functions", () => {
  it("should allow super() inside arrows created by a derived constructor", () => {
    runBoth(
      "class A { constructor(x) { this.x = x; } } class B extends A { constructor() { const f = (v) => super(v); f(7); } } new B().x",
    );
    runBoth(
      "class A { constructor() { this.a = 1; } } class B extends A { constructor() { const f = () => () => super(); f()(); } } new B().a",
    );
  });

  it("should keep the lexical this of arrows inside constructors", () => {
    runBoth(
      "class A {} class B extends A { constructor() { super(); const f = () => this; this.same = f() === this; } } new B().same",
    );
  });

  it("should reject super() in arrows outside a derived constructor", () => {
    expectError(
      "class A {} class B extends A { m() { const f = () => super(); f(); } } new B().m()",
    );
    expectError("class A { constructor() { const f = () => super(); f(); } } new A()");
  });
});

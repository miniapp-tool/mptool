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

describe("compound and logical assignment targets", () => {
  it("should evaluate computed member targets exactly once", () => {
    runBoth("let i = 0; const a = [1]; a[i++] += 1; [i, a[0], a[1]]");
    runBoth("let i = 0; const a = [null]; a[i++] ??= 2; [i, a[0], a[1]]");
    runBoth("let i = 0; const a = [0]; a[i++] ||= 2; [i, a[0], a[1]]");
    runBoth("let i = 0; const a = [1]; a[i++] &&= 3; [i, a[0], a[1]]");
  });

  it("should evaluate a computed key exactly once", () => {
    runBoth(
      "let k = 0; const f = () => { k += 1; return 'a'; }; const o = { a: 1 }; o[f()] += 1; [k, o.a]",
    );
  });

  it("should evaluate accessor member targets exactly once", () => {
    runBoth("let c = 0; const o = { get a() { c += 1; return { b: 1 }; } }; o.a.b += 1; c");
  });

  it("should evaluate super member targets exactly once", () => {
    runBoth(
      "class A { get x() { return 1; } set x(v) { this._x = v; } } class B extends A { m() { super.x += 1; return this._x; } } new B().m()",
    );
    runBoth(
      "class A { get x() { return null; } set x(v) { this._x = v; } } class B extends A { m() { super.x ??= 5; return this._x; } } new B().m()",
    );
  });
});

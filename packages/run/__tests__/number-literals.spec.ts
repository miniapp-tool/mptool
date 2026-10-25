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

describe("legacy octal literals", () => {
  it("should evaluate legacy octal literals as octal", () => {
    runBoth("0123");
    runBoth("0777");
    runBoth("00");
  });

  it("should keep non-octal decimal literals decimal", () => {
    runBoth("08");
    runBoth("09");
    runBoth("018");
  });

  it("should keep prefixed octal literals correct", () => {
    runBoth("0o123");
    runBoth("0O17");
    runBoth("0b101");
  });
});

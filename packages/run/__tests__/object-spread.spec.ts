import { describe, expect, it } from "vitest";

import { run, runBoth } from "./golden.js";

/**
 * Golden comparison for async code against Node.
 *
 * Async 代码与 Node 的黄金对照。
 *
 * @param code - Source code / 源码
 */
const runBothAsync = async (code: string): Promise<void> => {
  const expected: unknown = await (0, eval)(code);
  const actual = await run(code);

  expect(actual).toStrictEqual(expected);
};

describe("object spread and rest", () => {
  it("should copy own enumerable symbol keys", () => {
    runBoth(
      "const s = Symbol('s'); const o = { [s]: 1, a: 2 }; const c = { ...o }; [Object.getOwnPropertySymbols(c).length, c[s]]",
    );
    runBoth(
      "const s = Symbol('s'); const o = { [s]: 1, a: 2 }; const { a, ...rest } = o; [Object.getOwnPropertySymbols(rest).length, rest[s]]",
    );
  });

  it("should skip non-enumerable symbol keys", () => {
    runBoth(
      "const s = Symbol('s'); const o = {}; Object.defineProperty(o, s, { value: 1, enumerable: false }); Object.getOwnPropertySymbols({ ...o }).length",
    );
  });

  it("should copy symbol keys in async code", async () => {
    await runBothAsync(
      "(async () => { const s = Symbol('s'); const o = { [s]: 1, a: 2 }; const c = { ...o }; return [Object.getOwnPropertySymbols(c).length, c[s]]; })()",
    );
    await runBothAsync(
      "(async () => { const s = Symbol('s'); const o = { [s]: 1, a: 2 }; const { a, ...rest } = o; return [Object.getOwnPropertySymbols(rest).length, rest[s]]; })()",
    );
  });
});

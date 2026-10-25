import { describe, expect, it } from "vitest";

import { run, runBoth } from "./golden.js";

/**
 * Assert that both Node and the interpreter throw a TypeError.
 *
 * 断言 Node 与解释器都会抛 TypeError。
 *
 * @param code - Source code / 源码
 */
const expectTypeError = (code: string): void => {
  expect(() => {
    (0, eval)(code);
  }).toThrow(TypeError);
  expect(() => run(code)).toThrow(TypeError);
};

describe("template interpolation", () => {
  it("should stringify ordinary values", () => {
    runBoth("`${1}${true}${null}${undefined}`");
    runBoth("`${({})}`");
    runBoth("`${[1, 2]}`");
  });

  it("should throw TypeError when interpolating a Symbol", () => {
    expectTypeError("`${Symbol()}`");
    // String(Symbol()) stays legal and must keep working
    // String(Symbol()) 仍然合法，必须保持可用
    runBoth("String(Symbol('x'))");
  });

  it("should throw TypeError for Symbol interpolation in async templates", async () => {
    await expect(run("async function f() { return `${Symbol()}`; } f()")).rejects.toThrow(
      TypeError,
    );
  });
});

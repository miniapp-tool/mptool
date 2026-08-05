import { describe, expect, it, vi } from "vitest";

import { wrapFunction } from "../src";

describe(wrapFunction, () => {
  it("should call pre before original", () => {
    const order: string[] = [];
    const pre = vi.fn<() => void>(() => {
      order.push("pre");
    });
    const original = vi.fn<() => void>(() => {
      order.push("original");
    });

    const wrapped = wrapFunction(original, pre);

    wrapped();

    expect(order).toStrictEqual(["pre", "original"]);
  });

  it("should skip original when undefined", () => {
    const pre = vi.fn<() => void>();

    const wrapped = wrapFunction(undefined, pre);

    wrapped();

    expect(pre).toHaveBeenCalledTimes(1);
  });
});

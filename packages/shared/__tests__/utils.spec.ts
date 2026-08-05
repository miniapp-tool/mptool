import { describe, expect, it, vi } from "vitest";

import { wrapFunction } from "../src";

describe(wrapFunction, () => {
  it("should call pre then original", () => {
    const pre = vi.fn<() => void>();
    const original = vi.fn<() => void>();

    const wrapped = wrapFunction(original, pre);

    wrapped();

    expect(pre).toHaveBeenCalledTimes(1);
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("should skip original when undefined", () => {
    const pre = vi.fn<() => void>();

    const wrapped = wrapFunction(undefined, pre);

    wrapped();

    expect(pre).toHaveBeenCalledTimes(1);
  });
});

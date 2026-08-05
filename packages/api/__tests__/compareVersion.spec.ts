import { describe, expect, it } from "vitest";

import { compareVersion } from "../src/index.js";

describe(compareVersion, () => {
  it("should compare equal versions", () => {
    expect(compareVersion("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersion("2", "2.0.0")).toBe(0);
  });

  it("should compare greater", () => {
    expect(compareVersion("1.1.0", "1.0.9")).toBe(1);
  });

  it("should compare lesser", () => {
    expect(compareVersion("1.0.0", "1.0.1")).toBe(-1);
  });

  it("should handle different segment lengths", () => {
    expect(compareVersion("1.0", "1.0.1")).toBe(-1);
    expect(compareVersion("1.0.1", "1.0")).toBe(1);
  });
});

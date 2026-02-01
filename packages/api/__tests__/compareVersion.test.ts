import { describe, it, expect } from "vitest";

import { compareVersion } from "../src/compareVersion";

describe(compareVersion, () => {
  it("should return 1 if versionA > versionB", () => {
    expect(compareVersion("1.1", "1.0")).toBe(1);
    expect(compareVersion("2.0", "1.9")).toBe(1);
    expect(compareVersion("1.0.1", "1.0.0")).toBe(1);
  });

  it("should return -1 if versionA < versionB", () => {
    expect(compareVersion("1.0", "1.1")).toBe(-1);
    expect(compareVersion("1.9", "2.0")).toBe(-1);
    expect(compareVersion("1.0.0", "1.0.1")).toBe(-1);
  });

  it("should return 0 if equal", () => {
    expect(compareVersion("1.0", "1.0")).toBe(0);
    expect(compareVersion("1.0.0", "1.0")).toBe(0);
    expect(compareVersion("1.0", "1.0.0")).toBe(0);
  });
});

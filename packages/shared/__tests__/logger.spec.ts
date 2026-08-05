import "@mptool/mock";
import { describe, expect, it } from "vitest";

import type { debug } from "../src/logger.js";

describe("logger", () => {
  it("should not throw when debug is called in js environment", async () => {
    const originalWx = (globalThis as { wx?: unknown }).wx;

    delete (globalThis as { wx?: unknown }).wx;

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const mod = (await import("../src/logger.js?no-wx")) as { debug: typeof debug };

      expect(() => mod.debug("test")).not.toThrow();
    } finally {
      (globalThis as { wx?: unknown }).wx = originalWx;
    }
  });
});

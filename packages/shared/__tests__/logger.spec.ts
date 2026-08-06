import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import type { debug, error, filter, info, warn } from "../src/logger.js";

describe("logger", () => {
  it("should not throw when debug is called in js environment", async () => {
    const originalWx = (globalThis as { wx?: unknown }).wx;

    delete (globalThis as { wx?: unknown }).wx;

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const mod = (await import("../src/logger.js?no-wx")) as {
        debug: typeof debug;
        info: typeof info;
        warn: typeof warn;
        error: typeof error;
        filter: typeof filter;
      };

      expect(() => mod.debug("test")).not.toThrow();
      expect(() => mod.info("test")).not.toThrow();
      expect(() => mod.warn("test")).not.toThrow();
      expect(() => mod.error("test")).not.toThrow();
      expect(() => mod.filter("test")).not.toThrow();
    } finally {
      (globalThis as { wx?: unknown }).wx = originalWx;
    }
  });

  it("should log debug and error to the matching console method in js environment", async () => {
    const originalWx = (globalThis as { wx?: unknown }).wx;

    delete (globalThis as { wx?: unknown }).wx;

    try {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      try {
        // @ts-expect-error: query suffix for fresh module evaluation
        const mod = (await import("../src/logger.js?js-env")) as {
          debug: typeof debug;
          error: typeof error;
        };

        mod.debug("test");
        mod.error("err");

        expect(debugSpy).toHaveBeenCalledWith("test");
        expect(errorSpy).toHaveBeenCalledWith("err");
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        debugSpy.mockRestore();
        errorSpy.mockRestore();
        warnSpy.mockRestore();
      }
    } finally {
      (globalThis as { wx?: unknown }).wx = originalWx;
    }
  });
});

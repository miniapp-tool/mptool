import { describe, expect, it, vi } from "vitest";

/**
 * The file helpers must fail with a clear error instead of touching `wx` when they are imported and
 * called outside a mini-program runtime (`env === "js"`). This file deliberately does not import
 * `@mptool/mock`, so `@mptool/shared` resolves `env` to `"js"`.
 */
describe("non-miniapp environment", () => {
  it("should throw a clear error instead of calling wx file APIs", async () => {
    const originalWx = (globalThis as { wx?: unknown }).wx;

    // A fresh module graph is required: `env` is captured when `@mptool/shared` is evaluated.
    vi.resetModules();
    delete (globalThis as { wx?: unknown }).wx;

    try {
      const { exists, readFile, writeFile } = await import("../src/file.js");
      const message = /File API is only available in wx environment/u;

      expect(() => exists("tmp/anything")).toThrow(message);
      expect(() => readFile("tmp/anything")).toThrow(message);
      expect(() => writeFile("tmp/anything", "x")).toThrow(message);
    } finally {
      (globalThis as { wx?: unknown }).wx = originalWx;

      vi.resetModules();
    }
  });
});

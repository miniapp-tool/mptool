import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { dirname } from "../src/file.js";

describe("file", () => {
  it("should not invoke wx APIs at module scope", () => {
    // 模块顶层不应再访问 wx；若仍调用 wx.getFileSystemManager，导入时即会崩溃
    expect(dirname("/a/b/c")).toBe("/a/b");
  });

  it("should be importable when wx is not defined", async () => {
    const originalWx = (globalThis as { wx?: unknown }).wx;

    delete (globalThis as { wx?: unknown }).wx;

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const mod = (await import("../src/file.js?no-wx")) as {
        dirname: (path: string) => string;
      };

      expect(mod.dirname("/a/b")).toBe("/a");
    } finally {
      (globalThis as { wx?: unknown }).wx = originalWx;
    }
  });
});

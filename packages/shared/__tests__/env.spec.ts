import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { env } from "../src/env.js";

describe(env, () => {
  it("should be wx when wx is defined", () => {
    expect(env).toBe("wx");
  });

  it("should be js when wx is not defined", async () => {
    const originalWx = (globalThis as { wx?: unknown }).wx;

    delete (globalThis as { wx?: unknown }).wx;

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const { env: jsEnv } = (await import("../src/env.js?no-wx")) as {
        env: "wx" | "qq" | "donut" | "js";
      };

      expect(jsEnv).toBe("js");
    } finally {
      (globalThis as { wx?: unknown }).wx = originalWx;
    }
  });
});

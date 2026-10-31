import "@mptool/mock";
import { describe, expect, it } from "vitest";

import type { Env } from "../src/env.js";
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
      const { env: jsEnv } = (await import("../src/env.js?no-wx")) as { env: Env };

      expect(jsEnv).toBe("js");
    } finally {
      (globalThis as { wx?: unknown }).wx = originalWx;
    }
  });

  it("should be donut when wx exposes a miniapp namespace", async () => {
    const globalRecord = globalThis as { wx?: unknown };
    const originalWx = globalRecord.wx;

    globalRecord.wx = { miniapp: {} };

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const { env: donutEnv } = (await import("../src/env.js?donut")) as { env: Env };

      expect(donutEnv).toBe("donut");
    } finally {
      globalRecord.wx = originalWx;
    }
  });

  it("should be js when wx is null", async () => {
    const globalRecord = globalThis as { wx?: unknown };
    const originalWx = globalRecord.wx;

    globalRecord.wx = null;

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const { env: nullEnv } = (await import("../src/env.js?null-wx")) as { env: Env };

      expect(nullEnv).toBe("js");
    } finally {
      globalRecord.wx = originalWx;
    }
  });

  it("should ignore the qq global", async () => {
    const globalRecord = globalThis as { qq?: unknown; wx?: unknown };
    const originalQq = globalRecord.qq;
    const originalWx = globalRecord.wx;

    delete globalRecord.wx;
    globalRecord.qq = { version: "1.29.0" };

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const { env: jsEnv } = (await import("../src/env.js?qq")) as { env: Env };

      expect(jsEnv).toBe("js");
    } finally {
      globalRecord.qq = originalQq;
      globalRecord.wx = originalWx;
    }
  });
});

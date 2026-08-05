import "@mptool/mock";
import { describe, expect, it } from "vitest";

describe("logger in wx environment", () => {
  it("should use wx log manager and respect DEBUG flag", async () => {
    const calls: string[] = [];
    const mockLog = {
      debug: (...args: unknown[]): void => void calls.push(`debug:${args.map(String).join(",")}`),
      info: (...args: unknown[]): void => void calls.push(`info:${args.map(String).join(",")}`),
      warn: (...args: unknown[]): void => void calls.push(`warn:${args.map(String).join(",")}`),
      error: (...args: unknown[]): void => void calls.push(`error:${args.map(String).join(",")}`),
      setFilterMsg: (msg: string): void => void calls.push(`filter:${msg}`),
    };
    const mockWx = wx as unknown as {
      getRealtimeLogManager: () => typeof mockLog;
      env: Record<string, unknown>;
    };

    mockWx.getRealtimeLogManager = (): typeof mockLog => mockLog;

    const mod = await import("../src/logger.js");

    // DEBUG 为 false 时 debug 不输出
    mockWx.env.DEBUG = false;
    mod.debug("hidden");
    expect(calls).toStrictEqual([]);

    // DEBUG 为 true 时 debug 通过 realtime manager 输出
    mockWx.env.DEBUG = true;
    mod.debug("shown");
    expect(calls).toStrictEqual(["info:debug,shown"]);
    calls.length = 0;

    mod.info("a");
    mod.warn("b");
    mod.error("c");
    expect(calls).toStrictEqual(["info:a", "warn:b", "error:c"]);
    calls.length = 0;

    mod.filter("msg");
    expect(calls).toStrictEqual(["filter:msg"]);
  });
});

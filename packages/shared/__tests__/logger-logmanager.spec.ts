import "@mptool/mock";
import { describe, expect, it } from "vitest";

describe("logger with log manager", () => {
  it("should use debug on non-realtime log manager", async () => {
    const calls: string[] = [];
    const mockLog = {
      debug: (...args: unknown[]): void => {
        calls.push(args.map(String).join(","));
      },
      info: (...args: unknown[]): void => void calls.push(`info:${args.map(String).join(",")}`),
      warn: (...args: unknown[]): void => void calls.push(`warn:${args.map(String).join(",")}`),
      error: (...args: unknown[]): void => void calls.push(`error:${args.map(String).join(",")}`),
      setFilterMsg: (msg: string): void => void calls.push(`filter:${msg}`),
    };
    const wxAny = wx as unknown as {
      getRealtimeLogManager?: () => unknown;
      getLogManager: () => typeof mockLog;
      env: Record<string, unknown>;
    };

    // 移除 realtime log manager，使 logger 走 LogManager 分支
    delete wxAny.getRealtimeLogManager;
    wxAny.getLogManager = (): typeof mockLog => mockLog;
    wxAny.env.DEBUG = true;

    const mod = await import("../src/logger.js");

    mod.debug("shown");

    expect(calls).toStrictEqual(["shown"]);
  });
});

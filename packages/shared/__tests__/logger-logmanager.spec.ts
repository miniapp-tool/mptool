import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

describe("logger with log manager", () => {
  it("should fall back to the log manager methods when realtime logging is unavailable", async () => {
    const calls: string[] = [];
    const mockLog = {
      debug: (...args: unknown[]): void => {
        calls.push(`debug:${args.map(String).join(",")}`);
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

    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      mod.debug("shown");
      expect(calls).toStrictEqual(["debug:shown"]);
      expect(debugSpy).toHaveBeenCalledWith("shown");

      // DEBUG 关闭时 debug 既不写入日志管理器，也不输出到控制台
      calls.length = 0;
      wxAny.env.DEBUG = false;
      mod.debug("hidden");
      expect(calls).toStrictEqual([]);

      mod.info("info");
      mod.warn("warn");
      mod.error("boom");

      // info / warn 双写微信日志与控制台；LogManager 没有 error 方法，error 以 "error" 前缀走 warn
      expect(calls).toStrictEqual(["info:info", "warn:warn", "warn:error,boom"]);
      expect(infoSpy).toHaveBeenCalledWith("info");
      expect(warnSpy).toHaveBeenCalledWith("warn");
      expect(errorSpy).toHaveBeenCalledWith("boom");

      // 非实时日志不支持过滤信息
      calls.length = 0;
      mod.filter("ignored");
      expect(calls).toStrictEqual([]);
    } finally {
      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});

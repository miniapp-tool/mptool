import { afterEach, describe, expect, it, vi } from "vitest";

import { emitEvent, frameworkApi, mockWx, wx } from "../src/index.js";
import { mockState } from "../src/state.js";

const envRecord = (): Record<string, unknown> => wx.env;

interface CallResult<T = unknown> {
  ok: boolean;
  res: T;
}

const callApi = <T = unknown>(
  api: string,
  option: Record<string, unknown> = {},
): Promise<CallResult<T>> =>
  new Promise((resolve) => {
    (wx as unknown as Record<string, (value: unknown) => void>)[api]({
      ...option,
      fail: (res: T): void => resolve({ ok: false, res }),
      success: (res: T): void => resolve({ ok: true, res }),
    });
  });

describe("mockWx isolation", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset the control plane after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("scope() should restore injected rules", async () => {
    const scope = mockWx.scope();

    mockWx.failNext("getNetworkType", { type: "network" });
    expect((await callApi("getNetworkType")).ok).toBe(false);

    scope.restore();
    expect((await callApi("getNetworkType")).ok).toBe(true);
  });

  it("scope() should only be restored once", async () => {
    const scope = mockWx.scope();

    mockWx.failNext("getNetworkType", { type: "network" });
    scope.restore();
    scope.restore();

    expect((await callApi("getNetworkType")).ok).toBe(true);
  });

  it("scope() should restore storage, file system, events, pages, env and presets", () => {
    wx.setStorageSync("kept", "value");
    const listener = vi.fn<() => void>();

    wx.onThemeChange(listener);

    const scope = mockWx.scope();

    wx.setStorageSync("added", "value");
    mockWx.file("scoped/file.txt", "content");
    mockWx.pages([{ route: "/pages/scoped" }]);
    mockWx.storage({ limitSize: 1 });
    envRecord().DEBUG = true;
    wx.env.USER_DATA_PATH = "custom://";
    emitEvent("themeChange", { theme: "dark" });

    expect(listener).toHaveBeenCalledTimes(1);

    scope.restore();

    expect(wx.getStorageInfoSync().keys).toStrictEqual(["kept"]);
    expect(mockState.config.storage).toStrictEqual({});
    expect(frameworkApi.currentPages).toStrictEqual([]);
    expect(wx.env.USER_DATA_PATH).toBe("wxfile://usr");
    expect(envRecord().DEBUG).toBeUndefined();
    expect(() => wx.getFileSystemManager().readFileSync("scoped/file.txt")).toThrow(
      /no such file or directory/u,
    );

    emitEvent("themeChange", { theme: "dark" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("scope() should restore cached tab pages", async () => {
    mockWx.reset();

    const global = globalThis as unknown as { Page: (options: unknown) => void };

    global.Page({ route: "/pages/home", tabBar: true });
    global.Page({ route: "/pages/mine", tabBar: true });

    const switchTab = (url: string): Promise<unknown> =>
      (wx as unknown as { switchTab: (value: { url: string }) => Promise<unknown> }).switchTab({
        url,
      });

    await switchTab("/pages/home");

    const home = frameworkApi.tabPages.get("/pages/home");

    const scope = mockWx.scope();

    await switchTab("/pages/mine");
    expect(frameworkApi.tabPages.has("/pages/mine")).toBe(true);

    scope.restore();

    expect(frameworkApi.tabPages.has("/pages/mine")).toBe(false);
    expect(frameworkApi.tabPages.get("/pages/home")).toBe(home);
  });

  it("scope() should restore rule counters of older rules", async () => {
    mockWx.fail("getNetworkType", { type: "network" }, { times: 2 });

    const scope = mockWx.scope();

    expect((await callApi("getNetworkType")).ok).toBe(false);
    scope.restore();

    // The counter is restored, so the rule matches two more calls.
    expect((await callApi("getNetworkType")).ok).toBe(false);
    expect((await callApi("getNetworkType")).ok).toBe(false);
    expect((await callApi("getNetworkType")).ok).toBe(true);
  });

  it("scope() should truncate recorded calls", () => {
    void wx.getNetworkType({});

    const scope = mockWx.scope();

    void wx.getNetworkType({});
    void wx.getNetworkType({});
    expect(mockWx.calls("getNetworkType")).toHaveLength(3);

    scope.restore();
    expect(mockWx.calls("getNetworkType")).toHaveLength(1);
  });

  it("should support nested scopes", async () => {
    const outer = mockWx.scope();

    mockWx.fail("getNetworkType", { type: "network" });

    const inner = mockWx.scope();

    mockWx.fail("getStorageInfo", { type: "network" });

    expect((await callApi("getNetworkType")).ok).toBe(false);
    expect((await callApi("getStorageInfo")).ok).toBe(false);

    inner.restore();
    expect((await callApi("getNetworkType")).ok).toBe(false);
    expect((await callApi("getStorageInfo")).ok).toBe(true);

    outer.restore();
    expect((await callApi("getNetworkType")).ok).toBe(true);
    expect((await callApi("getStorageInfo")).ok).toBe(true);
  });

  it("run() should restore on success", async () => {
    const result = await mockWx.run(async () => {
      mockWx.failNext("getNetworkType", { type: "network" });
      expect((await callApi("getNetworkType")).ok).toBe(false);

      return 42;
    });

    expect(result).toBe(42);
    expect((await callApi("getNetworkType")).ok).toBe(true);
  });

  it("run() should restore when the callback throws", async () => {
    await expect(
      mockWx.run(async () => {
        mockWx.failNext("getNetworkType", { type: "network" });

        await Promise.resolve();

        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect((await callApi("getNetworkType")).ok).toBe(true);
  });

  it("autoRestore() should be idempotent and restore on the registered hook", async () => {
    const hooks: (() => void)[] = [];
    const extraHooks: (() => void)[] = [];

    mockWx.autoRestore((hook) => {
      hooks.push(hook);
    });
    mockWx.autoRestore((hook) => {
      extraHooks.push(hook);
    });

    expect(hooks).toHaveLength(1);
    expect(extraHooks).toHaveLength(0);

    mockWx.failNext("getNetworkType", { type: "network" });
    mockWx.storage({ limitSize: 1 });
    envRecord().DEBUG = true;

    hooks[0]();

    expect((await callApi("getNetworkType")).ok).toBe(true);
    expect(mockState.config.storage).toStrictEqual({});
    expect(envRecord().DEBUG).toBeUndefined();
  });

  it("reset() should clear rules, storage, file system, pages, presets and listeners", () => {
    mockWx.fail("getNetworkType", { type: "network" });
    wx.setStorageSync("key", "value");
    mockWx.file("reset/file.txt", "content");
    mockWx.pages([{ route: "/pages/main" }]);
    mockWx.storage({ limitSize: 1 });
    envRecord().DEBUG = true;

    const listener = vi.fn<() => void>();

    wx.onThemeChange(listener);

    mockWx.reset();

    expect(mockState.rules).toHaveLength(0);
    expect(mockState.config.storage).toStrictEqual({});
    expect(wx.getStorageInfoSync().keys).toStrictEqual([]);
    expect(frameworkApi.currentPages).toStrictEqual([]);
    expect(wx.env.USER_DATA_PATH).toBe("wxfile://usr");
    expect(envRecord().DEBUG).toBeUndefined();
    expect(() => wx.getFileSystemManager().readFileSync("reset/file.txt")).toThrow(
      /no such file or directory/u,
    );

    emitEvent("themeChange", { theme: "dark" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("should keep a manually replaced API in place", async () => {
    const original = wx.getNetworkType;
    const manual = vi.fn<(option: unknown) => void>();

    mockWx.failNext("getNetworkType", { type: "network" });
    wx.getNetworkType = manual;

    wx.getNetworkType({});
    expect(manual).toHaveBeenCalledTimes(1);

    wx.getNetworkType = original;

    // The rule is still registered; the next call goes through the mock again.
    expect((await callApi("getNetworkType")).ok).toBe(false);
  });

  it("scope() should restore APIs replaced inside the scope", () => {
    const original = wx.getNetworkType;
    const manual = vi.fn<(option: unknown) => void>();

    const scope = mockWx.scope();

    wx.getNetworkType = manual;
    wx.getNetworkType({});
    expect(manual).toHaveBeenCalledTimes(1);

    scope.restore();

    expect(wx.getNetworkType).toBe(original);
  });

  it("reset() should restore APIs replaced by tests", () => {
    const original = wx.getNetworkType;
    const manual = vi.fn<(option: unknown) => void>();

    wx.getNetworkType = manual;

    mockWx.reset();

    expect(wx.getNetworkType).toBe(original);
  });

  it("should stay compatible with vi.spyOn", () => {
    const spy = vi.spyOn(wx, "getStorageSync");

    wx.getStorageSync("key");

    expect(spy).toHaveBeenCalledWith("key");
    spy.mockRestore();
  });
});

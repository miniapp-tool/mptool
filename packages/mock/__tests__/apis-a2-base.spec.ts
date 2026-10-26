import { afterEach, describe, expect, it, vi } from "vitest";

import { mockWx, wx } from "../src/index.js";

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("a2 base api mock", () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("base64 / random", () => {
    it("should round-trip base64 and ArrayBuffer", () => {
      // oxlint-disable-next-line prefer-destructuring -- the typed array is only built to get its buffer
      const buffer = new Uint8Array([0, 1, 2, 253, 254, 255]).buffer;
      const base64 = wx.arrayBufferToBase64(buffer);

      expect(base64).toBe("AAEC/f7/");
      expect([...new Uint8Array(wx.base64ToArrayBuffer(base64))]).toStrictEqual([
        0, 1, 2, 253, 254, 255,
      ]);
    });

    it("should fill the provided typed array and return it", () => {
      const bytes = new Uint8Array(8);
      const result = wx.getRandomValues(bytes);

      expect(result).toBe(bytes);
      expect([...bytes]).toHaveLength(8);
    });
  });

  describe("system / config", () => {
    it("should return the same system info asynchronously", async () => {
      await expect(wx.getSystemInfoAsync({})).resolves.toMatchObject({
        ...wx.getSystemInfoSync(),
        errMsg: "getSystemInfoAsync:ok",
      });
    });

    it("should expose Skyline info and allow overrides", async () => {
      expect(wx.getSkylineInfoSync()).toStrictEqual({ isSupported: true, version: "0.9.7" });
      await expect(wx.getSkylineInfo({})).resolves.toMatchObject({
        isSupported: true,
        version: "0.9.7",
      });

      mockWx.system({ skyline: { isSupported: false, reason: "baselib not supported" } });

      expect(wx.getSkylineInfoSync()).toMatchObject({ isSupported: false });
      await expect(wx.getSkylineInfo({})).resolves.toMatchObject({ isSupported: false });
    });

    it("should expose api category and benchmark info", async () => {
      expect(wx.getApiCategory()).toBe("default");
      await expect(wx.getDeviceBenchmarkInfo()).resolves.toStrictEqual({
        benchmarkLevel: 0,
        errMsg: "getDeviceBenchmarkInfo:ok",
        modelLevel: 0,
      });

      mockWx.system({
        apiCategory: "native",
        benchmark: { benchmarkLevel: 30, modelLevel: 1 },
      });

      expect(wx.getApiCategory()).toBe("native");
      await expect(wx.getDeviceBenchmarkInfo()).resolves.toMatchObject({
        benchmarkLevel: 30,
        modelLevel: 1,
      });
    });

    it("should return a renderer user agent", async () => {
      await expect(wx.getRendererUserAgent()).resolves.toContain("MicroMessenger");

      mockWx.system({ rendererUserAgent: "custom-agent" });
      await expect(wx.getRendererUserAgent()).resolves.toBe("custom-agent");
    });

    it("should expose common / ext config", async () => {
      await expect(wx.getCommonConfig({ mode: 0 })).resolves.toMatchObject({
        conf_type: 2,
        errMsg: "getCommonConfig:ok",
      });
      await expect(wx.getExtConfig({})).resolves.toMatchObject({ extConfig: {} });
      expect(wx.getExtConfigSync()).toStrictEqual({});

      mockWx.system({ extConfig: { appId: "x", channel: "test" } });

      await expect(wx.getExtConfig({})).resolves.toMatchObject({
        extConfig: { appId: "x", channel: "test" },
      });
      expect(wx.getExtConfigSync()).toStrictEqual({ appId: "x", channel: "test" });
    });
  });

  describe("performance", () => {
    it("should return a performance object with the typed methods", () => {
      const performance = wx.getPerformance();

      expect(performance.getEntries()).toStrictEqual([]);
      expect(performance.getEntriesByName("x")).toStrictEqual([]);
      expect(performance.getEntriesByType("resource")).toStrictEqual([]);
      expect(performance.now()).toBeTypeOf("number");
      expect(performance.timeOrigin).toBeTypeOf("number");

      expect(() => performance.setBufferSize(10)).not.toThrow();
      expect(() => performance.createObserver(() => {}).disconnect()).not.toThrow();
    });

    it("should accept reportPerformance / reportMonitor calls", () => {
      expect(() => wx.reportPerformance(1, 2)).not.toThrow();
      expect(() => wx.reportMonitor("metric", 1)).not.toThrow();
    });

    it("should run requestIdleCallback asynchronously and support cancel", async () => {
      const callback = vi.fn<(result: { errMsg: string; timeRemaining: () => number }) => void>();
      const id = wx.requestIdleCallback(callback);

      expect(id).toBeTypeOf("number");
      expect(callback).not.toHaveBeenCalled();

      await tick();

      expect(callback).toHaveBeenCalledWith({
        errMsg: "requestIdleCallback:ok",
        timeRemaining: expect.any(Function),
      });
      expect(callback.mock.calls[0][0].timeRemaining()).toBe(0);

      const cancelled = vi.fn<() => void>();
      const cancelledId = wx.requestIdleCallback(cancelled);

      wx.cancelIdleCallback(cancelledId);
      await tick();

      expect(cancelled).not.toHaveBeenCalled();
    });
  });

  describe("page", () => {
    it("should resolve the page UI APIs", async () => {
      await expect(wx.enableAlertBeforeUnload({ message: "leave?" })).resolves.toMatchObject({
        errMsg: "enableAlertBeforeUnload:ok",
      });
      await expect(wx.disableAlertBeforeUnload({})).resolves.toMatchObject({
        errMsg: "disableAlertBeforeUnload:ok",
      });
      await expect(wx.showNavigationBarLoading({})).resolves.toMatchObject({
        errMsg: "showNavigationBarLoading:ok",
      });
      await expect(wx.hideNavigationBarLoading({})).resolves.toMatchObject({
        errMsg: "hideNavigationBarLoading:ok",
      });
      await expect(wx.startPullDownRefresh({})).resolves.toMatchObject({
        errMsg: "startPullDownRefresh:ok",
      });
      await expect(wx.setTopBarText({ text: "top" })).resolves.toMatchObject({
        errMsg: "setTopBarText:ok",
      });
      const rewrite = await wx.rewriteRoute({});

      expect(rewrite).toMatchObject({ errMsg: "rewriteRoute:ok" });
    });
  });

  describe("integration", () => {
    it("should expose the new APIs through canIUse", () => {
      for (const api of [
        "base64ToArrayBuffer",
        "arrayBufferToBase64",
        "getRandomValues",
        "getSystemInfoAsync",
        "getSkylineInfo",
        "getPerformance",
        "requestIdleCallback",
        "rewriteRoute",
      ])
        expect(wx.canIUse(api)).toBe(true);
    });

    it("should support failure injection", async () => {
      mockWx.failNext("getSystemInfoAsync", { type: "network" });

      await expect(wx.getSystemInfoAsync({})).rejects.toThrow(/getSystemInfoAsync:fail/u);
    });
  });
});

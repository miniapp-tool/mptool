import { describe, expect, it, vi } from "vitest";

import { emitEvent, wx } from "../src/index.js";

describe("ui mock", () => {
  it("showToast should resolve", async () => {
    await expect(wx.showToast({ title: "hi" })).resolves.toStrictEqual({
      errMsg: "showToast:ok",
    });
  });

  it("showModal should confirm by default", async () => {
    const res = (await wx.showModal({ title: "t", content: "c" })) as {
      confirm: boolean;
      cancel: boolean;
    };

    expect(res.confirm).toBe(true);
    expect(res.cancel).toBe(false);
  });

  it("getSetting should return empty authSetting", async () => {
    const res = (await wx.getSetting({})) as { authSetting: Record<string, boolean> };

    expect(res.authSetting).toStrictEqual({});
  });

  it("getWindowInfo should return window info", () => {
    expect(wx.getWindowInfo().windowWidth).toBe(375);
  });

  it("getUpdateManager should return update manager", () => {
    const updateManager = wx.getUpdateManager();

    expect(updateManager).toBeDefined();
    expect(updateManager.onUpdateReady).toBeTypeOf("function");
  });

  it("showLoading should resolve", async () => {
    await expect(wx.showLoading({ title: "loading" })).resolves.toStrictEqual({
      errMsg: "showLoading:ok",
    });
  });

  it("hideLoading should not throw", () => {
    expect(() => wx.hideLoading()).not.toThrow();
  });

  it("authorize should resolve", async () => {
    await expect(wx.authorize({ scope: "scope.test" })).resolves.toStrictEqual({
      errMsg: "authorize:ok",
    });
  });

  it("openSetting should resolve with empty authSetting", async () => {
    const res = (await wx.openSetting({})) as { authSetting: Record<string, boolean> };

    expect(res.authSetting).toStrictEqual({});
  });

  it("getSystemInfoSync should return system info", () => {
    expect(wx.getSystemInfoSync().platform).toBe("ios");
  });

  it("getAppBaseInfo should return app base info", () => {
    const info = wx.getAppBaseInfo();

    expect(info.SDKVersion).toBe("3.8.0");
    expect(info.theme).toBe("light");
  });

  it("getAccountInfoSync should return account info", () => {
    const info = wx.getAccountInfoSync() as {
      miniProgram: { appId: string; envVersion: string };
      plugin: { appId: string; version: string };
    };

    expect(info.miniProgram.appId).toBe("wx1234567890abcdef");
    expect(info.plugin).toStrictEqual({ appId: "", version: "" });
  });

  it("getDeviceInfo should return device info", () => {
    const info = wx.getDeviceInfo();

    expect(info.brand).toBe("devtools");
    expect(info.platform).toBe("devtools");
  });

  it("getMenuButtonBoundingClientRect should return menu button rect", () => {
    const rect = wx.getMenuButtonBoundingClientRect();

    expect(rect.width).toBe(85);
    expect(rect.height).toBe(32);
  });

  it("getSystemSetting should return system setting", () => {
    const setting = wx.getSystemSetting();

    expect(setting.wifiEnabled).toBe(true);
    expect(setting.deviceOrientation).toBe("portrait");
  });

  it("getNetworkType should return wifi", async () => {
    const res = (await wx.getNetworkType({})) as { networkType: string };

    expect(res.networkType).toBe("wifi");
  });

  it("startWifi should resolve", async () => {
    await expect(wx.startWifi({})).resolves.toStrictEqual({ errMsg: "startWifi:ok" });
  });

  it("getConnectedWifi should return full wifi info", async () => {
    const res = (await wx.getConnectedWifi({})) as { wifi: Record<string, unknown> };

    expect(res.wifi.signalStrength).toBe(1);
    expect(res.wifi.SSID).toBe("");
    expect(res.wifi.frequency).toBe(0);
  });

  it("setClipboardData should resolve", async () => {
    await expect(wx.setClipboardData({ data: "hi" })).resolves.toStrictEqual({
      errMsg: "setClipboardData:ok",
    });
  });

  it("getClipboardData should resolve with empty data", async () => {
    const res = (await wx.getClipboardData({})) as { data: string };

    expect(res.data).toBe("");
  });

  it("saveImageToPhotosAlbum should resolve", async () => {
    await expect(wx.saveImageToPhotosAlbum({ filePath: "x.png" })).resolves.toStrictEqual({
      errMsg: "saveImageToPhotosAlbum:ok",
    });
  });

  it("addPhoneContact should resolve", async () => {
    await expect(wx.addPhoneContact({ firstName: "a" })).resolves.toStrictEqual({
      errMsg: "addPhoneContact:ok",
    });
  });

  it("openDocument should resolve", async () => {
    await expect(wx.openDocument({ filePath: "a.pdf" })).resolves.toStrictEqual({
      errMsg: "openDocument:ok",
    });
  });

  it("addFileToFavorites should resolve", async () => {
    await expect(wx.addFileToFavorites({ filePath: "a.pdf" })).resolves.toStrictEqual({
      errMsg: "addFileToFavorites:ok",
    });
  });

  it("canIUse should return true", () => {
    expect(wx.canIUse()).toBe(true);
  });

  it("reportEvent should not throw", () => {
    expect(() => wx.reportEvent()).not.toThrow();
  });

  it("onThemeChange should register and offThemeChange should remove listener", () => {
    const listener = vi.fn<(result: { theme: "dark" | "light" }) => void>();

    wx.onThemeChange(listener);
    emitEvent("themeChange", { theme: "dark" });
    expect(listener).toHaveBeenCalledWith({ theme: "dark" });

    wx.offThemeChange(listener);
    emitEvent("themeChange", { theme: "light" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("offThemeChange without listener should remove all listeners", () => {
    const listener = vi.fn<(result: { theme: "dark" | "light" }) => void>();

    wx.onThemeChange(listener);
    wx.offThemeChange();
    emitEvent("themeChange", { theme: "dark" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("onAppShow/offAppShow should register and remove listener", () => {
    const listener = vi.fn<(result: Record<string, unknown>) => void>();

    wx.onAppShow(listener);
    emitEvent("appShow", { path: "pages/index/index" });
    expect(listener).toHaveBeenCalledWith({ path: "pages/index/index" });

    wx.offAppShow(listener);
    emitEvent("appShow", { path: "pages/index/index" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("onAppHide should register listener", () => {
    const listener = vi.fn<() => void>();

    wx.onAppHide(listener);
    emitEvent("appHide");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("onWindowResize should register and offWindowResize should remove listener", () => {
    const listener =
      vi.fn<(result: { size: { windowWidth: number; windowHeight: number } }) => void>();
    const result = { size: { windowWidth: 375, windowHeight: 667 } };

    wx.onWindowResize(listener);
    emitEvent("windowResize", result);
    expect(listener).toHaveBeenCalledWith(result);

    wx.offWindowResize(listener);
    emitEvent("windowResize", result);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should call success callback", () =>
    new Promise<void>((resolve) => {
      wx.showToast({
        title: "hi",
        success: (res: { errMsg: string }): void => {
          expect(res.errMsg).toBe("showToast:ok");
          resolve();
        },
      });
    }));
});

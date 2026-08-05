import { describe, expect, it } from "vitest";

import { wx } from "../src/index.js";

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

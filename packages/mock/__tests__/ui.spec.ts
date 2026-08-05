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
    expect(() => wx.reportEvent("event", {})).not.toThrow();
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

  it("hideToast should not throw", () => {
    expect(() => wx.hideToast()).not.toThrow();
  });

  it("showActionSheet should resolve with tapIndex 0", async () => {
    const res = (await wx.showActionSheet({ itemList: ["a", "b"] })) as { tapIndex: number };

    expect(res.tapIndex).toBe(0);
  });

  it("hideKeyboard should not throw", () => {
    expect(() => wx.hideKeyboard()).not.toThrow();
  });

  it("vibrateShort should resolve", async () => {
    await expect(wx.vibrateShort({})).resolves.toStrictEqual({ errMsg: "vibrateShort:ok" });
  });

  it("vibrateLong should resolve", async () => {
    await expect(wx.vibrateLong({})).resolves.toStrictEqual({ errMsg: "vibrateLong:ok" });
  });

  it("setNavigationBarTitle should resolve", async () => {
    await expect(wx.setNavigationBarTitle({ title: "hi" })).resolves.toStrictEqual({
      errMsg: "setNavigationBarTitle:ok",
    });
  });

  it("setNavigationBarColor should resolve", async () => {
    await expect(
      wx.setNavigationBarColor({ frontColor: "#ffffff", backgroundColor: "#000000" }),
    ).resolves.toStrictEqual({ errMsg: "setNavigationBarColor:ok" });
  });

  it("pageScrollTo should resolve", async () => {
    await expect(wx.pageScrollTo({ scrollTop: 100 })).resolves.toStrictEqual({
      errMsg: "pageScrollTo:ok",
    });
  });

  it("stopPullDownRefresh should resolve", async () => {
    await expect(wx.stopPullDownRefresh({})).resolves.toStrictEqual({
      errMsg: "stopPullDownRefresh:ok",
    });
  });

  it("showShareMenu and hideShareMenu should resolve", async () => {
    await expect(wx.showShareMenu({})).resolves.toStrictEqual({ errMsg: "showShareMenu:ok" });
    await expect(wx.hideShareMenu({})).resolves.toStrictEqual({ errMsg: "hideShareMenu:ok" });
  });

  it("showShareImageMenu should resolve", async () => {
    await expect(wx.showShareImageMenu({ path: "x.png" })).resolves.toStrictEqual({
      errMsg: "showShareImageMenu:ok",
    });
  });

  it("hideHomeButton should resolve", async () => {
    await expect(wx.hideHomeButton({})).resolves.toStrictEqual({ errMsg: "hideHomeButton:ok" });
  });

  it("tabBar methods should resolve", async () => {
    await expect(wx.setTabBarBadge({ index: 0, text: "1" })).resolves.toStrictEqual({
      errMsg: "setTabBarBadge:ok",
    });
    await expect(wx.removeTabBarBadge({ index: 0 })).resolves.toStrictEqual({
      errMsg: "removeTabBarBadge:ok",
    });
    await expect(wx.showTabBarRedDot({ index: 0 })).resolves.toStrictEqual({
      errMsg: "showTabBarRedDot:ok",
    });
    await expect(wx.hideTabBarRedDot({ index: 0 })).resolves.toStrictEqual({
      errMsg: "hideTabBarRedDot:ok",
    });
    await expect(wx.setTabBarItem({ index: 0, text: "a" })).resolves.toStrictEqual({
      errMsg: "setTabBarItem:ok",
    });
    await expect(wx.setTabBarStyle({})).resolves.toStrictEqual({ errMsg: "setTabBarStyle:ok" });
    await expect(wx.showTabBar({})).resolves.toStrictEqual({ errMsg: "showTabBar:ok" });
    await expect(wx.hideTabBar({})).resolves.toStrictEqual({ errMsg: "hideTabBar:ok" });
  });

  it("setBackgroundColor and setBackgroundTextStyle should resolve", async () => {
    await expect(wx.setBackgroundColor({ backgroundColor: "#fff" })).resolves.toStrictEqual({
      errMsg: "setBackgroundColor:ok",
    });
    await expect(wx.setBackgroundTextStyle({ textStyle: "dark" })).resolves.toStrictEqual({
      errMsg: "setBackgroundTextStyle:ok",
    });
  });

  it("setEnableDebug should resolve", async () => {
    await expect(wx.setEnableDebug({ enableDebug: true })).resolves.toStrictEqual({
      errMsg: "setEnableDebug:ok",
    });
  });

  it("getLaunchOptionsSync should return launch options", () => {
    const res = wx.getLaunchOptionsSync() as { path: string; query: unknown; scene: number };

    expect(res.path).toBe("");
    expect(res.query).toStrictEqual({});
    expect(res.scene).toBe(1001);
  });

  it("getEnterOptionsSync should return enter options", () => {
    const res = wx.getEnterOptionsSync() as { path: string; query: unknown; scene: number };

    expect(res.path).toBe("");
    expect(res.query).toStrictEqual({});
  });

  it("getAppAuthorizeSetting should return authorized settings", () => {
    const res = wx.getAppAuthorizeSetting() as { albumAuthorized: string };

    expect(res.albumAuthorized).toBe("authorized");
  });

  it("onUserCaptureScreen should register and offUserCaptureScreen should remove listener", () => {
    const listener = vi.fn<() => void>();

    wx.onUserCaptureScreen(listener);
    emitEvent("userCaptureScreen");
    expect(listener).toHaveBeenCalledTimes(1);

    wx.offUserCaptureScreen(listener);
    emitEvent("userCaptureScreen");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("navigateToMiniProgram should resolve", async () => {
    await expect(wx.navigateToMiniProgram({ appId: "wx1234567890abcdef" })).resolves.toStrictEqual({
      errMsg: "navigateToMiniProgram:ok",
    });
  });

  it("navigateBackMiniProgram should resolve", async () => {
    await expect(wx.navigateBackMiniProgram({})).resolves.toStrictEqual({
      errMsg: "navigateBackMiniProgram:ok",
    });
  });

  it("openCustomerServiceChat should resolve", async () => {
    await expect(wx.openCustomerServiceChat({ url: "https://example.com" })).resolves.toStrictEqual(
      { errMsg: "openCustomerServiceChat:ok" },
    );
  });

  it("updateShareMenu should resolve", async () => {
    await expect(wx.updateShareMenu({ withShareTicket: true })).resolves.toStrictEqual({
      errMsg: "updateShareMenu:ok",
    });
  });

  it("showKeyboard should resolve", async () => {
    await expect(wx.showKeyboard({ defaultValue: "", maxLength: 140 })).resolves.toStrictEqual({
      errMsg: "showKeyboard:ok",
    });
  });

  it("onKeyboardHeightChange should register and remove listener", () => {
    const listener = vi.fn<(result: { height: number }) => void>();

    wx.onKeyboardHeightChange(listener);
    emitEvent("keyboardHeightChange", { height: 300 });
    expect(listener).toHaveBeenCalledWith({ height: 300 });

    wx.offKeyboardHeightChange(listener);
    emitEvent("keyboardHeightChange", { height: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("onCopyUrl should register and offCopyUrl should remove listener", () => {
    const listener = vi.fn<(result: { query: string }) => void>();

    wx.onCopyUrl(listener);
    emitEvent("copyUrl", { query: "a=1" });
    expect(listener).toHaveBeenCalledWith({ query: "a=1" });

    wx.offCopyUrl(listener);
    emitEvent("copyUrl", { query: "a=2" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("nextTick should call the callback", () => {
    const callback = vi.fn<() => void>();

    wx.nextTick(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("getPrivacySetting should resolve", async () => {
    const res = (await wx.getPrivacySetting({})) as { needAuthorization: boolean };

    expect(res.needAuthorization).toBe(false);
  });

  it("requirePrivacyAuthorize should resolve", async () => {
    await expect(wx.requirePrivacyAuthorize({})).resolves.toStrictEqual({
      errMsg: "requirePrivacyAuthorize:ok",
    });
  });

  it("onNeedPrivacyAuthorization should register listener", () => {
    const listener =
      vi.fn<(result: { needAuthorization: boolean; privacyContractName: string }) => void>();

    wx.onNeedPrivacyAuthorization(listener);
    emitEvent("needPrivacyAuthorization", {
      needAuthorization: true,
      privacyContractName: "协议",
    });
    expect(listener).toHaveBeenCalledWith({
      needAuthorization: true,
      privacyContractName: "协议",
    });
  });

  it("getExptInfoSync should return requested keys", () => {
    const res = wx.getExptInfoSync(["color", "size"]);

    expect(res).toStrictEqual({ color: "", size: "" });
  });

  it("getEnvInfoSync should return env info", () => {
    const res = wx.getEnvInfoSync();

    expect(res.appName).toBe("WeChat");
  });
});

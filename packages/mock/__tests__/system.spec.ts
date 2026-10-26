import { afterEach, describe, expect, it, vi } from "vitest";

import { mockWx, wx } from "../src/index.js";

const SYSTEM_INFO_FIELDS = [
  "SDKVersion",
  "albumAuthorized",
  "benchmarkLevel",
  "bluetoothEnabled",
  "brand",
  "cameraAuthorized",
  "deviceOrientation",
  "enableDebug",
  "fontSizeSetting",
  "host",
  "language",
  "locationAuthorized",
  "locationEnabled",
  "locationReducedAccuracy",
  "microphoneAuthorized",
  "model",
  "notificationAlertAuthorized",
  "notificationAuthorized",
  "notificationBadgeAuthorized",
  "notificationSoundAuthorized",
  "phoneCalendarAuthorized",
  "pixelRatio",
  "platform",
  "safeArea",
  "screenHeight",
  "screenWidth",
  "statusBarHeight",
  "system",
  "version",
  "wifiEnabled",
  "windowHeight",
  "windowWidth",
] as const;

describe("system info / network / env", () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("defaults", () => {
    it("should use the real-device user data path and client version", () => {
      expect(wx.env.USER_DATA_PATH).toBe("wxfile://usr");
      expect(wx.version).toBe("8.0.30");
    });

    it("should expose all SystemInfo fields", () => {
      const info = wx.getSystemInfoSync();

      for (const field of SYSTEM_INFO_FIELDS) expect(info).toHaveProperty(field);
      expect(info.platform).toBe("devtools");
      expect(info.brand).toBe("devtools");
      expect(info.model).toBe("test");
      expect(info.windowWidth).toBe(375);
      expect(info.windowHeight).toBe(667);
      expect(info.pixelRatio).toBe(2);
      expect(info.statusBarHeight).toBe(20);
      expect(info.safeArea).toStrictEqual({
        bottom: 667,
        height: 647,
        left: 0,
        right: 375,
        top: 20,
        width: 375,
      });
    });

    it("should keep getSystemInfo consistent with getSystemInfoSync", async () => {
      const sync = wx.getSystemInfoSync();
      const async = (await wx.getSystemInfo({})) as Record<string, unknown>;

      const { errMsg, ...asyncInfo } = async;

      expect(errMsg).toBe("getSystemInfo:ok");
      expect(asyncInfo).toStrictEqual(sync);
    });

    it("should derive window / device / app base info from the same source", () => {
      const windowInfo = wx.getWindowInfo();
      const deviceInfo = wx.getDeviceInfo();
      const appBaseInfo = wx.getAppBaseInfo();
      const systemSetting = wx.getSystemSetting();

      expect(windowInfo).toMatchObject({
        pixelRatio: 2,
        screenHeight: 667,
        screenTop: 0,
        screenWidth: 375,
        statusBarHeight: 20,
        windowHeight: 667,
        windowWidth: 375,
      });
      expect(deviceInfo).toMatchObject({
        brand: "devtools",
        model: "test",
        platform: "devtools",
        system: "macOS 14.0",
      });
      expect(appBaseInfo).toMatchObject({
        SDKVersion: "3.8.0",
        language: "zh_CN",
        theme: "light",
        version: "8.0.0",
      });
      expect(systemSetting).toStrictEqual({
        bluetoothEnabled: true,
        deviceOrientation: "portrait",
        locationEnabled: true,
        wifiEnabled: true,
      });
    });
  });

  describe("mockWx.system", () => {
    it("should drive every system-information API", () => {
      mockWx.system({
        SDKVersion: "3.9.0",
        brand: "Apple",
        enableDebug: true,
        fontSizeSetting: 20,
        language: "en",
        model: "iPhone 15",
        pixelRatio: 3,
        platform: "ios",
        safeArea: { bottom: 896, height: 852, left: 0, right: 414, top: 44, width: 414 },
        statusBarHeight: 44,
        system: "iOS 17.0",
        theme: "dark",
        version: "8.0.20",
        windowHeight: 896,
        windowWidth: 414,
      });

      expect(wx.getSystemInfoSync()).toMatchObject({
        SDKVersion: "3.9.0",
        brand: "Apple",
        enableDebug: true,
        fontSizeSetting: 20,
        language: "en",
        model: "iPhone 15",
        pixelRatio: 3,
        platform: "ios",
        system: "iOS 17.0",
        theme: "dark",
        version: "8.0.20",
        windowHeight: 896,
        windowWidth: 414,
      });
      expect(wx.getWindowInfo()).toMatchObject({ screenWidth: 414, windowWidth: 414 });
      expect(wx.getDeviceInfo()).toMatchObject({ brand: "Apple", platform: "ios" });
      expect(wx.getAppBaseInfo()).toMatchObject({
        SDKVersion: "3.9.0",
        theme: "dark",
        version: "8.0.20",
      });
    });

    it("should toggle system settings", () => {
      mockWx.system({
        bluetoothEnabled: false,
        deviceOrientation: "landscape",
        locationEnabled: false,
        wifiEnabled: false,
      });

      expect(wx.getSystemSetting()).toStrictEqual({
        bluetoothEnabled: false,
        deviceOrientation: "landscape",
        locationEnabled: false,
        wifiEnabled: false,
      });

      const info = wx.getSystemInfoSync();

      expect(info.bluetoothEnabled).toBe(false);
      expect(info.locationEnabled).toBe(false);
      expect(info.wifiEnabled).toBe(false);
    });

    it("should update wx.env.USER_DATA_PATH and the file-system root", () => {
      mockWx.system({ userDataPath: "wxfile://custom" });

      expect(wx.env.USER_DATA_PATH).toBe("wxfile://custom");

      const fs = wx.getFileSystemManager();

      fs.writeFileSync(`${wx.env.USER_DATA_PATH}/a.txt`, "a");
      expect(fs.readFileSync(`${wx.env.USER_DATA_PATH}/a.txt`, "utf-8")).toBe("a");
    });

    it("should derive authorization states from mockWx.auth", () => {
      mockWx.auth({ "scope.camera": false, "scope.writePhotosAlbum": false });

      expect(wx.getAppAuthorizeSetting()).toMatchObject({
        albumAuthorized: "denied",
        cameraAuthorized: "denied",
        microphoneAuthorized: "authorized",
      });

      const info = wx.getSystemInfoSync();

      expect(info.albumAuthorized).toBe(false);
      expect(info.cameraAuthorized).toBe(false);
      expect(info.microphoneAuthorized).toBe(true);
    });
  });

  describe("network", () => {
    it("should return the configured network type and signal", async () => {
      mockWx.network({ networkType: "4g", signalStrength: 42, weakNet: true });

      await expect(wx.getNetworkType({})).resolves.toMatchObject({
        networkType: "4g",
        signalStrength: 42,
        weakNet: true,
      });

      await expect(wx.getConnectedWifi({})).resolves.toMatchObject({
        wifi: { signalStrength: 42 },
      });
    });

    it("should use the platform-dependent default signal strength", async () => {
      mockWx.system({ platform: "ios" });
      await expect(wx.getNetworkType({})).resolves.toMatchObject({ signalStrength: 1 });

      mockWx.system({ platform: "android" });
      await expect(wx.getNetworkType({})).resolves.toMatchObject({ signalStrength: 100 });
    });

    it("should report network changes through onNetworkStatusChange", () => {
      const listener = vi.fn<(result: { isConnected: boolean; networkType: string }) => void>();

      wx.onNetworkStatusChange(listener);
      mockWx.network({ networkType: "5g" });

      expect(listener).toHaveBeenCalledWith({ isConnected: true, networkType: "5g" });

      mockWx.network({ networkType: "5g" });
      expect(listener).toHaveBeenCalledTimes(1);

      wx.offNetworkStatusChange(listener);
      mockWx.network({ networkType: "none" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should report offline as none", async () => {
      mockWx.network({ offline: true });

      await expect(wx.getNetworkType({})).resolves.toMatchObject({ networkType: "none" });
    });
  });

  describe("isolation", () => {
    it("should restore system / network / env through a scope", () => {
      const scope = mockWx.scope();

      mockWx.system({ platform: "ios", userDataPath: "wxfile://scoped" });
      mockWx.network({ networkType: "5g" });

      scope.restore();

      expect(wx.env.USER_DATA_PATH).toBe("wxfile://usr");
      expect(wx.getSystemInfoSync().platform).toBe("devtools");

      return expect(wx.getNetworkType({})).resolves.toMatchObject({ networkType: "wifi" });
    });

    it("should reset system / network / env", async () => {
      mockWx.system({ platform: "ios", userDataPath: "wxfile://scoped" });
      mockWx.network({ networkType: "5g" });

      mockWx.reset();

      expect(wx.env.USER_DATA_PATH).toBe("wxfile://usr");
      expect(wx.getSystemInfoSync().platform).toBe("devtools");
      await expect(wx.getNetworkType({})).resolves.toMatchObject({ networkType: "wifi" });
    });
  });
});

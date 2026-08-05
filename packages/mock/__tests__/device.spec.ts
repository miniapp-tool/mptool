import { describe, expect, it } from "vitest";

import { wx } from "../src/index.js";

describe("device mock", () => {
  it("getSystemInfo should resolve", async () => {
    const res = (await wx.getSystemInfo({})) as { platform: string };

    expect(res.platform).toBe("ios");
  });

  it("getBatteryInfo should resolve", async () => {
    const res = (await wx.getBatteryInfo({})) as { level: number; isCharging: boolean };

    expect(res.level).toBe(100);
    expect(res.isCharging).toBe(true);
  });

  it("getBatteryInfoSync should return battery info", () => {
    const res = wx.getBatteryInfoSync() as { level: number; isCharging: boolean };

    expect(res.level).toBe(100);
    expect(res.isCharging).toBe(true);
  });

  it("getScreenBrightness should resolve", async () => {
    const res = (await wx.getScreenBrightness({})) as { value: number };

    expect(res.value).toBe(1);
  });

  it("setScreenBrightness should resolve", async () => {
    await expect(wx.setScreenBrightness({ value: 0.5 })).resolves.toStrictEqual({
      errMsg: "setScreenBrightness:ok",
    });
  });

  it("setKeepScreenOn should resolve", async () => {
    await expect(wx.setKeepScreenOn({ keepScreenOn: true })).resolves.toStrictEqual({
      errMsg: "setKeepScreenOn:ok",
    });
  });

  it("makePhoneCall should resolve", async () => {
    await expect(wx.makePhoneCall({ phoneNumber: "10086" })).resolves.toStrictEqual({
      errMsg: "makePhoneCall:ok",
    });
  });

  it("scanCode should resolve with empty result", async () => {
    const res = (await wx.scanCode({})) as { result: string; scanType: string };

    expect(res.result).toBe("");
    expect(res.scanType).toBe("");
  });

  it("chooseImage should resolve with empty lists", async () => {
    const res = (await wx.chooseImage({})) as { tempFilePaths: unknown[]; tempFiles: unknown[] };

    expect(res.tempFilePaths).toStrictEqual([]);
    expect(res.tempFiles).toStrictEqual([]);
  });

  it("chooseMedia should resolve with image type", async () => {
    const res = (await wx.chooseMedia({})) as { tempFiles: unknown[]; type: string };

    expect(res.tempFiles).toStrictEqual([]);
    expect(res.type).toBe("image");
  });

  it("previewImage should resolve", async () => {
    await expect(wx.previewImage({ urls: [] })).resolves.toStrictEqual({
      errMsg: "previewImage:ok",
    });
  });

  it("getImageInfo should resolve", async () => {
    const res = (await wx.getImageInfo({ src: "x.png" })) as { width: number; height: number };

    expect(res.width).toBe(0);
    expect(res.height).toBe(0);
  });

  it("compressImage should resolve", async () => {
    const res = (await wx.compressImage({ src: "x.png" })) as { tempFilePath: string };

    expect(res.tempFilePath).toBe("");
  });

  it("chooseVideo should resolve", async () => {
    const res = (await wx.chooseVideo({})) as { tempFilePath: string; duration: number };

    expect(res.tempFilePath).toBe("");
    expect(res.duration).toBe(0);
  });

  it("saveVideoToPhotosAlbum should resolve", async () => {
    await expect(wx.saveVideoToPhotosAlbum({ filePath: "x.mp4" })).resolves.toStrictEqual({
      errMsg: "saveVideoToPhotosAlbum:ok",
    });
  });

  it("chooseMessageFile should resolve", async () => {
    const res = (await wx.chooseMessageFile({})) as { tempFiles: unknown[] };

    expect(res.tempFiles).toStrictEqual([]);
  });

  it("getLocation should resolve", async () => {
    const res = (await wx.getLocation({})) as { latitude: number; longitude: number };

    expect(res.latitude).toBe(0);
    expect(res.longitude).toBe(0);
  });

  it("chooseLocation should resolve", async () => {
    const res = (await wx.chooseLocation({})) as { name: string; address: string };

    expect(res.name).toBe("");
    expect(res.address).toBe("");
  });

  it("openLocation should resolve", async () => {
    await expect(wx.openLocation({ latitude: 0, longitude: 0 })).resolves.toStrictEqual({
      errMsg: "openLocation:ok",
    });
  });

  it("login should resolve with code", async () => {
    const res = (await wx.login({})) as { code: string };

    expect(res.code).toBe("mock-login-code");
  });

  it("checkSession should resolve", async () => {
    await expect(wx.checkSession({})).resolves.toStrictEqual({ errMsg: "checkSession:ok" });
  });

  it("getUserProfile should resolve", async () => {
    const res = (await wx.getUserProfile({})) as { userInfo: unknown; rawData: string };

    expect(res.userInfo).toStrictEqual({});
    expect(res.rawData).toBe("");
  });

  it("getUserInfo should resolve", async () => {
    const res = (await wx.getUserInfo({})) as { userInfo: unknown; rawData: string };

    expect(res.userInfo).toStrictEqual({});
    expect(res.rawData).toBe("");
  });

  it("requestPayment should resolve", async () => {
    await expect(wx.requestPayment({ timeStamp: "1" })).resolves.toStrictEqual({
      errMsg: "requestPayment:ok",
    });
  });

  it("requestSubscribeMessage should resolve with accept status", async () => {
    const res = (await wx.requestSubscribeMessage({ tmplIds: ["tmpl1", "tmpl2"] })) as Record<
      string,
      string
    >;

    expect(res.tmpl1).toBe("accept");
    expect(res.tmpl2).toBe("accept");
  });

  it("reportAnalytics should not throw", () => {
    expect(() => wx.reportAnalytics("event", {})).not.toThrow();
  });
});

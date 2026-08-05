import { describe, expect, it, vi } from "vitest";

import { emitEvent, wx } from "../src/index.js";

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

  it("getFileInfo should resolve", async () => {
    const res = (await wx.getFileInfo({ filePath: "mock://temp/1" })) as {
      size: number;
      digest: string;
    };

    expect(res.size).toBe(0);
    expect(res.digest).toBe("");
  });

  it("getWeRunData should resolve", async () => {
    const res = (await wx.getWeRunData({})) as { encryptedData: string; iv: string };

    expect(res.encryptedData).toBe("");
    expect(res.iv).toBe("");
  });

  it("getShareInfo should resolve", async () => {
    const res = (await wx.getShareInfo({ shareTicket: "ticket" })) as {
      encryptedData: string;
      iv: string;
    };

    expect(res.encryptedData).toBe("");
    expect(res.iv).toBe("");
  });

  it("accelerometer APIs should resolve", async () => {
    await expect(wx.startAccelerometer({})).resolves.toStrictEqual({
      errMsg: "startAccelerometer:ok",
    });
    await expect(wx.stopAccelerometer({})).resolves.toStrictEqual({
      errMsg: "stopAccelerometer:ok",
    });
  });

  it("onAccelerometerChange should register listener", () => {
    const listener = vi.fn<(result: { x: number; y: number; z: number }) => void>();

    wx.onAccelerometerChange(listener);
    emitEvent("accelerometerChange", { x: 0, y: 0, z: 1 });
    expect(listener).toHaveBeenCalledWith({ x: 0, y: 0, z: 1 });
  });

  it("compass APIs should resolve", async () => {
    await expect(wx.startCompass({})).resolves.toStrictEqual({ errMsg: "startCompass:ok" });
    await expect(wx.stopCompass({})).resolves.toStrictEqual({ errMsg: "stopCompass:ok" });
  });

  it("onCompassChange should register listener", () => {
    const listener = vi.fn<(result: { direction: number }) => void>();

    wx.onCompassChange(listener);
    emitEvent("compassChange", { direction: 90 });
    expect(listener).toHaveBeenCalledWith({ direction: 90 });
  });

  it("device motion APIs should resolve", async () => {
    await expect(wx.startDeviceMotionListening({})).resolves.toStrictEqual({
      errMsg: "startDeviceMotionListening:ok",
    });
    await expect(wx.stopDeviceMotionListening({})).resolves.toStrictEqual({
      errMsg: "stopDeviceMotionListening:ok",
    });
  });

  it("onDeviceMotionChange should register listener", () => {
    const listener = vi.fn<(result: { alpha: number; beta: number; gamma: number }) => void>();

    wx.onDeviceMotionChange(listener);
    emitEvent("deviceMotionChange", { alpha: 0, beta: 0, gamma: 0 });
    expect(listener).toHaveBeenCalledWith({ alpha: 0, beta: 0, gamma: 0 });
  });

  it("onNetworkStatusChange should register listener", () => {
    const listener = vi.fn<(result: { isConnected: boolean; networkType: string }) => void>();

    wx.onNetworkStatusChange(listener);
    emitEvent("networkStatusChange", { isConnected: true, networkType: "wifi" });
    expect(listener).toHaveBeenCalledWith({ isConnected: true, networkType: "wifi" });
  });

  it("media managers should return noop managers", () => {
    const innerAudio = wx.createInnerAudioContext();

    expect(() => {
      innerAudio.play();
      innerAudio.pause();
      innerAudio.stop();
      innerAudio.destroy();
    }).not.toThrow();

    const video = wx.createVideoContext("video");

    expect(() => {
      video.play();
      video.requestFullScreen();
      video.exitFullScreen();
    }).not.toThrow();

    const map = wx.createMapContext("map");

    expect(() => {
      map.moveToLocation();
      map.includePoints({ points: [] });
    }).not.toThrow();

    const recorder = wx.getRecorderManager();

    expect(() => {
      recorder.start();
      recorder.stop();
      recorder.pause();
      recorder.resume();
    }).not.toThrow();

    const bgm = wx.getBackgroundAudioManager();

    expect(() => {
      bgm.play();
      bgm.seek(10);
      bgm.stop();
    }).not.toThrow();
  });

  it("createCanvasContext should return drawable context", () => {
    const ctx = wx.createCanvasContext("canvas");

    expect(() => {
      ctx.setFillStyle("#fff");
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillText("hi", 0, 0);
      ctx.draw();
    }).not.toThrow();
    expect(ctx.measureText("hi")).toStrictEqual({ width: 0 });
  });

  it("canvas APIs should resolve", async () => {
    const res = (await wx.canvasToTempFilePath({ canvasId: "canvas" })) as {
      tempFilePath: string;
    };

    expect(res.tempFilePath).toBe("");

    await expect(
      wx.canvasGetImageData({ canvasId: "canvas", x: 0, y: 0, width: 1, height: 1 }),
    ).resolves.toMatchObject({ width: 0, height: 0 });

    await expect(
      wx.canvasPutImageData({ canvasId: "canvas", x: 0, y: 0, width: 1, height: 1 }),
    ).resolves.toStrictEqual({ errMsg: "canvasPutImageData:ok" });
  });
});

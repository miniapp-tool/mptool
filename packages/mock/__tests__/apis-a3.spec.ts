// oxlint-disable typescript/no-unsafe-call -- manager APIs are loosely typed on purpose
// oxlint-disable vitest/max-expects -- grouped API smoke assertions
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockWx, wx } from "../src/index.js";

const wxAny = wx as unknown as Record<string, (...args: any[]) => any>;

describe("a3 manager and remaining general api mock", () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("managers", () => {
    it("should create a chainable Animation", () => {
      const animation = wxAny.createAnimation({ duration: 100 });

      expect(animation.translate(10, 20).opacity(0).step()).toBe(animation);
      expect(animation.export()).toMatchObject({ actions: [] });
    });

    it("should create a CameraContext with callbacks", async () => {
      const camera = wxAny.createCameraContext();

      await expect(camera.takePhoto({})).resolves.toMatchObject({
        tempImagePath: "mock://tmp/camera.jpg",
      });
      await expect(camera.stopRecord({})).resolves.toMatchObject({
        tempVideoPath: "mock://tmp/camera.mp4",
      });

      const frame = vi.fn<() => void>();

      camera.onCameraFrame(frame);
      mockWx.emit("cameraFrame", { data: "x" });
      expect(frame).toHaveBeenCalledWith({ data: "x" });
    });

    it("should create a MediaRecorder with event registration", () => {
      const recorder = wxAny.createMediaRecorder();
      const started = vi.fn<() => void>();

      recorder.onStart(started);
      mockWx.emit("mediaRecorderStart");
      expect(started).toHaveBeenCalledTimes(1);

      expect(() => {
        recorder.start();
        recorder.pause();
        recorder.resume();
        recorder.stop();
      }).not.toThrow();
    });

    it("should create audio / video contexts", async () => {
      const webAudio = wxAny.createWebAudioContext();

      expect(webAudio.createOscillator().frequency.value).toBe(440);
      await expect(webAudio.decodeAudioData(new ArrayBuffer(2))).resolves.toBeInstanceOf(
        ArrayBuffer,
      );

      const audio = wxAny.createAudioContext();

      expect(() => {
        audio.play();
        audio.pause();
        audio.seek(1);
        audio.setSrc("a.mp3");
      }).not.toThrow();

      const decoder = wxAny.createVideoDecoder();

      expect(() => {
        decoder.start({});
        decoder.seek(1);
        decoder.stop();
      }).not.toThrow();
    });

    it("should create a Worker with message events", () => {
      const worker = wxAny.createWorker("worker.js");
      const listener = vi.fn<() => void>();

      worker.onMessage(listener);
      mockWx.emit("workerMessage", { message: "hi" });
      expect(listener).toHaveBeenCalledWith({ message: "hi" });

      expect(() => {
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- worker.postMessage is not the browser API
        worker.postMessage({ a: 1 });
        worker.terminate();
      }).not.toThrow();
    });

    it("should create an OffscreenCanvas", () => {
      const canvas = wxAny.createOffscreenCanvas(10, 20);

      expect(canvas.width).toBe(10);
      expect(canvas.height).toBe(20);
      expect(canvas.getContext("2d")).toBeTypeOf("object");
    });

    it("should create TCP / UDP sockets", () => {
      const socket = wxAny.createTCPSocket();
      const listener = vi.fn<() => void>();

      socket.onMessage(listener);
      mockWx.emit("socketMessage", { message: new ArrayBuffer(0) });
      expect(listener).toHaveBeenCalledTimes(1);

      expect(() => {
        socket.connect({ address: "127.0.0.1", port: 80 });
        socket.write("x");
        socket.close();
      }).not.toThrow();
      expect(wxAny.createUDPSocket()).toBeTypeOf("object");
    });

    it("should create / revoke buffer URLs", () => {
      const url = wxAny.createBufferURL(new ArrayBuffer(2));

      expect(url).toMatch(/^mock:\/\/buffer\/\d+$/u);
      expect(() => {
        wxAny.revokeBufferURL(url);
      }).not.toThrow();
    });

    it("should provide a working CacheManager", () => {
      const cache = wxAny.createCacheManager();

      cache.set("key", "value");
      expect(cache.get("key")).toBe("value");
      expect(cache.delete("key")).toBe(true);
      expect(cache.get("key")).toBeUndefined();
      cache.set("a", 1);
      cache.clear();
      expect(cache.get("a")).toBeUndefined();
    });

    it("should dispatch PluginUpdateManager events", () => {
      const manager = wxAny.getPluginUpdateManager();
      const check = vi.fn<() => void>();
      const ready = vi.fn<() => void>();

      manager.onCheckForUpdate(check);
      manager.onUpdateReady(ready);
      mockWx.emit("pluginUpdateCheck", { hasUpdate: true });
      mockWx.emit("pluginUpdateReady");

      expect(check).toHaveBeenCalledWith({ hasUpdate: true });
      expect(ready).toHaveBeenCalledTimes(1);
      expect(() => {
        manager.applyUpdate();
      }).not.toThrow();
    });

    it("should provide UserCryptoManager callbacks", async () => {
      const manager = wxAny.getUserCryptoManager();

      await expect(manager.getRandomValues({})).resolves.toMatchObject({
        errMsg: "getRandomValues:ok",
      });
      await expect(manager.getLatestUserKey({})).resolves.toMatchObject({
        errMsg: "getLatestUserKey:ok",
        version: 1,
      });
    });

    it("should resolve font / preload / embedded mini-program APIs", async () => {
      await expect(wxAny.loadFontFace({})).resolves.toMatchObject({ errMsg: "loadFontFace:ok" });
      await expect(wxAny.loadBuiltInFontFace({})).resolves.toMatchObject({
        errMsg: "loadBuiltInFontFace:ok",
      });
      await expect(wxAny.preDownloadSubpackage({})).resolves.toMatchObject({
        errMsg: "preDownloadSubpackage:ok",
      });
      await expect(wxAny.preloadAssets({})).resolves.toMatchObject({ errMsg: "preloadAssets:ok" });
      await expect(wxAny.preloadWebview({})).resolves.toMatchObject({
        errMsg: "preloadWebview:ok",
      });
      await expect(wxAny.preloadSkylineView({})).resolves.toMatchObject({
        errMsg: "preloadSkylineView:ok",
      });
      await expect(wxAny.openEmbeddedMiniProgram({ appId: "x" })).resolves.toMatchObject({
        errMsg: "openEmbeddedMiniProgram:ok",
      });
    });
  });

  describe("remaining general APIs", () => {
    it("should resolve selection / media / location APIs", async () => {
      await expect(wxAny.chooseLicensePlate({})).resolves.toMatchObject({
        licensePlate: "粤B12345",
      });
      await expect(wxAny.getVideoInfo({ src: "a.mp4" })).resolves.toMatchObject({ type: "mp4" });
      await expect(wxAny.getFuzzyLocation({})).resolves.toMatchObject({ latitude: 22.54 });
      await expect(wxAny.getSelectedTextRange({})).resolves.toMatchObject({ start: 0, end: 0 });
    });

    it("should resolve background fetch and network helpers", async () => {
      await expect(wxAny.getBackgroundFetchData({})).resolves.toMatchObject({ scene: 0 });
      await expect(wxAny.getBackgroundFetchToken({})).resolves.toMatchObject({ token: "" });
      await expect(wxAny.setBackgroundFetchToken({ token: "x" })).resolves.toMatchObject({
        errMsg: "setBackgroundFetchToken:ok",
      });
      await expect(wxAny.getLocalIPAddress({})).resolves.toMatchObject({
        localip: "127.0.0.1",
      });
    });

    it("should resolve misc state / auth APIs", async () => {
      await expect(wxAny.getScreenRecordingState({})).resolves.toMatchObject({ state: "off" });
      await expect(wxAny.getShowSplashAdStatus({})).resolves.toMatchObject({ status: "hidden" });
      await expect(wxAny.getGroupEnterInfo({})).resolves.toMatchObject({ cloudID: "" });
      await expect(wxAny.openAppAuthorizeSetting({})).resolves.toMatchObject({
        errMsg: "openAppAuthorizeSetting:ok",
      });
      await expect(wxAny.authPrivateMessage({})).resolves.toMatchObject({
        errMsg: "authPrivateMessage:ok",
      });
      await expect(wxAny.authorizeForMiniProgram({})).resolves.toMatchObject({
        errMsg: "authorizeForMiniProgram:ok",
      });
      await expect(wxAny.pluginLogin({})).resolves.toMatchObject({ code: "mock-plugin-code" });
      await expect(wxAny.sendSms({})).resolves.toMatchObject({ errMsg: "sendSms:ok" });
      await expect(wxAny.setWindowSize({ width: 100 })).resolves.toMatchObject({
        errMsg: "setWindowSize:ok",
      });
      expect(wxAny.checkIsPictureInPictureActive()).toBe(false);
      expect(wxAny.checkIsOpenAccessibility()).toBe(false);
      expect(wxAny.checkDeviceSupportHevc()).toBe(false);
    });

    it("should batch read storage synchronously", () => {
      wx.setStorageSync("a", 1);
      wx.setStorageSync("b", "two");

      expect(wx.batchGetStorageSync(["a", "b", "c"])).toStrictEqual([1, "two", ""]);
    });

    it("should support failure injection for managers", async () => {
      mockWx.failNext("chooseLicensePlate", { type: "network" });

      await expect(wxAny.chooseLicensePlate({})).rejects.toThrow(/chooseLicensePlate:fail/u);
    });
  });
});

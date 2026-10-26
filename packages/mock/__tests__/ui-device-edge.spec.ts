// oxlint-disable typescript/no-unsafe-call, typescript/no-unsafe-return, vitest/max-expects -- manager APIs are loosely typed and grouped smoke assertions
import { afterEach, describe, expect, it, vi } from "vitest";

import { managersApi } from "../src/apis/managers.js";
import { miscApi } from "../src/apis/misc.js";
import { deviceApi } from "../src/device.js";
import { mockWx, wx } from "../src/index.js";
import { emitEvent, uiApi } from "../src/ui.js";

const wxAny = wx as unknown as Record<string, (...args: any[]) => any>;

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("ui edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset ui decisions and listeners after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should call complete without a success callback", async () => {
    const success = vi.fn<(result: unknown) => void>();
    const complete = vi.fn<(result: unknown) => void>();

    wx.showToast({ complete, title: "hi" });
    await tick();

    expect(success).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledWith({ errMsg: "ok" });
  });

  it("should reject callFail without an option object", async () => {
    await expect(wxAny.authorize()).rejects.toMatchObject({
      errMsg: "authorize:fail scope is required",
    });
  });

  it("should deliver authorize failures through callbacks", async () => {
    mockWx.authorize("deny");

    const fail = vi.fn<(result: { errMsg: string }) => void>();
    const complete = vi.fn<(result: { errMsg: string }) => void>();

    wx.authorize({ complete, fail, scope: "scope.camera" });
    await tick();

    expect(fail).toHaveBeenCalledWith({ errMsg: "authorize:fail auth deny" });
    expect(complete).toHaveBeenCalledWith({ errMsg: "authorize:fail auth deny" });
  });

  it("should succeed for an already authorized scope", async () => {
    mockWx.auth({ "scope.camera": true });

    await expect(wx.authorize({ scope: "scope.camera" })).resolves.toStrictEqual({
      errMsg: "authorize:ok",
    });
  });

  it("should fail when authorize has no scope", async () => {
    await expect(wx.authorize({})).rejects.toMatchObject({
      errMsg: "authorize:fail scope is required",
    });
  });

  it("should reject non-string clipboard data", async () => {
    await expect(wx.setClipboardData({ data: 1 })).rejects.toMatchObject({
      errMsg: "setClipboardData:fail data is required",
    });
  });

  it("should fall back to defaults for option-less calls", async () => {
    await expect(wxAny.showToast()).resolves.toStrictEqual({ errMsg: "showToast:ok" });
    await expect(wxAny.showLoading()).resolves.toStrictEqual({ errMsg: "showLoading:ok" });
    await expect(wxAny.showModal()).resolves.toStrictEqual({
      cancel: false,
      confirm: true,
      errMsg: "showModal:ok",
    });
    await expect(wxAny.showActionSheet()).resolves.toStrictEqual({
      errMsg: "showActionSheet:ok",
      tapIndex: 0,
    });
    await expect(wxAny.getWifiList()).resolves.toStrictEqual({ errMsg: "getWifiList:ok" });
    await expect(wxAny.setClipboardData()).rejects.toMatchObject({
      errMsg: "setClipboardData:fail data is required",
    });
    expect(wxAny.getExptInfoSync()).toStrictEqual({});
  });

  it("should keep the uiApi event helpers working when called directly", () => {
    const keyboard = vi.fn<(result: unknown) => void>();
    const copy = vi.fn<(result: unknown) => void>();
    const appShow = vi.fn<(result: unknown) => void>();
    const appHide = vi.fn<() => void>();
    const theme = vi.fn<(result: unknown) => void>();
    const resize = vi.fn<(result: unknown) => void>();
    const privacy = vi.fn<(result: unknown) => void>();
    const capture = vi.fn<() => void>();

    uiApi.onKeyboardHeightChange(keyboard);
    uiApi.onCopyUrl(copy);
    uiApi.onAppShow(appShow);
    uiApi.onAppHide(appHide);
    uiApi.onThemeChange(theme);
    uiApi.onWindowResize(resize);
    uiApi.onNeedPrivacyAuthorization(privacy);
    uiApi.onUserCaptureScreen(capture);

    emitEvent("keyboardHeightChange", { height: 10 });
    emitEvent("copyUrl", { query: "q" });
    emitEvent("appShow", { path: "p" });
    emitEvent("appHide");
    emitEvent("themeChange", { theme: "dark" });
    emitEvent("windowResize", { size: { windowHeight: 1, windowWidth: 1 } });
    emitEvent("needPrivacyAuthorization", { needAuthorization: false });
    emitEvent("userCaptureScreen");

    expect(keyboard).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledTimes(1);
    expect(appShow).toHaveBeenCalledTimes(1);
    expect(appHide).toHaveBeenCalledTimes(1);
    expect(theme).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledTimes(1);
    expect(privacy).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledTimes(1);

    uiApi.offKeyboardHeightChange(keyboard);
    uiApi.offCopyUrl(copy);
    uiApi.offAppShow(appShow);
    uiApi.offAppHide(appHide);
    uiApi.offThemeChange(theme);
    uiApi.offWindowResize(resize);
    uiApi.offNeedPrivacyAuthorization(privacy);
    uiApi.offUserCaptureScreen(capture);

    emitEvent("keyboardHeightChange", { height: 20 });
    emitEvent("copyUrl", { query: "q" });
    emitEvent("appShow", { path: "p" });
    emitEvent("appHide");
    emitEvent("themeChange", { theme: "light" });
    emitEvent("windowResize", { size: { windowHeight: 2, windowWidth: 2 } });
    emitEvent("needPrivacyAuthorization", { needAuthorization: true });
    emitEvent("userCaptureScreen");

    expect(keyboard).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledTimes(1);
    expect(appShow).toHaveBeenCalledTimes(1);
    expect(appHide).toHaveBeenCalledTimes(1);
    expect(theme).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledTimes(1);
    expect(privacy).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledTimes(1);
  });
});

describe("device edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset state after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should keep the deviceApi event helpers working when called directly", () => {
    const accelerometer = vi.fn<(result: unknown) => void>();
    const compass = vi.fn<(result: unknown) => void>();
    const motion = vi.fn<(result: unknown) => void>();
    const network = vi.fn<(result: unknown) => void>();

    deviceApi.onAccelerometerChange(accelerometer);
    deviceApi.onCompassChange(compass);
    deviceApi.onDeviceMotionChange(motion);
    deviceApi.onNetworkStatusChange(network);

    emitEvent("accelerometerChange", { x: 1, y: 2, z: 3 });
    emitEvent("compassChange", { direction: 90 });
    emitEvent("deviceMotionChange", { alpha: 1, beta: 2, gamma: 3 });
    emitEvent("networkStatusChange", { isConnected: true, networkType: "wifi" });

    expect(accelerometer).toHaveBeenCalledTimes(1);
    expect(compass).toHaveBeenCalledTimes(1);
    expect(motion).toHaveBeenCalledTimes(1);
    expect(network).toHaveBeenCalledTimes(1);

    deviceApi.offAccelerometerChange(accelerometer);
    deviceApi.offCompassChange(compass);
    deviceApi.offDeviceMotionChange(motion);
    deviceApi.offNetworkStatusChange(network);

    emitEvent("accelerometerChange", { x: 1, y: 2, z: 3 });
    emitEvent("compassChange", { direction: 90 });
    emitEvent("deviceMotionChange", { alpha: 1, beta: 2, gamma: 3 });
    emitEvent("networkStatusChange", { isConnected: true, networkType: "wifi" });

    expect(accelerometer).toHaveBeenCalledTimes(1);
    expect(compass).toHaveBeenCalledTimes(1);
    expect(motion).toHaveBeenCalledTimes(1);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("should create canvas gradients", () => {
    const context = wx.createCanvasContext("canvas");
    const linear = (context.createLinearGradient as () => Record<string, () => void>)();
    const circular = (context.createCircularGradient as () => Record<string, () => void>)();

    expect(linear.addColorStop).toBeTypeOf("function");
    expect(circular.addColorStop).toBeTypeOf("function");
    expect(() => {
      linear.addColorStop();
      circular.addColorStop();
    }).not.toThrow();
  });

  it("should accept requestSubscribeMessage without template ids", async () => {
    await expect(wx.requestSubscribeMessage({})).resolves.toStrictEqual({
      errMsg: "requestSubscribeMessage:ok",
    });
  });
});

describe("system platform edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset presets after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should derive the system string for every platform", () => {
    const cases = [
      ["ohos", "OpenHarmony 4.0"],
      ["windows", "Windows 11"],
      ["mac", "macOS 14.0"],
      ["android", "Android 13"],
      ["ios", "iOS 16.0"],
      ["devtools", "macOS 14.0"],
    ] as const;

    for (const [platform, system] of cases) {
      mockWx.system({ platform });
      expect(wx.getSystemInfoSync()).toMatchObject({ platform, system });
    }
  });

  it("should report an explicitly authorized scope", () => {
    mockWx.auth({ "scope.camera": true });

    expect(wx.getAppAuthorizeSetting()).toMatchObject({ cameraAuthorized: "authorized" });
  });
});

describe("api helper edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset presets after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should expose performance observers and entry lookups", () => {
    const performance = wx.getPerformance();
    const observer = performance.createObserver(() => {});

    expect(() => {
      observer.observe();
      observer.disconnect();
    }).not.toThrow();

    expect(performance.getEntries()).toStrictEqual([]);
    expect(performance.getEntriesByName("name")).toStrictEqual([]);
    expect(performance.getEntriesByType("mark")).toStrictEqual([]);
    expect(performance.now()).toBeTypeOf("number");
  });

  it("should run and cancel idle callbacks", async () => {
    const callback = vi.fn<(result: { errMsg: string }) => void>();
    const id = wx.requestIdleCallback(callback);

    await tick();

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ errMsg: "requestIdleCallback:ok" }),
    );

    expect(() => wx.cancelIdleCallback(id)).not.toThrow();
    expect(() => wx.cancelIdleCallback(999)).not.toThrow();
  });

  it("should ignore onXxx registration without a listener", () => {
    expect(() => (wx.onThemeChange as () => void)()).not.toThrow();
  });

  it("should expose every camera / media / audio manager method", async () => {
    const camera = managersApi.createCameraContext() as Record<string, (...args: any[]) => any>;

    expect(() => camera.onCameraFrame()).not.toThrow();

    const frame = vi.fn<(value: unknown) => void>();

    camera.onCameraFrame(frame);
    emitEvent("cameraFrame", { data: "frame" });
    expect(frame).toHaveBeenCalledTimes(1);

    await expect(camera.startRecord({})).resolves.toStrictEqual({ errMsg: "startRecord:ok" });
    await expect(camera.stopRecord({})).resolves.toMatchObject({ errMsg: "stopRecord:ok" });
    await expect(camera.takePhoto({})).resolves.toMatchObject({ errMsg: "takePhoto:ok" });

    const recorder = managersApi.createMediaRecorder() as Record<string, (...args: any[]) => any>;

    expect(() => recorder.onError()).not.toThrow();

    const recorderEvents = [
      ["onError", "mediaRecorderError"],
      ["onPause", "mediaRecorderPause"],
      ["onProgress", "mediaRecorderProgress"],
      ["onResume", "mediaRecorderResume"],
      ["onStart", "mediaRecorderStart"],
      ["onStop", "mediaRecorderStop"],
      ["onTimeUpdate", "mediaRecorderTimeUpdate"],
    ] as const;

    for (const [method, event] of recorderEvents) {
      const listener = vi.fn<(value: unknown) => void>();

      recorder[method](listener);
      emitEvent(event, { value: 1 });
      expect(listener).toHaveBeenCalledTimes(1);
    }

    expect(() => {
      recorder.pause();
      recorder.resume();
      recorder.start();
      recorder.stop();
    }).not.toThrow();
  });

  it("should create WebAudio / Worker / Socket / OffscreenCanvas managers", async () => {
    const audio = managersApi.createWebAudioContext() as Record<string, any>;
    const source = audio.createBufferSource();
    const gain = audio.createGain();

    expect(source.connect).toBeTypeOf("function");
    expect(gain.gain.value).toBe(1);
    expect(audio.createOscillator().frequency.value).toBe(440);
    await expect(audio.decodeAudioData(new ArrayBuffer(1))).resolves.toBeInstanceOf(ArrayBuffer);

    const worker = managersApi.createWorker() as Record<string, any>;
    const killed = vi.fn<() => void>();

    worker.onProcessKilled(killed);
    emitEvent("workerProcessKilled");
    expect(killed).toHaveBeenCalledTimes(1);

    const canvas = managersApi.createOffscreenCanvas() as Record<string, any>;
    const context = canvas.getContext();

    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(context.getImageData()).toStrictEqual({
      data: new Uint8ClampedArray(0),
      height: 0,
      width: 0,
    });

    for (const factory of ["createTCPSocket", "createUDPSocket"] as const) {
      const socket = managersApi[factory]() as Record<string, any>;
      const events = [
        ["onClose", "socketClose"],
        ["onConnect", "socketConnect"],
        ["onError", "socketError"],
        ["onMessage", "socketMessage"],
      ] as const;

      for (const [method, event] of events) {
        const listener = vi.fn<(value: unknown) => void>();

        socket[method](listener);
        emitEvent(event, { value: 1 });
        expect(listener).toHaveBeenCalledTimes(1);
      }

      expect(() => {
        socket.close();
        socket.connect();
        socket.write();
      }).not.toThrow();
    }

    const pluginUpdate = managersApi.getPluginUpdateManager() as Record<string, any>;
    const failed = vi.fn<(value: unknown) => void>();

    pluginUpdate.onUpdateFailed(failed);
    emitEvent("pluginUpdateFailed", { errMsg: "boom" });
    expect(failed).toHaveBeenCalledTimes(1);
  });

  it("should resolve the remaining misc APIs", async () => {
    await expect(miscApi.getInferenceEnvInfo({})).resolves.toStrictEqual({
      errMsg: "getInferenceEnvInfo:ok",
      version: "",
    });
    await expect(miscApi.addVideoToFavorites({})).resolves.toStrictEqual({
      errMsg: "addVideoToFavorites:ok",
    });
  });
});

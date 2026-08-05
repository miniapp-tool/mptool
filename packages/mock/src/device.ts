import { callCallback, offEvent, onEvent } from "./ui.js";

/** 生成管理器对象 mock：指定名称的方法均为 noop，可传入自定义实现 */
const createManager = (
  names: string[],
  custom: Record<string, (...args: unknown[]) => unknown> = {},
): Record<string, (...args: unknown[]) => unknown> => {
  const manager: Record<string, (...args: unknown[]) => unknown> = {};

  for (const name of names) manager[name] = custom[name] ?? ((): void => void 0);

  return manager;
};

/** 设备、媒体、位置、用户、支付等相关 wx API mock */
export const deviceApi = {
  getSystemInfo(option: unknown): unknown {
    return callCallback(option, {
      windowWidth: 375,
      windowHeight: 667,
      screenWidth: 375,
      screenHeight: 667,
      pixelRatio: 2,
      statusBarHeight: 20,
      system: "iOS 16.0",
      platform: "ios",
      SDKVersion: "3.8.0",
      errMsg: "getSystemInfo:ok",
    });
  },

  getBatteryInfo(option: unknown): unknown {
    return callCallback(option, { level: 100, isCharging: true, errMsg: "getBatteryInfo:ok" });
  },

  getBatteryInfoSync(): Record<string, unknown> {
    return { level: 100, isCharging: true };
  },

  getScreenBrightness(option: unknown): unknown {
    return callCallback(option, { value: 1, errMsg: "getScreenBrightness:ok" });
  },

  setScreenBrightness(option: unknown): unknown {
    return callCallback(option, { errMsg: "setScreenBrightness:ok" });
  },

  setKeepScreenOn(option: unknown): unknown {
    return callCallback(option, { errMsg: "setKeepScreenOn:ok" });
  },

  makePhoneCall(option: unknown): unknown {
    return callCallback(option, { errMsg: "makePhoneCall:ok" });
  },

  scanCode(option: unknown): unknown {
    return callCallback(option, {
      result: "",
      scanType: "",
      charSet: "",
      path: "",
      rawData: "",
      errMsg: "scanCode:ok",
    });
  },

  chooseImage(option: unknown): unknown {
    return callCallback(option, {
      tempFilePaths: [],
      tempFiles: [],
      errMsg: "chooseImage:ok",
    });
  },

  chooseMedia(option: unknown): unknown {
    return callCallback(option, {
      tempFiles: [],
      type: "image",
      errMsg: "chooseMedia:ok",
    });
  },

  previewImage(option: unknown): unknown {
    return callCallback(option, { errMsg: "previewImage:ok" });
  },

  getImageInfo(option: unknown): unknown {
    return callCallback(option, {
      width: 0,
      height: 0,
      path: "",
      orientation: "up",
      type: "unknown",
      errMsg: "getImageInfo:ok",
    });
  },

  compressImage(option: unknown): unknown {
    return callCallback(option, { tempFilePath: "", errMsg: "compressImage:ok" });
  },

  chooseVideo(option: unknown): unknown {
    return callCallback(option, {
      tempFilePath: "",
      duration: 0,
      size: 0,
      height: 0,
      width: 0,
      errMsg: "chooseVideo:ok",
    });
  },

  saveVideoToPhotosAlbum(option: unknown): unknown {
    return callCallback(option, { errMsg: "saveVideoToPhotosAlbum:ok" });
  },

  chooseMessageFile(option: unknown): unknown {
    return callCallback(option, { tempFiles: [], errMsg: "chooseMessageFile:ok" });
  },

  getLocation(option: unknown): unknown {
    return callCallback(option, {
      latitude: 0,
      longitude: 0,
      speed: 0,
      accuracy: 0,
      altitude: 0,
      verticalAccuracy: 0,
      horizontalAccuracy: 0,
      errMsg: "getLocation:ok",
    });
  },

  chooseLocation(option: unknown): unknown {
    return callCallback(option, {
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
      errMsg: "chooseLocation:ok",
    });
  },

  openLocation(option: unknown): unknown {
    return callCallback(option, { errMsg: "openLocation:ok" });
  },

  login(option: unknown): unknown {
    return callCallback(option, { code: "mock-login-code", errMsg: "login:ok" });
  },

  checkSession(option: unknown): unknown {
    return callCallback(option, { errMsg: "checkSession:ok" });
  },

  getUserProfile(option: unknown): unknown {
    return callCallback(option, {
      userInfo: {},
      rawData: "",
      signature: "",
      encryptedData: "",
      iv: "",
      cloudID: "",
      errMsg: "getUserProfile:ok",
    });
  },

  getUserInfo(option: unknown): unknown {
    return callCallback(option, {
      userInfo: {},
      rawData: "",
      signature: "",
      encryptedData: "",
      iv: "",
      cloudID: "",
      errMsg: "getUserInfo:ok",
    });
  },

  requestPayment(option: unknown): unknown {
    return callCallback(option, { errMsg: "requestPayment:ok" });
  },

  requestSubscribeMessage(option: unknown): unknown {
    const tmplIds = (option as { tmplIds?: string[] } | undefined)?.tmplIds ?? [];

    return callCallback(option, {
      ...Object.fromEntries(tmplIds.map((id) => [id, "accept"])),
      errMsg: "requestSubscribeMessage:ok",
    });
  },

  reportAnalytics(_eventName: string, _data?: Record<string, unknown>): void {
    // noop
  },

  onAccelerometerChange(listener: (result: { x: number; y: number; z: number }) => void): void {
    onEvent("accelerometerChange", listener);
  },

  offAccelerometerChange(listener?: (result: { x: number; y: number; z: number }) => void): void {
    offEvent("accelerometerChange", listener);
  },

  startAccelerometer(option: unknown): unknown {
    return callCallback(option, { errMsg: "startAccelerometer:ok" });
  },

  stopAccelerometer(option: unknown): unknown {
    return callCallback(option, { errMsg: "stopAccelerometer:ok" });
  },

  onCompassChange(listener: (result: { direction: number }) => void): void {
    onEvent("compassChange", listener);
  },

  offCompassChange(listener?: (result: { direction: number }) => void): void {
    offEvent("compassChange", listener);
  },

  startCompass(option: unknown): unknown {
    return callCallback(option, { errMsg: "startCompass:ok" });
  },

  stopCompass(option: unknown): unknown {
    return callCallback(option, { errMsg: "stopCompass:ok" });
  },

  onDeviceMotionChange(
    listener: (result: { alpha: number; beta: number; gamma: number }) => void,
  ): void {
    onEvent("deviceMotionChange", listener);
  },

  offDeviceMotionChange(
    listener?: (result: { alpha: number; beta: number; gamma: number }) => void,
  ): void {
    offEvent("deviceMotionChange", listener);
  },

  startDeviceMotionListening(option: unknown): unknown {
    return callCallback(option, { errMsg: "startDeviceMotionListening:ok" });
  },

  stopDeviceMotionListening(option: unknown): unknown {
    return callCallback(option, { errMsg: "stopDeviceMotionListening:ok" });
  },

  onNetworkStatusChange(
    listener: (result: { isConnected: boolean; networkType: string }) => void,
  ): void {
    onEvent("networkStatusChange", listener);
  },

  offNetworkStatusChange(
    listener?: (result: { isConnected: boolean; networkType: string }) => void,
  ): void {
    offEvent("networkStatusChange", listener);
  },

  getFileInfo(option: unknown): unknown {
    return callCallback(option, { size: 0, digest: "", errMsg: "getFileInfo:ok" });
  },

  getWeRunData(option: unknown): unknown {
    return callCallback(option, {
      encryptedData: "",
      iv: "",
      cloudID: "",
      errMsg: "getWeRunData:ok",
    });
  },

  getShareInfo(option: unknown): unknown {
    return callCallback(option, { encryptedData: "", iv: "", errMsg: "getShareInfo:ok" });
  },

  createInnerAudioContext(): Record<string, (...args: unknown[]) => unknown> {
    return createManager([
      "play",
      "pause",
      "stop",
      "seek",
      "destroy",
      "onCanplay",
      "offCanplay",
      "onPlay",
      "offPlay",
      "onPause",
      "offPause",
      "onStop",
      "offStop",
      "onEnded",
      "offEnded",
      "onTimeUpdate",
      "offTimeUpdate",
      "onError",
      "offError",
      "onWaiting",
      "offWaiting",
      "onSeeking",
      "offSeeking",
      "onSeeked",
      "offSeeked",
      "onVolumeChange",
      "offVolumeChange",
    ]);
  },

  createVideoContext(_id?: string): Record<string, (...args: unknown[]) => unknown> {
    return createManager([
      "play",
      "pause",
      "stop",
      "seek",
      "requestFullScreen",
      "exitFullScreen",
      "onPlay",
      "offPlay",
      "onPause",
      "offPause",
      "onEnded",
      "offEnded",
      "onError",
      "offError",
      "onTimeUpdate",
      "offTimeUpdate",
    ]);
  },

  createMapContext(_id?: string): Record<string, (...args: unknown[]) => unknown> {
    return createManager([
      "moveToLocation",
      "translateMarker",
      "includePoints",
      "getCenterLocation",
      "getRegion",
      "getScale",
      "getRotate",
      "getSkew",
    ]);
  },

  createCanvasContext(
    _id?: string,
    _component?: unknown,
  ): Record<string, (...args: unknown[]) => unknown> {
    return createManager(
      [
        "setFillStyle",
        "setStrokeStyle",
        "setLineWidth",
        "setLineCap",
        "setLineJoin",
        "setFontSize",
        "setTextAlign",
        "setTextBaseline",
        "setShadow",
        "setGlobalAlpha",
        "setTransform",
        "transform",
        "scale",
        "rotate",
        "translate",
        "fillRect",
        "strokeRect",
        "clearRect",
        "fillText",
        "strokeText",
        "beginPath",
        "closePath",
        "moveTo",
        "lineTo",
        "arc",
        "rect",
        "fill",
        "stroke",
        "clip",
        "save",
        "restore",
        "drawImage",
        "draw",
        "measureText",
        "createLinearGradient",
        "createCircularGradient",
      ],
      {
        measureText: (): { width: number } => ({ width: 0 }),
        createLinearGradient: (): Record<string, (...args: unknown[]) => void> =>
          createManager(["addColorStop"]),
        createCircularGradient: (): Record<string, (...args: unknown[]) => void> =>
          createManager(["addColorStop"]),
      },
    );
  },

  getRecorderManager(): Record<string, (...args: unknown[]) => unknown> {
    return createManager([
      "start",
      "stop",
      "pause",
      "resume",
      "onStart",
      "onStop",
      "onPause",
      "onResume",
      "onError",
      "onFrameRecorded",
    ]);
  },

  getBackgroundAudioManager(): Record<string, (...args: unknown[]) => unknown> {
    return createManager([
      "play",
      "pause",
      "stop",
      "seek",
      "destroy",
      "onCanplay",
      "onPlay",
      "onPause",
      "onStop",
      "onEnded",
      "onTimeUpdate",
      "onError",
    ]);
  },

  canvasToTempFilePath(option: unknown): unknown {
    return callCallback(option, { tempFilePath: "", errMsg: "canvasToTempFilePath:ok" });
  },

  canvasGetImageData(option: unknown): unknown {
    return callCallback(option, {
      width: 0,
      height: 0,
      data: new Uint8ClampedArray(0),
      errMsg: "canvasGetImageData:ok",
    });
  },

  canvasPutImageData(option: unknown): unknown {
    return callCallback(option, { errMsg: "canvasPutImageData:ok" });
  },
};

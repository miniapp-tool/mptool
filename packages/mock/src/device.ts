import { callCallback } from "./ui.js";

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
};

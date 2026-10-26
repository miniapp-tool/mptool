import { callCallback } from "../ui.js";

const ok = (option: unknown, errMsg: string): unknown => callCallback(option, { errMsg });

/** Remaining general A2 APIs that do not need a real runtime. */
export const miscApi = {
  chooseLicensePlate(option?: unknown): unknown {
    return callCallback(option, {
      count: 1,
      errMsg: "chooseLicensePlate:ok",
      licensePlate: "粤B12345",
    });
  },

  getVideoInfo(option?: unknown): unknown {
    return callCallback(option, {
      bitrate: 0,
      duration: 0,
      errMsg: "getVideoInfo:ok",
      fps: 0,
      height: 0,
      orientation: "up",
      size: 0,
      type: "mp4",
      width: 0,
    });
  },

  getFuzzyLocation(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "getFuzzyLocation:ok",
      latitude: 22.54,
      longitude: 113.93,
    });
  },

  getBackgroundFetchData(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "getBackgroundFetchData:ok",
      fetchedData: "",
      path: "",
      query: {},
      scene: 0,
      time: 0,
    });
  },

  getBackgroundFetchToken(option?: unknown): unknown {
    return callCallback(option, { errMsg: "getBackgroundFetchToken:ok", token: "" });
  },

  setBackgroundFetchToken(option?: unknown): unknown {
    return ok(option, "setBackgroundFetchToken:ok");
  },

  getLocalIPAddress(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "getLocalIPAddress:ok",
      localip: "127.0.0.1",
      netmask: "255.0.0.0",
    });
  },

  getInferenceEnvInfo(option?: unknown): unknown {
    return callCallback(option, { errMsg: "getInferenceEnvInfo:ok", version: "" });
  },

  getSelectedTextRange(option?: unknown): unknown {
    return callCallback(option, { end: 0, errMsg: "getSelectedTextRange:ok", start: 0 });
  },

  getScreenRecordingState(option?: unknown): unknown {
    return callCallback(option, { errMsg: "getScreenRecordingState:ok", state: "off" });
  },

  getShowSplashAdStatus(option?: unknown): unknown {
    return callCallback(option, { errMsg: "getShowSplashAdStatus:ok", status: "hidden" });
  },

  openAppAuthorizeSetting(option?: unknown): unknown {
    return ok(option, "openAppAuthorizeSetting:ok");
  },

  authPrivateMessage(option?: unknown): unknown {
    return ok(option, "authPrivateMessage:ok");
  },

  authorizeForMiniProgram(option?: unknown): unknown {
    return ok(option, "authorizeForMiniProgram:ok");
  },

  pluginLogin(option?: unknown): unknown {
    return callCallback(option, { code: "mock-plugin-code", errMsg: "pluginLogin:ok" });
  },

  sendSms(option?: unknown): unknown {
    return ok(option, "sendSms:ok");
  },

  getGroupEnterInfo(option?: unknown): unknown {
    return callCallback(option, {
      cloudID: "",
      encryptedData: "",
      errMsg: "getGroupEnterInfo:ok",
      iv: "",
    });
  },

  setWindowSize(option?: unknown): unknown {
    return ok(option, "setWindowSize:ok");
  },

  addVideoToFavorites(option?: unknown): unknown {
    return ok(option, "addVideoToFavorites:ok");
  },

  checkIsPictureInPictureActive(): boolean {
    return false;
  },

  checkIsOpenAccessibility(): boolean {
    return false;
  },

  checkDeviceSupportHevc(): boolean {
    return false;
  },
};

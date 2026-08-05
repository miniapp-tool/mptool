// oxlint-disable typescript/no-explicit-any

interface CallbackOption {
  success?: (result: any) => void;
  complete?: (result: any) => void;
}

/** 调用回调或返回 Promise */
const callCallback = (option: any, result: unknown, errMsg = "ok"): void | Promise<unknown> => {
  const realOption = option as CallbackOption | undefined;

  if (!realOption) return Promise.resolve(result);

  if (!realOption.success && !realOption.complete) return Promise.resolve(result);

  setTimeout(() => {
    if (realOption.success) realOption.success(result);
    if (realOption.complete) realOption.complete({ errMsg });
  }, 0);
};

/** UI、权限、设备等相关 wx API mock */
export const uiApi = {
  showToast(option: unknown): unknown {
    return callCallback(option, { errMsg: "showToast:ok" });
  },

  showModal(option: unknown): unknown {
    return callCallback(option, { confirm: true, cancel: false, errMsg: "showModal:ok" });
  },

  showLoading(option: unknown): unknown {
    return callCallback(option, { errMsg: "showLoading:ok" });
  },

  hideLoading(): void {
    // noop
  },

  getSetting(option: unknown): unknown {
    return callCallback(option, { authSetting: {}, errMsg: "getSetting:ok" });
  },

  authorize(option: unknown): unknown {
    return callCallback(option, { errMsg: "authorize:ok" });
  },

  openSetting(option: unknown): unknown {
    return callCallback(option, { authSetting: {}, errMsg: "openSetting:ok" });
  },

  getWindowInfo(): Record<string, unknown> {
    return {
      windowWidth: 375,
      windowHeight: 667,
      screenWidth: 375,
      screenHeight: 667,
      pixelRatio: 2,
      statusBarHeight: 20,
      safeArea: {
        left: 0,
        right: 375,
        top: 20,
        bottom: 667,
        width: 375,
        height: 647,
      },
    };
  },

  getSystemInfoSync(): Record<string, unknown> {
    return {
      windowWidth: 375,
      windowHeight: 667,
      screenWidth: 375,
      screenHeight: 667,
      pixelRatio: 2,
      statusBarHeight: 20,
      system: "iOS 16.0",
      platform: "ios",
      SDKVersion: "3.0.0",
    };
  },

  getNetworkType(option: unknown): unknown {
    return callCallback(option, { networkType: "wifi", errMsg: "getNetworkType:ok" });
  },

  startWifi(option: unknown): unknown {
    return callCallback(option, { errMsg: "startWifi:ok" });
  },

  getConnectedWifi(option: unknown): unknown {
    return callCallback(option, {
      wifi: {
        SSID: "",
        BSSID: "",
        secure: true,
        // iOS 下 signalStrength 取值范围 0~1，1 表示信号最强
        signalStrength: 1,
        frequency: 0,
      },
      errMsg: "getConnectedWifi:ok",
    });
  },

  setClipboardData(option: unknown): unknown {
    return callCallback(option, { errMsg: "setClipboardData:ok" });
  },

  saveImageToPhotosAlbum(option: unknown): unknown {
    return callCallback(option, { errMsg: "saveImageToPhotosAlbum:ok" });
  },

  addPhoneContact(option: unknown): unknown {
    return callCallback(option, { errMsg: "addPhoneContact:ok" });
  },

  openDocument(option: unknown): unknown {
    return callCallback(option, { errMsg: "openDocument:ok" });
  },

  addFileToFavorites(option: unknown): unknown {
    return callCallback(option, { errMsg: "addFileToFavorites:ok" });
  },

  canIUse(): boolean {
    return true;
  },

  reportEvent(): void {
    // noop
  },

  getUpdateManager(): {
    onCheckForUpdate: (callback: (result: { hasUpdate: boolean }) => void) => void;
    onUpdateReady: (callback: () => void) => void;
    onUpdateFailed: (callback: (result: { errMsg: string }) => void) => void;
    applyUpdate: () => void;
  } {
    return {
      onCheckForUpdate: (): void => void 0,
      onUpdateReady: (): void => void 0,
      onUpdateFailed: (): void => void 0,
      applyUpdate: (): void => void 0,
    };
  },
};

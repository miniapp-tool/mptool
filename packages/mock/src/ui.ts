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

type Listener = (...args: any[]) => void;

/** 事件监听器注册表 */
const eventListeners = new Map<string, Set<Listener>>();

/** 注册事件监听器 */
const onEvent = (event: string, listener: Listener): void => {
  const listeners = eventListeners.get(event) ?? new Set<Listener>();

  listeners.add(listener);
  eventListeners.set(event, listeners);
};

/** 移除事件监听器，未传入 listener 时移除该事件的全部监听器 */
const offEvent = (event: string, listener?: Listener): void => {
  if (!listener) {
    eventListeners.delete(event);
    return;
  }

  eventListeners.get(event)?.delete(listener);
};

/** 触发事件，供测试或下游代码手动模拟 */
export const emitEvent = (event: string, ...args: unknown[]): void => {
  eventListeners.get(event)?.forEach((listener) => {
    listener(...args);
  });
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

  getAppBaseInfo(): Record<string, unknown> {
    return {
      PCKernelVersion: "",
      SDKVersion: "3.8.0",
      enableDebug: false,
      fontSizeScaleFactor: 1,
      fontSizeSetting: 16,
      host: { appId: "" },
      language: "zh_CN",
      theme: "light",
      version: "8.0.0",
    };
  },

  getAccountInfoSync(): Record<string, unknown> {
    return {
      miniProgram: {
        appId: "wx1234567890abcdef",
        envVersion: "develop",
        version: "",
      },
      plugin: { appId: "", version: "" },
    };
  },

  getDeviceInfo(): Record<string, unknown> {
    return {
      abi: "",
      benchmarkLevel: 0,
      brand: "devtools",
      cpuType: "",
      deviceAbi: "",
      memorySize: "",
      model: "test",
      platform: "devtools",
      system: "macOS 14.0",
    };
  },

  getMenuButtonBoundingClientRect(): Record<string, number> {
    return {
      bottom: 76,
      height: 32,
      left: 280,
      right: 365,
      top: 44,
      width: 85,
    };
  },

  getSystemSetting(): Record<string, unknown> {
    return {
      bluetoothEnabled: true,
      deviceOrientation: "portrait",
      locationEnabled: true,
      wifiEnabled: true,
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

  getClipboardData(option: unknown): unknown {
    // 真实微信中读取剪贴板通常为空且依赖用户授权，这里直接返回空字符串
    return callCallback(option, { data: "", errMsg: "getClipboardData:ok" });
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

  onAppShow(listener: (result: Record<string, unknown>) => void): void {
    onEvent("appShow", listener);
  },

  offAppShow(listener?: (result: Record<string, unknown>) => void): void {
    offEvent("appShow", listener);
  },

  onAppHide(listener: () => void): void {
    onEvent("appHide", listener);
  },

  offAppHide(listener?: () => void): void {
    offEvent("appHide", listener);
  },

  onThemeChange(listener: (result: { theme: "dark" | "light" }) => void): void {
    onEvent("themeChange", listener);
  },

  offThemeChange(listener?: (result: { theme: "dark" | "light" }) => void): void {
    offEvent("themeChange", listener);
  },

  onWindowResize(
    listener: (result: { size: { windowWidth: number; windowHeight: number } }) => void,
  ): void {
    onEvent("windowResize", listener);
  },

  offWindowResize(
    listener?: (result: { size: { windowWidth: number; windowHeight: number } }) => void,
  ): void {
    offEvent("windowResize", listener);
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

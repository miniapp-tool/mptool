// oxlint-disable promise/prefer-await-to-callbacks
// oxlint-disable typescript/no-explicit-any
// oxlint-disable typescript/no-unnecessary-boolean-literal-compare -- missing auth keys must stay distinguishable from an explicit `false`

import { uiDecisions, uiRuntime } from "./uiState.js";

interface CallbackOption {
  success?: (result: any) => void;
  complete?: (result: any) => void;
}

/** 调用回调或返回 Promise */
export const callCallback = (
  // oxlint-disable-next-line typescript/explicit-module-boundary-types
  option: any,
  result: unknown,
  errMsg = "ok",
): void | Promise<unknown> => {
  const realOption = option as CallbackOption | undefined;

  if (!realOption) return Promise.resolve(result);

  if (!realOption.success && !realOption.complete) return Promise.resolve(result);

  setTimeout(() => {
    if (realOption.success) realOption.success(result);
    if (realOption.complete) realOption.complete({ errMsg });
  }, 0);
};

const createCallbackError = (errMsg: string): Error & { errMsg: string } =>
  Object.assign(new Error(errMsg), { errMsg });

/** 调用 fail/complete 回调，或返回 reject 的 Promise */
// oxlint-disable-next-line typescript/explicit-module-boundary-types -- mirrors callCallback
export const callFail = (option: any, errMsg: string): void | Promise<unknown> => {
  const realOption = option as
    | {
        complete?: (result: { errMsg: string }) => void;
        fail?: (result: { errMsg: string }) => void;
      }
    | undefined;

  if (!realOption) return Promise.reject(createCallbackError(errMsg));

  if (!realOption.fail && !realOption.complete) return Promise.reject(createCallbackError(errMsg));

  setTimeout(() => {
    realOption.fail?.({ errMsg });
    realOption.complete?.({ errMsg });
  }, 0);
};

export type MockEventListener = (...args: any[]) => void;

type Listener = MockEventListener;

/** 事件监听器注册表 */
const eventListeners = new Map<string, Set<Listener>>();

/** 注册事件监听器 */
export const onEvent = (event: string, listener: Listener): void => {
  const listeners = eventListeners.get(event) ?? new Set<Listener>();

  listeners.add(listener);
  eventListeners.set(event, listeners);
};

/** 移除事件监听器，未传入 listener 时移除该事件的全部监听器 */
export const offEvent = (event: string, listener?: Listener): void => {
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

/** Internal snapshot of the event listeners; used by `mockWx` scopes. */
export type EventListenerSnapshot = Map<string, Set<MockEventListener>>;

/** Capture the current event listeners. */
export const snapshotEventListeners = (): EventListenerSnapshot => {
  const snapshot = new Map<string, Set<MockEventListener>>();

  for (const [event, listeners] of eventListeners) snapshot.set(event, new Set(listeners));

  return snapshot;
};

/** Restore event listeners captured by {@link snapshotEventListeners}. */
export const restoreEventListeners = (snapshot: EventListenerSnapshot): void => {
  eventListeners.clear();

  for (const [event, listeners] of snapshot) eventListeners.set(event, new Set(listeners));
};

/** Remove all event listeners. */
export const clearEventListeners = (): void => {
  eventListeners.clear();
};

/** UI、权限、设备等相关 wx API mock */
export const uiApi = {
  showToast(option: unknown): unknown {
    const { duration, icon, title } = (option ?? {}) as {
      duration?: number;
      icon?: string;
      title?: string;
    };

    uiRuntime.toast = { duration, icon, title: title ?? "" };

    return callCallback(option, { errMsg: "showToast:ok" });
  },

  showModal(option: unknown): unknown {
    const { editable } = (option ?? {}) as { editable?: boolean };
    const decision = uiDecisions.user.modal;
    const decided =
      decision === "cancel"
        ? { cancel: true, confirm: false }
        : typeof decision === "object"
          ? {
              cancel: decision.confirm === false,
              confirm: decision.confirm !== false,
            }
          : { cancel: false, confirm: true };
    const result: { cancel: boolean; confirm: boolean; content?: string } = {
      cancel: decided.cancel,
      confirm: decided.confirm,
    };

    if (editable && typeof decision === "object" && typeof decision.content === "string")
      result.content = decision.content;

    uiRuntime.modal = { ...result };

    return callCallback(option, { ...result, errMsg: "showModal:ok" });
  },

  showLoading(option: unknown): unknown {
    const { title } = (option ?? {}) as { title?: string };

    uiRuntime.loading = { title: title ?? "" };

    return callCallback(option, { errMsg: "showLoading:ok" });
  },

  hideLoading(): void {
    uiRuntime.loading = null;
  },

  hideToast(): void {
    uiRuntime.toast = null;
  },

  showActionSheet(option: unknown): unknown {
    const { itemList } = (option ?? {}) as { itemList?: unknown[] };
    const decision = uiDecisions.user.actionSheet;

    if (decision === "cancel") {
      uiRuntime.actionSheet = null;

      return callFail(option, "showActionSheet:fail cancel");
    }

    const tapIndex = typeof decision === "number" ? decision : 0;

    if (Array.isArray(itemList) && (tapIndex < 0 || tapIndex >= itemList.length))
      return callFail(option, "showActionSheet:fail index out of range");

    uiRuntime.actionSheet = { tapIndex };

    return callCallback(option, { tapIndex, errMsg: "showActionSheet:ok" });
  },

  hideKeyboard(): void {
    // noop
  },

  showKeyboard(option: unknown): unknown {
    return callCallback(option, { errMsg: "showKeyboard:ok" });
  },

  onKeyboardHeightChange(listener: (result: { height: number }) => void): void {
    onEvent("keyboardHeightChange", listener);
  },

  offKeyboardHeightChange(listener?: (result: { height: number }) => void): void {
    offEvent("keyboardHeightChange", listener);
  },

  onCopyUrl(listener: (result: { query: string }) => void): void {
    onEvent("copyUrl", listener);
  },

  offCopyUrl(listener?: (result: { query: string }) => void): void {
    offEvent("copyUrl", listener);
  },

  getSetting(option: unknown): unknown {
    return callCallback(option, {
      authSetting: { ...uiDecisions.auth },
      errMsg: "getSetting:ok",
    });
  },

  authorize(option: unknown): unknown {
    const { scope } = (option ?? {}) as { scope?: string };

    if (!scope) return callFail(option, "authorize:fail scope is required");

    if (uiDecisions.auth[scope] === true) return callCallback(option, { errMsg: "authorize:ok" });

    if (uiDecisions.auth[scope] === false || uiDecisions.authorize === "deny") {
      uiDecisions.auth[scope] = false;

      return callFail(option, "authorize:fail auth deny");
    }

    uiDecisions.auth[scope] = true;

    return callCallback(option, { errMsg: "authorize:ok" });
  },

  openSetting(option: unknown): unknown {
    return callCallback(option, {
      authSetting: { ...uiDecisions.auth },
      errMsg: "openSetting:ok",
    });
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
    const { data } = (option ?? {}) as { data?: unknown };

    if (typeof data !== "string") return callFail(option, "setClipboardData:fail data is required");

    uiDecisions.clipboard = data;

    return callCallback(option, { errMsg: "setClipboardData:ok" });
  },

  getClipboardData(option: unknown): unknown {
    return callCallback(option, {
      data: uiDecisions.clipboard ?? "",
      errMsg: "getClipboardData:ok",
    });
  },

  saveImageToPhotosAlbum(option: unknown): unknown {
    if (uiDecisions.auth["scope.writePhotosAlbum"] === false)
      return callFail(option, "saveImageToPhotosAlbum:fail auth deny");

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

  nextTick(callback: () => void): void {
    callback();
  },

  reportEvent(_eventName: string, _data?: Record<string, unknown>): void {
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
      onCheckForUpdate: (callback): void => {
        onEvent("updateCheck", callback);
      },
      onUpdateReady: (callback): void => {
        onEvent("updateReady", callback);
      },
      onUpdateFailed: (callback): void => {
        onEvent("updateFailed", callback);
      },
      applyUpdate: (): void => {
        uiRuntime.update.applied = true;
        emitEvent("updateApplied");
      },
    };
  },

  vibrateShort(option: unknown): unknown {
    return callCallback(option, { errMsg: "vibrateShort:ok" });
  },

  vibrateLong(option: unknown): unknown {
    return callCallback(option, { errMsg: "vibrateLong:ok" });
  },

  setNavigationBarTitle(option: unknown): unknown {
    return callCallback(option, { errMsg: "setNavigationBarTitle:ok" });
  },

  setNavigationBarColor(option: unknown): unknown {
    return callCallback(option, { errMsg: "setNavigationBarColor:ok" });
  },

  pageScrollTo(option: unknown): unknown {
    return callCallback(option, { errMsg: "pageScrollTo:ok" });
  },

  stopPullDownRefresh(option: unknown): unknown {
    return callCallback(option, { errMsg: "stopPullDownRefresh:ok" });
  },

  showShareMenu(option: unknown): unknown {
    return callCallback(option, { errMsg: "showShareMenu:ok" });
  },

  hideShareMenu(option: unknown): unknown {
    return callCallback(option, { errMsg: "hideShareMenu:ok" });
  },

  showShareImageMenu(option: unknown): unknown {
    return callCallback(option, { errMsg: "showShareImageMenu:ok" });
  },

  hideHomeButton(option: unknown): unknown {
    return callCallback(option, { errMsg: "hideHomeButton:ok" });
  },

  navigateToMiniProgram(option: unknown): unknown {
    return callCallback(option, { errMsg: "navigateToMiniProgram:ok" });
  },

  navigateBackMiniProgram(option: unknown): unknown {
    return callCallback(option, { errMsg: "navigateBackMiniProgram:ok" });
  },

  openCustomerServiceChat(option: unknown): unknown {
    return callCallback(option, { errMsg: "openCustomerServiceChat:ok" });
  },

  updateShareMenu(option: unknown): unknown {
    return callCallback(option, { errMsg: "updateShareMenu:ok" });
  },

  setTabBarBadge(option: unknown): unknown {
    return callCallback(option, { errMsg: "setTabBarBadge:ok" });
  },

  removeTabBarBadge(option: unknown): unknown {
    return callCallback(option, { errMsg: "removeTabBarBadge:ok" });
  },

  showTabBarRedDot(option: unknown): unknown {
    return callCallback(option, { errMsg: "showTabBarRedDot:ok" });
  },

  hideTabBarRedDot(option: unknown): unknown {
    return callCallback(option, { errMsg: "hideTabBarRedDot:ok" });
  },

  setTabBarItem(option: unknown): unknown {
    return callCallback(option, { errMsg: "setTabBarItem:ok" });
  },

  setTabBarStyle(option: unknown): unknown {
    return callCallback(option, { errMsg: "setTabBarStyle:ok" });
  },

  showTabBar(option: unknown): unknown {
    return callCallback(option, { errMsg: "showTabBar:ok" });
  },

  hideTabBar(option: unknown): unknown {
    return callCallback(option, { errMsg: "hideTabBar:ok" });
  },

  setBackgroundColor(option: unknown): unknown {
    return callCallback(option, { errMsg: "setBackgroundColor:ok" });
  },

  setBackgroundTextStyle(option: unknown): unknown {
    return callCallback(option, { errMsg: "setBackgroundTextStyle:ok" });
  },

  setEnableDebug(option: unknown): unknown {
    return callCallback(option, { errMsg: "setEnableDebug:ok" });
  },

  getLaunchOptionsSync(): Record<string, unknown> {
    return {
      path: "",
      query: {},
      scene: 1001,
      shareTicket: "",
      referrerInfo: {},
    };
  },

  getEnterOptionsSync(): Record<string, unknown> {
    return {
      path: "",
      query: {},
      scene: 1001,
      shareTicket: "",
      referrerInfo: {},
    };
  },

  getAppAuthorizeSetting(): Record<string, unknown> {
    return {
      albumAuthorized: "authorized",
      bluetoothAuthorized: "authorized",
      cameraAuthorized: "authorized",
      locationAuthorized: "authorized",
      locationReducedAccuracy: false,
      microphoneAuthorized: "authorized",
      notificationAlertAuthorized: "authorized",
      notificationAuthorized: "authorized",
      notificationBadgeAuthorized: "authorized",
      notificationSoundAuthorized: "authorized",
      phoneCalendarAuthorized: "authorized",
    };
  },

  getPrivacySetting(option: unknown): unknown {
    return callCallback(option, {
      needAuthorization: false,
      privacyContractName: "",
      errMsg: "getPrivacySetting:ok",
    });
  },

  requirePrivacyAuthorize(option: unknown): unknown {
    return callCallback(option, { errMsg: "requirePrivacyAuthorize:ok" });
  },

  onNeedPrivacyAuthorization(
    listener: (result: { needAuthorization: boolean; privacyContractName: string }) => void,
  ): void {
    onEvent("needPrivacyAuthorization", listener);
  },

  offNeedPrivacyAuthorization(
    listener?: (result: { needAuthorization: boolean; privacyContractName: string }) => void,
  ): void {
    offEvent("needPrivacyAuthorization", listener);
  },

  getExptInfoSync(keys?: string[]): Record<string, unknown> {
    return Object.fromEntries((keys ?? []).map((key) => [key, ""]));
  },

  getEnvInfoSync(): Record<string, unknown> {
    return {
      appName: "WeChat",
      appVersion: "8.0.0",
      miniProgram: { envVersion: "develop", version: "" },
    };
  },

  onUserCaptureScreen(listener: () => void): void {
    onEvent("userCaptureScreen", listener);
  },

  offUserCaptureScreen(listener?: () => void): void {
    offEvent("userCaptureScreen", listener);
  },
};

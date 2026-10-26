// oxlint-disable typescript/no-unnecessary-boolean-literal-compare -- missing auth keys must differ from an explicit `false`

import { systemState } from "./systemState.js";
import { uiDecisions } from "./uiState.js";

type Platform = "android" | "devtools" | "ios" | "mac" | "ohos" | "windows";
type AuthorizedStatus = "authorized" | "denied" | "not determined";

interface SafeArea {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

const DEFAULT_PLATFORM: Platform = "devtools";

const platformSystem = (platform: Platform): string => {
  switch (platform) {
    case "android": {
      return "Android 13";
    }
    case "ios": {
      return "iOS 16.0";
    }
    case "ohos": {
      return "OpenHarmony 4.0";
    }
    case "windows": {
      return "Windows 11";
    }
    case "mac": {
      return "macOS 14.0";
    }
    default: {
      return "macOS 14.0";
    }
  }
};

const scopeStatus = (scope: string): AuthorizedStatus => {
  const value = uiDecisions.auth[scope];

  if (value === true) return "authorized";
  if (value === false) return "denied";
  // Backward compatible default: scopes are authorized unless explicitly denied.
  return "authorized";
};

/** Resolve the system options merged over the mock defaults. */
export const getSystemOptions = (): {
  SDKVersion: string;
  brand: string;
  deviceOrientation: "landscape" | "portrait";
  enableDebug: boolean;
  fontSizeSetting: number;
  language: string;
  model: string;
  pixelRatio: number;
  platform: Platform;
  safeArea: SafeArea;
  screenHeight: number;
  screenWidth: number;
  statusBarHeight: number;
  system: string;
  theme: "dark" | "light";
  version: string;
  windowHeight: number;
  windowWidth: number;
} => {
  const options = systemState.system;
  const platform = options.platform ?? DEFAULT_PLATFORM;
  const windowWidth = options.windowWidth ?? 375;
  const windowHeight = options.windowHeight ?? 667;
  const screenWidth = options.screenWidth ?? windowWidth;
  const screenHeight = options.screenHeight ?? windowHeight;
  const statusBarHeight = options.statusBarHeight ?? 20;
  const safeArea = options.safeArea ?? {
    bottom: windowHeight,
    height: windowHeight - statusBarHeight,
    left: 0,
    right: windowWidth,
    top: statusBarHeight,
    width: windowWidth,
  };

  return {
    SDKVersion: options.SDKVersion ?? "3.8.0",
    brand: options.brand ?? "devtools",
    deviceOrientation: options.deviceOrientation ?? "portrait",
    enableDebug: options.enableDebug ?? false,
    fontSizeSetting: options.fontSizeSetting ?? 16,
    language: options.language ?? "zh_CN",
    model: options.model ?? "test",
    pixelRatio: options.pixelRatio ?? 2,
    platform,
    safeArea,
    screenHeight,
    screenWidth,
    statusBarHeight,
    system: options.system ?? platformSystem(platform),
    theme: options.theme ?? "light",
    version: options.version ?? "8.0.0",
    windowHeight,
    windowWidth,
  };
};

/** Current network type / signal strength / connection state. */
export const getNetworkInfo = (): {
  isConnected: boolean;
  networkType: string;
  signalStrength: number;
  weakNet: boolean;
} => {
  const options = systemState.network;
  const networkType = options.offline ? "none" : (options.networkType ?? "wifi");
  const { platform } = getSystemOptions();
  const signalStrength = options.signalStrength ?? (platform === "ios" ? 1 : 100);

  return {
    isConnected: networkType !== "none",
    networkType,
    signalStrength,
    weakNet: options.weakNet ?? false,
  };
};

const setting = (key: "bluetoothEnabled" | "locationEnabled" | "wifiEnabled"): boolean =>
  systemState.system[key] ?? true;

/** `wx.getSystemInfo(Sync)` — one source for all system-information APIs. */
export const buildSystemInfo = (): Record<string, unknown> => {
  const options = getSystemOptions();

  return {
    SDKVersion: options.SDKVersion,
    albumAuthorized: scopeStatus("scope.writePhotosAlbum") === "authorized",
    benchmarkLevel: 0,
    bluetoothEnabled: setting("bluetoothEnabled"),
    brand: options.brand,
    cameraAuthorized: scopeStatus("scope.camera") === "authorized",
    deviceOrientation: options.deviceOrientation,
    enableDebug: options.enableDebug,
    fontSizeSetting: options.fontSizeSetting,
    host: { appId: "" },
    language: options.language,
    locationAuthorized: scopeStatus("scope.userLocation") === "authorized",
    locationEnabled: setting("locationEnabled"),
    locationReducedAccuracy: false,
    microphoneAuthorized: scopeStatus("scope.record") === "authorized",
    model: options.model,
    notificationAlertAuthorized: true,
    notificationAuthorized: true,
    notificationBadgeAuthorized: true,
    notificationSoundAuthorized: true,
    phoneCalendarAuthorized: scopeStatus("scope.addPhoneCalendar") === "authorized",
    pixelRatio: options.pixelRatio,
    platform: options.platform,
    safeArea: options.safeArea,
    screenHeight: options.screenHeight,
    screenWidth: options.screenWidth,
    statusBarHeight: options.statusBarHeight,
    system: options.system,
    version: options.version,
    wifiEnabled: setting("wifiEnabled"),
    windowHeight: options.windowHeight,
    windowWidth: options.windowWidth,
    theme: options.theme,
  };
};

/** `wx.getWindowInfo()`. */
export const buildWindowInfo = (): Record<string, unknown> => {
  const options = getSystemOptions();

  return {
    pixelRatio: options.pixelRatio,
    safeArea: options.safeArea,
    screenHeight: options.screenHeight,
    screenTop: 0,
    screenWidth: options.screenWidth,
    statusBarHeight: options.statusBarHeight,
    windowHeight: options.windowHeight,
    windowWidth: options.windowWidth,
  };
};

/** `wx.getDeviceInfo()`. */
export const buildDeviceInfo = (): Record<string, unknown> => {
  const options = getSystemOptions();

  return {
    abi: "",
    benchmarkLevel: 0,
    brand: options.brand,
    cpuType: "",
    deviceAbi: "",
    memorySize: "",
    model: options.model,
    platform: options.platform,
    system: options.system,
  };
};

/** `wx.getAppBaseInfo()`. */
export const buildAppBaseInfo = (): Record<string, unknown> => {
  const options = getSystemOptions();

  return {
    PCKernelVersion: "",
    SDKVersion: options.SDKVersion,
    enableDebug: options.enableDebug,
    fontSizeScaleFactor: 1,
    fontSizeSetting: options.fontSizeSetting,
    host: { appId: "" },
    language: options.language,
    theme: options.theme,
    version: options.version,
  };
};

/** `wx.getSystemSetting()`. */
export const buildSystemSetting = (): Record<string, unknown> => ({
  bluetoothEnabled: setting("bluetoothEnabled"),
  deviceOrientation: systemState.system.deviceOrientation ?? "portrait",
  locationEnabled: setting("locationEnabled"),
  wifiEnabled: setting("wifiEnabled"),
});

/** `wx.getAppAuthorizeSetting()`. */
export const buildAppAuthorizeSetting = (): Record<string, unknown> => ({
  albumAuthorized: scopeStatus("scope.writePhotosAlbum"),
  bluetoothAuthorized: scopeStatus("scope.bluetooth"),
  cameraAuthorized: scopeStatus("scope.camera"),
  locationAuthorized: scopeStatus("scope.userLocation"),
  locationReducedAccuracy: false,
  microphoneAuthorized: scopeStatus("scope.record"),
  notificationAlertAuthorized: "authorized",
  notificationAuthorized: "authorized",
  notificationBadgeAuthorized: "authorized",
  notificationSoundAuthorized: "authorized",
  phoneCalendarAuthorized: scopeStatus("scope.addPhoneCalendar"),
});

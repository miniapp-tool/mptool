import { mockWx as mockWxControl } from "@mptool/mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportNetworkStatus } from "../src/index.js";

describe(reportNetworkStatus, () => {
  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    mockWxControl.reset();
  });

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWxControl.reset();
  });

  const mockNetworkType = (networkType: string): void => {
    const mockGetNetworkType = wx as unknown as {
      getNetworkType: (option: { success: (result: { networkType: string }) => void }) => void;
    };

    mockGetNetworkType.getNetworkType = (option): void => {
      option.success({ networkType });
    };
  };

  const mockShowToast = (): string[] => {
    const titles: string[] = [];

    const mockShowToastApi = wx as unknown as {
      showToast: (option: { title: string }) => void;
    };

    mockShowToastApi.showToast = (option): void => {
      titles.push(option.title);
    };

    return titles;
  };

  const mockWifi = (signalStrength: number, platform = "ios", fail = false): void => {
    const mockWifiApi = wx as unknown as {
      getDeviceInfo: () => { platform: string };
      startWifi: (option: { success?: () => void; fail?: () => void }) => void;
      getConnectedWifi: (option: {
        success?: (result: { wifi: { signalStrength: number } }) => void;
        fail?: () => void;
      }) => void;
    };

    mockWifiApi.getDeviceInfo = (): { platform: string } => ({ platform });

    mockWifiApi.startWifi = (option): void => {
      if (fail) option.fail?.();
      else option.success?.();
    };

    mockWifiApi.getConnectedWifi = (option): void => {
      if (fail) option.fail?.();
      else option.success?.({ wifi: { signalStrength } });
    };
  };

  it("should show warning when wifi signal is weak", () => {
    const titles = mockShowToast();
    mockNetworkType("wifi");
    mockWifi(0.3, "ios");

    reportNetworkStatus();

    expect(titles).toStrictEqual(["Wifi 信号不佳"]);
  });

  it("should not show toast when wifi signal is strong", () => {
    const titles = mockShowToast();
    mockNetworkType("wifi");
    mockWifi(1, "ios");

    reportNetworkStatus();

    expect(titles).toStrictEqual([]);
  });

  it("should show toast when wifi is unavailable", () => {
    const titles = mockShowToast();
    mockNetworkType("wifi");
    mockWifi(1, "ios", true);

    reportNetworkStatus();

    expect(titles).toStrictEqual(["无法连接网络"]);
  });

  it("should show warning when android wifi signal is weak", () => {
    const titles = mockShowToast();
    mockNetworkType("wifi");
    mockWifi(30, "android");

    reportNetworkStatus();

    expect(titles).toStrictEqual(["Wifi 信号不佳"]);
  });

  it("should not show toast when android wifi signal is strong", () => {
    const titles = mockShowToast();
    mockNetworkType("wifi");
    mockWifi(80, "android");

    reportNetworkStatus();

    expect(titles).toStrictEqual([]);
  });

  it("should show toast for slow 2g/3g network", () => {
    const titles = mockShowToast();
    mockNetworkType("2g");

    reportNetworkStatus();

    expect(titles).toStrictEqual(["您的网络状态不佳"]);
  });

  it("should not show toast for healthy 4g network", () => {
    const titles = mockShowToast();
    mockNetworkType("4g");

    reportNetworkStatus();

    expect(titles).toStrictEqual([]);
  });

  it("should not show toast for healthy 5g network", () => {
    const titles = mockShowToast();
    mockNetworkType("5g");

    reportNetworkStatus();

    expect(titles).toStrictEqual([]);
  });

  it("should show toast when not connected", () => {
    const titles = mockShowToast();
    mockNetworkType("none");

    reportNetworkStatus();

    expect(titles).toStrictEqual(["您没有连接到网络"]);
  });

  it("should show toast for unknown network type", () => {
    const titles = mockShowToast();
    mockNetworkType("unknown");

    reportNetworkStatus();

    expect(titles).toStrictEqual(["网络连接出现问题，请稍后重试"]);
  });

  it("should show toast when connected wifi info cannot be read", () => {
    const titles = mockShowToast();
    mockNetworkType("wifi");
    const mockWifiApi = wx as unknown as {
      startWifi: (option: { success?: () => void; fail?: () => void }) => void;
      getConnectedWifi: (option: {
        success?: (result: { wifi: { signalStrength: number } }) => void;
        fail?: () => void;
      }) => void;
    };

    mockWifiApi.startWifi = (option): void => {
      option.success?.();
    };
    mockWifiApi.getConnectedWifi = (option): void => {
      option.fail?.();
    };

    reportNetworkStatus();

    expect(titles).toStrictEqual(["无法连接网络"]);
  });

  it("should fall back to getSystemInfoSync when getDeviceInfo is unavailable", () => {
    const titles = mockShowToast();
    mockNetworkType("wifi");
    const mockWifiApi = wx as unknown as {
      getDeviceInfo?: () => { platform: string };
      getSystemInfoSync: () => { platform: string };
      startWifi: (option: { success?: () => void; fail?: () => void }) => void;
      getConnectedWifi: (option: {
        success?: (result: { wifi: { signalStrength: number } }) => void;
        fail?: () => void;
      }) => void;
    };
    const originalGetDeviceInfo = mockWifiApi.getDeviceInfo;
    const originalGetSystemInfoSync = mockWifiApi.getSystemInfoSync;

    mockWifiApi.getDeviceInfo = undefined;
    mockWifiApi.getSystemInfoSync = (): { platform: string } => ({ platform: "android" });
    mockWifiApi.startWifi = (option): void => {
      option.success?.();
    };
    mockWifiApi.getConnectedWifi = (option): void => {
      option.success?.({ wifi: { signalStrength: 30 } });
    };

    reportNetworkStatus();

    expect(titles).toStrictEqual(["Wifi 信号不佳"]);

    mockWifiApi.getDeviceInfo = originalGetDeviceInfo;
    mockWifiApi.getSystemInfoSync = originalGetSystemInfoSync;
  });

  it("should show toast when the network type cannot be read", () => {
    const titles = mockShowToast();
    const mockGetNetworkType = wx as unknown as {
      getNetworkType: (option: {
        success?: (result: { networkType: string }) => void;
        fail?: () => void;
      }) => void;
    };

    mockGetNetworkType.getNetworkType = (option): void => {
      option.fail?.();
    };

    reportNetworkStatus();

    expect(titles).toStrictEqual(["网络连接出现问题，请稍后重试"]);
  });

  it("should not log an error for healthy networks", () => {
    const titles = mockShowToast();
    const errorSpy = vi.spyOn(console, "error").mockReturnValue(undefined);

    try {
      for (const networkType of ["4g", "5g"]) {
        mockNetworkType(networkType);
        reportNetworkStatus();
      }

      mockNetworkType("wifi");
      mockWifi(1, "ios");
      reportNetworkStatus();

      expect(titles).toStrictEqual([]);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("should log an error for an unknown network type", () => {
    const titles = mockShowToast();
    const errorSpy = vi.spyOn(console, "error").mockReturnValue(undefined);

    try {
      mockNetworkType("unknown");
      reportNetworkStatus();

      expect(titles).toStrictEqual(["网络连接出现问题，请稍后重试"]);
      expect(errorSpy).toHaveBeenCalledWith("Request fail with", "unknown");
    } finally {
      errorSpy.mockRestore();
    }
  });
});

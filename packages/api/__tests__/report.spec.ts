import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { reportNetworkStatus } from "../src/index.js";

describe(reportNetworkStatus, () => {
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
});

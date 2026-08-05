import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { reportNetworkStatus } from "../src/index.js";

describe(reportNetworkStatus, () => {
  const mockNetworkType = (networkType: string): void => {
    const mockGetNetworkType = wx as unknown as {
      getNetworkType: (option: { success?: (result: { networkType: string }) => void }) => void;
    };

    mockGetNetworkType.getNetworkType = (option): void => {
      option.success?.({ networkType });
    };
  };

  it("should not throw", () => {
    expect(() => reportNetworkStatus()).not.toThrow();
  });

  it("should handle wifi", () => {
    mockNetworkType("wifi");

    expect(() => reportNetworkStatus()).not.toThrow();
  });

  it("should handle 2g", () => {
    mockNetworkType("2g");

    expect(() => reportNetworkStatus()).not.toThrow();
  });

  it("should handle 3g", () => {
    mockNetworkType("3g");

    expect(() => reportNetworkStatus()).not.toThrow();
  });

  it("should handle none", () => {
    mockNetworkType("none");

    expect(() => reportNetworkStatus()).not.toThrow();
  });

  it("should handle unknown network type", () => {
    mockNetworkType("4g");

    expect(() => reportNetworkStatus()).not.toThrow();
  });
});

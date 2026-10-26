import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { frameworkApi, setFrameworkMock } from "../src/framework.js";
import { mockWx, wx } from "../src/index.js";

const eventWx = wx as unknown as Record<string, (listener?: (...args: any[]) => void) => void>;

interface PageOptions {
  route: string;
  [key: string]: unknown;
}

const registerPage = (route: string, options: Record<string, unknown> = {}): void => {
  (globalThis as unknown as { Page: (value: PageOptions) => void }).Page({ ...options, route });
};

const navigate = (
  api: "navigateBack" | "navigateTo" | "reLaunch" | "redirectTo" | "switchTab",
  option: object = {},
): Promise<unknown> =>
  (wx as unknown as Record<string, (value: object) => Promise<unknown>>)[api](option);

describe("event triggers", () => {
  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    setFrameworkMock();
    frameworkApi.pages.length = 0;
    frameworkApi.currentPages.length = 0;
    frameworkApi.tabBarPages.length = 0;
    frameworkApi.tabPages.clear();
  });

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("onPageNotFound", () => {
    it("should fire for navigateTo / redirectTo / switchTab / reLaunch", async () => {
      const payloads: unknown[] = [];

      eventWx.onPageNotFound((payload: unknown) => {
        payloads.push(payload);
      });

      for (const api of ["navigateTo", "redirectTo", "switchTab", "reLaunch"] as const) {
        // oxlint-disable-next-line no-await-in-loop
        await expect(navigate(api, { url: "/pages/missing?id=1" })).rejects.toMatchObject({
          errMsg: `${api}:fail page "/pages/missing" is not found`,
        });
      }

      expect(payloads).toHaveLength(4);

      for (const payload of payloads) {
        expect(payload).toStrictEqual({
          isEntryPage: false,
          path: "/pages/missing",
          query: { id: "1" },
        });
      }
    });

    it("should keep the navigation failure callback", () =>
      new Promise<void>((resolve) => {
        let eventPayload: unknown;
        const fail = vi.fn<(result: { errMsg: string }) => void>();

        eventWx.onPageNotFound((payload: unknown) => {
          eventPayload = payload;
        });

        (
          wx as unknown as {
            navigateTo: (option: {
              fail: (result: { errMsg: string }) => void;
              url: string;
            }) => void;
          }
        ).navigateTo({
          url: "/pages/missing",
          fail: (result) => {
            fail(result);
            expect(fail).toHaveBeenCalledWith({
              errMsg: 'navigateTo:fail page "/pages/missing" is not found',
            });
            expect(eventPayload).toMatchObject({ path: "/pages/missing" });
            resolve();
          },
        });
      }));
  });

  describe("route events", () => {
    it("should emit beforeAppRoute → lifecycle → appRoute → appRouteDone", async () => {
      const calls: string[] = [];

      registerPage("/pages/first", {
        onLoad: () => calls.push("onLoad"),
        onReady: () => calls.push("onReady"),
        onShow: () => calls.push("onShow"),
      });
      eventWx.onBeforeAppRoute((payload: { openType: string }) => {
        calls.push(`before:${payload.openType}`);
      });
      eventWx.onAppRoute((payload: { openType: string }) => {
        calls.push(`route:${payload.openType}`);
      });
      eventWx.onAppRouteDone((payload: { openType: string }) => {
        calls.push(`done:${payload.openType}`);
      });

      await navigate("navigateTo", { url: "/pages/first?from=test" });

      expect(calls).toStrictEqual([
        "before:navigateTo",
        "onLoad",
        "onShow",
        "onReady",
        "route:navigateTo",
        "done:navigateTo",
      ]);
    });

    it("should emit appRouteDone after success / complete callbacks", async () => {
      const calls: string[] = [];

      registerPage("/pages/first");
      eventWx.onAppRouteDone(() => {
        calls.push("done");
      });

      await new Promise<void>((resolve) => {
        (
          wx as unknown as {
            navigateTo: (option: {
              complete: () => void;
              success: () => void;
              url: string;
            }) => void;
          }
        ).navigateTo({
          url: "/pages/first",
          success: () => {
            calls.push("success");
          },
          complete: () => {
            calls.push("complete");
            resolve();
          },
        });
      });

      expect(calls).toStrictEqual(["success", "complete", "done"]);
    });

    it("should pass openType for every navigation API", async () => {
      const openTypes: string[] = [];

      eventWx.onAppRoute((payload: { openType: string }) => {
        openTypes.push(payload.openType);
      });

      registerPage("/pages/first");
      registerPage("/pages/second");
      registerPage("/pages/tab", { tabBar: true });

      await navigate("navigateTo", { url: "/pages/first" });
      await navigate("redirectTo", { url: "/pages/second" });
      await navigate("navigateTo", { url: "/pages/second" });
      await navigate("navigateBack");

      mockWx.tabBar(["/pages/tab"]);
      await navigate("switchTab", { url: "/pages/tab" });
      await navigate("reLaunch", { url: "/pages/first" });

      expect(openTypes).toStrictEqual([
        "navigateTo",
        "redirectTo",
        "navigateTo",
        "navigateBack",
        "switchTab",
        "reLaunch",
      ]);
    });
  });

  describe("network / Wi-Fi", () => {
    it("should fire wifiConnected when switching to wifi", () => {
      const listener = vi.fn<(payload: { wifi: Record<string, unknown> }) => void>();

      eventWx.onWifiConnected(listener);
      mockWx.network({ networkType: "4g" });
      expect(listener).not.toHaveBeenCalled();

      mockWx.network({ networkType: "wifi", signalStrength: 80 });
      expect(listener).toHaveBeenCalledWith({
        wifi: {
          BSSID: "",
          SSID: "",
          frequency: 0,
          secure: true,
          signalStrength: 80,
        },
      });
    });

    it("should fire networkWeakChange when weakNet changes", () => {
      const listener = vi.fn<(payload: { networkType: string; weakNet: boolean }) => void>();

      eventWx.onNetworkWeakChange(listener);
      mockWx.network({ weakNet: true });

      expect(listener).toHaveBeenCalledWith({ networkType: "wifi", weakNet: true });
    });

    it("should trigger onGetWifiList from getWifiList", async () => {
      const listener = vi.fn<(payload: { wifiList: unknown[] }) => void>();
      const wifiList = [
        { BSSID: "b", SSID: "wifi", frequency: 2412, secure: true, signalStrength: 90 },
      ];

      mockWx.network({ wifiList });
      eventWx.onGetWifiList(listener);

      await expect(wx.getWifiList({})).resolves.toMatchObject({ errMsg: "getWifiList:ok" });
      expect(listener).toHaveBeenCalledWith({ wifiList });
    });
  });

  describe("helpers", () => {
    it("should trigger onUnhandledRejection", () => {
      const listener = vi.fn<(payload: { promise: Promise<unknown>; reason: string }) => void>();
      const promise = Promise.resolve("value");

      eventWx.onUnhandledRejection(listener);
      mockWx.unhandledRejection("boom", promise);

      expect(listener).toHaveBeenCalledWith({ promise, reason: "boom" });
    });

    it("should trigger onMemoryWarning with a level", () => {
      const listener = vi.fn<(payload: { level: number }) => void>();

      eventWx.onMemoryWarning(listener);
      mockWx.memoryWarning();
      mockWx.memoryWarning(15);

      expect(listener).toHaveBeenNthCalledWith(1, { level: 10 });
      expect(listener).toHaveBeenNthCalledWith(2, { level: 15 });
    });

    it("should trigger onError with a message", () => {
      const listener = vi.fn<(message: string) => void>();

      eventWx.onError(listener);
      mockWx.error("boom");

      expect(listener).toHaveBeenCalledWith("boom");
    });
  });
});

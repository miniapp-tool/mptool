import { afterEach, describe, expect, it, vi } from "vitest";

import { frameworkApi, mockWx, wx } from "../src/index.js";
import { mockState } from "../src/state.js";

interface CallResult<T = unknown> {
  ok: boolean;
  res: T;
}

const callApi = <T = unknown>(
  api: string,
  option: Record<string, unknown> = {},
): Promise<CallResult<T>> =>
  new Promise((resolve) => {
    (wx as unknown as Record<string, (value: unknown) => void>)[api]({
      ...option,
      fail: (res: T): void => resolve({ ok: false, res }),
      success: (res: T): void => resolve({ ok: true, res }),
    });
  });

interface RequestResult {
  statusCode?: number;
  data?: unknown;
  errMsg?: string;
}

const callRequest = (option: {
  method?: string;
  url: string;
}): Promise<CallResult<RequestResult>> =>
  new Promise((resolve) => {
    wx.request({
      ...option,
      fail: (res: RequestResult): void => resolve({ ok: false, res }),
      success: (res: RequestResult): void => resolve({ ok: true, res }),
    });
  });

describe("mockWx control plane", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset the control plane after every case
  afterEach(() => {
    mockWx.reset();
  });

  describe("fail / failNext", () => {
    it("should inject a failure into a callback API", async () => {
      mockWx.failNext("getNetworkType", { type: "network" });

      const result = await callApi<{ errMsg: string }>("getNetworkType");

      expect(result.ok).toBe(false);
      expect(result.res.errMsg).toBe("getNetworkType:fail");
    });

    it("should reject promise-style calls", async () => {
      mockWx.failNext("getNetworkType", { type: "timeout" });

      await expect(wx.getNetworkType({})).rejects.toMatchObject({
        errMsg: "getNetworkType:fail timeout",
      });
    });

    it("should throw for synchronous APIs", () => {
      mockWx.failNext("getStorageSync", { type: "quota" });

      let caught: unknown;

      try {
        wx.getStorageSync("key");
      } catch (err) {
        caught = err;
      }

      expect(caught).toMatchObject({ errMsg: "setStorage:fail exceed storage max size" });
    });

    it("should only match the requested number of calls", async () => {
      mockWx.fail("getNetworkType", { type: "network" }, { times: 2 });

      expect((await callApi("getNetworkType")).ok).toBe(false);
      expect((await callApi("getNetworkType")).ok).toBe(false);
      expect((await callApi("getNetworkType")).ok).toBe(true);
    });

    it("should support conditional matching", async () => {
      mockWx.fail(
        "request",
        { type: "network" },
        { match: (arg) => (arg as { url?: string }).url === "https://example.com/fail" },
      );

      expect((await callRequest({ url: "https://example.com/fail" })).ok).toBe(false);
      expect((await callRequest({ url: "https://example.com/ok" })).ok).toBe(true);
    });

    it("should stop matching after dispose()", async () => {
      const handle = mockWx.fail("getNetworkType", { type: "network" });

      expect((await callApi("getNetworkType")).ok).toBe(false);

      handle.dispose();
      expect(handle.count).toBe(1);
      expect((await callApi("getNetworkType")).ok).toBe(true);
    });

    it("should reject unsupported API kinds at registration time", () => {
      expect(() => mockWx.fail("onThemeChange", { type: "network" })).toThrow(/event/u);
      expect(() => mockWx.fail("getUpdateManager", { type: "network" })).toThrow(/manager/u);
      expect(() => mockWx.fail("hideLoading", { type: "network" })).toThrow(/void/u);
      expect(() => mockWx.fail("notAnApi" as never, { type: "network" })).toThrow(/unknown/u);
      expect(() => mockWx.fail("request", { statusCode: 500, type: "http" })).toThrow(/respond/u);
    });
  });

  describe("failSequence", () => {
    it("should apply failures in order and fall through afterwards", async () => {
      mockWx.failSequence("getNetworkType", [{ type: "network" }, { type: "timeout" }]);

      await expect(callApi<{ errMsg: string }>("getNetworkType")).resolves.toStrictEqual({
        ok: false,
        res: { errMsg: "getNetworkType:fail" },
      });
      await expect(callApi<{ errMsg: string }>("getNetworkType")).resolves.toStrictEqual({
        ok: false,
        res: { errMsg: "getNetworkType:fail timeout" },
      });
      expect((await callApi("getNetworkType")).ok).toBe(true);
    });

    it("should require at least one failure", () => {
      expect(() => mockWx.failSequence("getNetworkType", [])).toThrow(/at least one/u);
    });
  });

  describe("respond", () => {
    it("should replace the response of a callback API", async () => {
      mockWx.respond("getNetworkType", { networkType: "none" });

      await expect(callApi("getNetworkType")).resolves.toStrictEqual({
        ok: true,
        res: { networkType: "none" },
      });
    });

    it("should support async responders", async () => {
      mockWx.respond("getNetworkType", () => Promise.resolve({ networkType: "2g" }));

      await expect(callApi("getNetworkType")).resolves.toStrictEqual({
        ok: true,
        res: { networkType: "2g" },
      });
    });

    it("should replace the return value of synchronous APIs", () => {
      mockWx.respond("getWindowInfo", { windowWidth: 320 });

      expect(wx.getWindowInfo()).toStrictEqual({ windowWidth: 320 });
    });

    it("should replace the response of wx.request", async () => {
      mockWx.respond("request", { data: { name: "hope" }, statusCode: 201 });

      const result = await callRequest({ url: "https://example.com/user" });

      expect(result.ok).toBe(true);
      expect(result.res).toMatchObject({ data: { name: "hope" }, statusCode: 201 });
    });
  });

  describe("route", () => {
    it("should match method + url", async () => {
      mockWx.route({
        "GET https://api.example.com/user": { data: { name: "hope" }, statusCode: 200 },
        "POST https://api.example.com/pay": { data: { error: "bad gateway" }, statusCode: 502 },
      });

      await expect(callRequest({ url: "https://api.example.com/user" })).resolves.toMatchObject({
        ok: true,
        res: { data: { name: "hope" }, statusCode: 200 },
      });
      await expect(
        callRequest({ method: "POST", url: "https://api.example.com/pay" }),
      ).resolves.toMatchObject({ ok: true, res: { statusCode: 502 } });
    });

    it("should fall through to the default response for unmatched requests", async () => {
      mockWx.route({
        "GET https://api.example.com/user": { data: { name: "hope" } },
      });

      const result = await callRequest({ url: "https://example.com/other" });

      expect(result.ok).toBe(true);
      expect(result.res.statusCode).toBe(200);
      expect(result.res.data).toStrictEqual({});
    });

    it("should match regular expressions", async () => {
      mockWx.route({ "/^https:\\/\\/api\\.example\\.com\\/v\\d+\\//u": { statusCode: 204 } });

      const result = await callRequest({ url: "https://api.example.com/v2/users" });

      expect(result.res.statusCode).toBe(204);
    });

    it("should inject failures from route values", async () => {
      mockWx.route({ "GET https://api.example.com/slow": { type: "timeout" } });

      const result = await callRequest({ url: "https://api.example.com/slow" });

      expect(result.ok).toBe(false);
      expect(result.res.errMsg).toBe("request:fail timeout");
    });
  });

  describe("calls", () => {
    it("should record calls and clear them", () => {
      expect(mockWx.calls("getNetworkType")).toHaveLength(0);

      void wx.getNetworkType({});
      void wx.getNetworkType({});

      expect(mockWx.calls("getNetworkType")).toHaveLength(2);

      mockWx.clearCalls("getNetworkType");
      expect(mockWx.calls("getNetworkType")).toHaveLength(0);
    });

    it("should clear all recorded calls", () => {
      void wx.getNetworkType({});
      void wx.getStorageInfo({});

      mockWx.clearCalls();

      expect(mockWx.calls("getNetworkType")).toHaveLength(0);
      expect(mockWx.calls("getStorageInfo")).toHaveLength(0);
    });
  });

  describe("state presets", () => {
    it("should store configuration for the follow-up PRs", () => {
      mockWx.storage({ limitSize: 1024 });
      mockWx.auth({ "scope.camera": false });
      mockWx.authorize("deny");
      mockWx.user({ modal: "cancel" });
      mockWx.system({ platform: "android" });
      mockWx.network({ networkType: "none" });
      mockWx.clipboard("copied");
      mockWx.login({ code: "code-1", sessionValid: false });
      mockWx.compat({ storageResolveMissingKey: true });

      expect(mockState.config).toMatchObject({
        auth: { "scope.camera": false },
        authorize: "deny",
        clipboard: "copied",
        compat: { storageResolveMissingKey: true },
        login: { code: "code-1", sessionValid: false },
        network: { networkType: "none" },
        storage: { limitSize: 1024 },
        system: { platform: "android" },
        user: { modal: "cancel" },
      });
    });

    it("should seed the page stack", () => {
      mockWx.pages([{ route: "/pages/main" }]);

      expect(frameworkApi.currentPages).toStrictEqual([{ route: "/pages/main" }]);
    });

    it("should seed the in-memory file system", () => {
      mockWx.dir("seed");
      mockWx.file("seed/file.txt", "content");

      expect(wx.getFileSystemManager().readFileSync("seed/file.txt", "utf-8")).toBe("content");
    });

    it("should emit events", () => {
      const listener = vi.fn<(result: { theme: string }) => void>();

      wx.onThemeChange(listener);
      mockWx.emit("themeChange", { theme: "dark" });

      expect(listener).toHaveBeenCalledWith({ theme: "dark" });
    });
  });
});

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

      expect(caught).toMatchObject({ errMsg: "setStorage:fail exceed storage max size 10Mb" });
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

  describe("failure mapping", () => {
    const catchFailure = (): unknown => {
      try {
        wx.getStorageSync("key");
      } catch (err) {
        return err;
      }

      return null;
    };

    it.each([
      [{ type: "network" } as const, "getStorageSync:fail"],
      [{ type: "timeout" } as const, "getStorageSync:fail timeout"],
      [{ type: "abort" } as const, "getStorageSync:fail abort"],
      [{ type: "quota" } as const, "setStorage:fail exceed storage max size 10Mb"],
      [{ type: "cancel" } as const, "getStorageSync:fail cancel"],
      [{ type: "permission" } as const, "getStorageSync:fail permission denied"],
      [{ errMsg: "custom failure", type: "fail" } as const, "custom failure"],
    ])("should map %j to the expected errMsg", (failure, errMsg) => {
      mockWx.failNext("getStorageSync", failure);

      expect(catchFailure()).toMatchObject({ errMsg });
    });

    it("should attach errCode for noent and permission failures", () => {
      mockWx.failNext("getStorageSync", { path: "a.txt", type: "noent" });
      expect(catchFailure()).toMatchObject({ errCode: 1300002, errMsg: /no such file/u });

      mockWx.failNext("getStorageSync", { type: "permission" });
      expect(catchFailure()).toMatchObject({ errCode: 1300014 });
    });

    it("should reject the provided error for throw failures", () => {
      const error = new Error("boom");

      mockWx.failNext("getStorageSync", { error, type: "throw" });

      expect(catchFailure()).toBe(error);
    });
  });

  describe("task APIs", () => {
    it("should return a task-shaped object when downloadFile fails", async () => {
      mockWx.failNext("downloadFile", { type: "network" });

      const fail = vi.fn<(result: { errMsg: string }) => void>();
      const task = wx.downloadFile({ fail, url: "https://example.com/file" }) as unknown as {
        onProgressUpdate?: unknown;
      };

      expect(task).toBeTypeOf("object");
      expect(task.onProgressUpdate).toBeTypeOf("function");

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });

      expect(fail).toHaveBeenCalledWith({ errMsg: "downloadFile:fail" });
    });

    it("should return a task-shaped object when respond() replaces a downloadFile result", async () => {
      mockWx.respond("downloadFile", { statusCode: 200, tempFilePath: "mock://tmp/file" });

      const success = vi.fn<(result: { tempFilePath?: string }) => void>();
      const task = wx.downloadFile({ success, url: "https://example.com/file" });

      expect(task).toBeTypeOf("object");

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });

      expect(success).toHaveBeenCalledWith({ statusCode: 200, tempFilePath: "mock://tmp/file" });
    });
  });

  describe("manager APIs", () => {
    it("should allow respond() to replace a manager", () => {
      const manager = { onCheckForUpdate: vi.fn<() => void>() };

      mockWx.respond("getUpdateManager", manager);

      expect(wx.getUpdateManager()).toBe(manager);
    });

    it("should still reject failures on manager APIs", () => {
      expect(() => mockWx.fail("getUpdateManager", { type: "network" })).toThrow(/manager/u);
    });
  });

  describe("timing", () => {
    it("should honour the per-response delay", async () => {
      vi.useFakeTimers();

      try {
        const success = vi.fn<(result: { statusCode: number }) => void>();

        mockWx.respond("request", { data: { ok: true }, delay: 20, statusCode: 200 });
        wx.request({ success, url: "https://example.com/api" });

        await vi.advanceTimersByTimeAsync(10);
        expect(success).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(10);
        expect(success).toHaveBeenCalledTimes(1);
        expect(success).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 200 }));
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("reset", () => {
    it("should clear the call log", () => {
      void wx.getNetworkType({});
      expect(mockWx.calls("getNetworkType")).toHaveLength(1);

      mockWx.reset();

      expect(mockWx.calls("getNetworkType")).toHaveLength(0);
      expect(mockWx.calls("getFileSystemManager")).toHaveLength(0);
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { createFailureError, createFailureResult } from "../src/failure.js";
import { mockWx, wx } from "../src/index.js";
import { isWxFailure } from "../src/state.js";

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

const callRequest = (option: {
  method?: string;
  url?: unknown;
}): Promise<CallResult<{ data?: unknown; errMsg?: string; statusCode?: number }>> =>
  new Promise((resolve) => {
    wx.request({
      ...option,
      fail: (res: { errMsg?: string }): void => resolve({ ok: false, res }),
      success: (res: { data?: unknown; statusCode?: number }): void => resolve({ ok: true, res }),
    });
  });

const catchFailure = (): unknown => {
  try {
    wx.getStorageSync("key");
  } catch (err) {
    return err;
  }

  return null;
};

describe("failure result edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset injected rules after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should attach errno to network failures", () => {
    mockWx.failNext("getStorageSync", { errno: 7, type: "network" });

    expect(catchFailure()).toMatchObject({ errMsg: "getStorageSync:fail", errno: 7 });
  });

  it("should use the generic quota message for non-storage APIs", async () => {
    mockWx.failNext("getNetworkType", { type: "quota" });

    await expect(callApi("getNetworkType")).resolves.toStrictEqual({
      ok: false,
      res: { errMsg: "getNetworkType:fail exceed storage max size" },
    });
  });

  it("should use the auth-deny message for wx.authorize", async () => {
    mockWx.failNext("authorize", { type: "permission" });

    await expect(callApi("authorize", { scope: "scope.camera" })).resolves.toStrictEqual({
      ok: false,
      res: { errCode: 1300014, errMsg: "authorize:fail auth deny" },
    });
  });

  it("should reject http failures passed straight to createFailureResult", () => {
    expect(() => createFailureResult("request", { statusCode: 500, type: "http" })).toThrow(
      /HTTP status codes are responses/u,
    );
  });

  it("should map throw failures to the error message", () => {
    const error = new Error("boom");

    expect(createFailureResult("request", { error, type: "throw" })).toStrictEqual({
      errMsg: "boom",
    });
    expect(createFailureError("request", { error, type: "throw" })).toBe(error);
  });

  it("should fall back for an unknown failure type", () => {
    expect(createFailureResult("request", { type: "unknown" } as never)).toStrictEqual({
      errMsg: "request:fail",
    });
  });

  it("should preserve errno and errCode from custom failures", () => {
    expect(
      createFailureResult("request", { errCode: 1, errMsg: "custom", errno: 2, type: "fail" }),
    ).toStrictEqual({ errCode: 1, errMsg: "custom", errno: 2 });
  });
});

describe("mockWx control plane edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset the control plane after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should expose the joined id for multi-API rules", () => {
    const handle = mockWx.fail(["getNetworkType", "getStorageSync"], { type: "network" });

    expect(handle.id).toMatch(/^rule-\d+,rule-\d+$/u);
    expect(handle.count).toBe(0);
  });

  it("should reject the respond() message for event APIs", () => {
    expect(() => mockWx.respond("onThemeChange", {})).toThrow(/respond\(\) supports/u);
  });

  it("should reject unknown APIs for respond()", () => {
    expect(() => mockWx.respond("notAnApi" as never, {})).toThrow(/unknown wx API/u);
  });

  it("should validate options.times", () => {
    expect(() => mockWx.fail("getNetworkType", { type: "network" }, { times: 0 })).toThrow(
      RangeError,
    );
    expect(() => mockWx.fail("getNetworkType", { type: "network" }, { times: 1.5 })).toThrow(
      RangeError,
    );
  });

  it("should let once win over times", async () => {
    mockWx.fail("getNetworkType", { type: "network" }, { once: true, times: 5 });

    expect((await callApi("getNetworkType")).ok).toBe(false);
    expect((await callApi("getNetworkType")).ok).toBe(true);
  });

  it("should support once without times", async () => {
    mockWx.fail("getNetworkType", { type: "network" }, { once: true });

    expect((await callApi("getNetworkType")).ok).toBe(false);
    expect((await callApi("getNetworkType")).ok).toBe(true);
  });

  it("should reject an empty route table", () => {
    expect(() => mockWx.route({})).toThrow(/at least one entry/u);
  });

  it("should accept an empty regular expression key", async () => {
    mockWx.route({ "//": { data: { matched: true }, statusCode: 200 } });

    await expect(callRequest({ url: "https://example.com/anything" })).resolves.toMatchObject({
      ok: true,
      res: { data: { matched: true } },
    });
  });

  it("should seed files with Uint8Array contents and no parent directory", () => {
    mockWx.file("plain.txt", new Uint8Array([1, 2, 3]));
    mockWx.file("nested/buffer.bin", new Uint8Array([4, 5]));

    const fs = wx.getFileSystemManager();

    expect([...new Uint8Array(fs.readFileSync("plain.txt") as ArrayBuffer)]).toStrictEqual([
      1, 2, 3,
    ]);
    expect([...new Uint8Array(fs.readFileSync("nested/buffer.bin") as ArrayBuffer)]).toStrictEqual([
      4, 5,
    ]);
  });

  it("should restore a defined wx.env.DEBUG through a scope", () => {
    const env = wx.env as unknown as Record<string, unknown>;

    env.DEBUG = true;

    const scope = mockWx.scope();

    delete env.DEBUG;
    scope.restore();

    expect(env.DEBUG).toBe(true);
  });

  it("should default the unhandledRejection promise", async () => {
    const listener = vi.fn<(result: { promise: Promise<unknown>; reason: string }) => void>();

    (
      wx as unknown as Record<string, (value: (...args: unknown[]) => void) => void>
    ).onUnhandledRejection(listener as unknown as (...args: unknown[]) => void);
    mockWx.unhandledRejection("boom");

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(listener).toHaveBeenCalledWith({
      promise: expect.any(Promise),
      reason: "boom",
    });
  });

  it("should treat http route values as successful responses", async () => {
    mockWx.route({
      "GET https://api.example.com/error": {
        data: { message: "bad" },
        header: { "x-test": "1" },
        statusCode: 500,
        type: "http",
      },
    });

    await expect(callRequest({ url: "https://api.example.com/error" })).resolves.toMatchObject({
      ok: true,
      res: { data: { message: "bad" }, header: { "x-test": "1" }, statusCode: 500 },
    });
  });
});

describe("state helpers", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset route rules after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should recognise failure-shaped values only", () => {
    expect(isWxFailure({ type: "network" })).toBe(true);
    expect(isWxFailure(null)).toBe(false);
    expect(isWxFailure("network")).toBe(false);
    expect(isWxFailure({ type: "other" })).toBe(false);
  });

  it("should skip route rules for a request without an argument", async () => {
    mockWx.route({ "GET https://api.example.com/user": { statusCode: 201 } });

    const wxAny = wx as unknown as Record<string, (...args: any[]) => any>;

    expect(wxAny.request()).toHaveProperty("abort");

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  it("should skip route rules when the request argument is not an object", async () => {
    mockWx.route({ "GET https://api.example.com/user": { statusCode: 201 } });

    await expect(callRequest({})).resolves.toMatchObject({ ok: true, res: { statusCode: 200 } });
  });

  it("should default a missing request URL and method", async () => {
    mockWx.route({ "GET https://api.example.com/user": { statusCode: 201 } });

    await expect(callRequest({ url: 123 })).resolves.toMatchObject({
      ok: true,
      res: { statusCode: 200 },
    });
  });

  it("should restore a scope after the call log was cleared", () => {
    void wx.getNetworkType({});

    const scope = mockWx.scope();

    mockWx.reset();

    expect(() => {
      scope.restore();
    }).not.toThrow();
    expect(mockWx.calls("getNetworkType")).toHaveLength(0);
  });
});

// oxlint-disable typescript/no-unsafe-return -- wxAny helpers are loosely typed
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockWx, wx } from "../src/index.js";
import type { MockInjectedTask } from "../src/instrument.js";

interface RequestResult {
  data?: unknown;
  errMsg?: string;
  statusCode?: number;
}

const callRequest = (option: {
  method?: string;
  url: string;
}): Promise<{ ok: boolean; res: RequestResult }> =>
  new Promise((resolve) => {
    wx.request({
      ...option,
      fail: (res: RequestResult): void => resolve({ ok: false, res }),
      success: (res: RequestResult): void => resolve({ ok: true, res }),
    });
  });

const tick = (delay = 0): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delay);
  });

const wxAny = wx as unknown as Record<string, (...args: any[]) => any>;

describe("instrumentation edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset injected rules after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should reject promise-style calls for a callback API without callbacks", async () => {
    mockWx.failNext("getNetworkType", { type: "network" });

    await expect(wxAny.getNetworkType()).rejects.toMatchObject({
      errMsg: "getNetworkType:fail",
    });
  });

  it("should wrap a plain response for a callback API without callbacks", async () => {
    mockWx.respond("getNetworkType", { networkType: "5g" });

    await expect(wxAny.getNetworkType()).resolves.toStrictEqual({ networkType: "5g" });
  });

  it("should return an async responder promise for a callback API without callbacks", async () => {
    mockWx.respond("getNetworkType", () => Promise.resolve({ networkType: "3g" }));

    await expect(wxAny.getNetworkType()).resolves.toStrictEqual({ networkType: "3g" });
  });

  it("should reject async responders for sync / manager APIs", () => {
    mockWx.respond("getWindowInfo", () => Promise.resolve({ windowWidth: 1 }));

    expect(() => wxAny.getWindowInfo()).toThrow(/must be synchronous/u);

    mockWx.respond("getUpdateManager", () => Promise.resolve({}));

    expect(() => wxAny.getUpdateManager()).toThrow(/must be synchronous/u);
  });

  it("should deliver a primitive request response", async () => {
    mockWx.respond("request", "raw");

    await expect(callRequest({ url: "https://example.com/api" })).resolves.toMatchObject({
      ok: true,
    });
  });

  it("should deliver an async request responder", async () => {
    mockWx.respond("request", () => Promise.resolve({ data: { ok: true }, statusCode: 202 }));

    await expect(callRequest({ url: "https://example.com/api" })).resolves.toMatchObject({
      ok: true,
      res: { data: { ok: true }, statusCode: 202 },
    });
  });

  it("should fall back to an empty response when an async request responder rejects", async () => {
    mockWx.respond("request", () => Promise.reject(new Error("boom")));

    await expect(callRequest({ url: "https://example.com/api" })).resolves.toMatchObject({
      ok: true,
      res: { data: {}, statusCode: 200 },
    });
  });

  it("should deliver an async task responder", async () => {
    mockWx.respond("downloadFile", () => Promise.resolve({ tempFilePath: "mock://tmp/a" }));

    const result = await new Promise<{ tempFilePath?: string }>((resolve) => {
      void wx.downloadFile({
        success: (res: { tempFilePath?: string }): void => resolve(res),
        url: "https://example.com/file",
      });
    });

    expect(result.tempFilePath).toBe("mock://tmp/a");
  });

  it("should cancel a delayed task response through abort", async () => {
    mockWx.respond("downloadFile", { delay: 10, tempFilePath: "mock://tmp/a" });

    const success = vi.fn<(result: unknown) => void>();
    const task = wx.downloadFile({
      success,
      url: "https://example.com/file",
    }) as unknown as MockInjectedTask;

    task.abort();

    await tick(20);

    expect(success).not.toHaveBeenCalled();
  });

  it("should cancel an injected task failure through abort", async () => {
    mockWx.failNext("downloadFile", { type: "network" });

    const fail = vi.fn<(result: { errMsg: string }) => void>();
    const task = wx.downloadFile({
      fail,
      url: "https://example.com/file",
    }) as unknown as MockInjectedTask;
    const progress = vi.fn<(result: unknown) => void>();

    task.onProgressUpdate(progress);
    task.offProgressUpdate(progress);
    task.offProgressUpdate();
    task.onHeadersReceived(progress);
    task.offHeadersReceived();
    task.onChunkReceived(progress);
    task.offChunkReceived();
    task.onMessage(progress);
    task.offMessage();
    task.onOpen(progress);
    task.offOpen();
    task.onClose(progress);
    task.offClose();
    task.onError(progress);
    task.offError();
    task.close();
    task.send();

    task.abort();
    task.abort();

    await tick();

    expect(fail).toHaveBeenCalledWith({ errMsg: "downloadFile:fail abort" });
  });
});

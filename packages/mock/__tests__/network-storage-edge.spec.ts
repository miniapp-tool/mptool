import { afterEach, describe, expect, it, vi } from "vitest";

import { mockWx, wx } from "../src/index.js";
import { createRequestTask, networkApi } from "../src/network.js";
import { emitEvent } from "../src/ui.js";

interface SocketTaskLike {
  close: (option?: Record<string, unknown>) => void;
  offClose: () => void;
  offError: () => void;
  offMessage: () => void;
  offOpen: () => void;
  onClose: () => void;
  onError: () => void;
  onMessage: () => void;
  onOpen: () => void;
  send: (option?: Record<string, unknown>) => void;
}

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("network edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset event listeners and rules after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should ignore succeed / fail after the request settled", () => {
    const success = vi.fn<(result: unknown) => void>();
    const fail = vi.fn<(result: unknown) => void>();
    const complete = vi.fn<(result: unknown) => void>();
    const controller = createRequestTask({ complete, fail, success });

    controller.succeed();
    controller.succeed();
    controller.fail("late failure");

    expect(success).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(fail).not.toHaveBeenCalled();
  });

  it("should ignore fail after the request settled", () => {
    const fail = vi.fn<(result: unknown) => void>();
    const controller = createRequestTask({ fail });

    controller.fail("first");
    controller.fail("second");

    expect(fail).toHaveBeenCalledTimes(1);
    expect(fail).toHaveBeenCalledWith({ errMsg: "first" });
  });

  it("should add and remove chunk / header listeners", () => {
    const controller = createRequestTask({});
    const chunk = vi.fn<(result: unknown) => void>();
    const headers = vi.fn<(result: unknown) => void>();

    controller.task.onChunkReceived(chunk);
    controller.task.offChunkReceived(chunk);
    controller.task.offChunkReceived();
    controller.task.onHeadersReceived(headers);
    controller.task.offHeadersReceived();
    controller.succeed();

    expect(chunk).not.toHaveBeenCalled();
    expect(headers).not.toHaveBeenCalled();
  });

  it("should fail a request called without an option object", async () => {
    const wxAny = wx as unknown as Record<string, (...args: any[]) => any>;
    const task = wxAny.request() as { abort: () => void };

    expect(task.abort).toBeTypeOf("function");

    await tick();
  });

  it("should resolve uploadFile without an option object", async () => {
    await expect((wx.uploadFile as () => Promise<unknown>)()).resolves.toStrictEqual({
      data: "",
      header: {},
      statusCode: 200,
    });
  });

  it("should expose every upload task method", () => {
    const task = wx.uploadFile({
      filePath: "a.txt",
      name: "file",
      success: () => {},
      url: "https://example.com/upload",
    }) as {
      abort: () => void;
      offHeadersReceived: () => void;
      offProgressUpdate: () => void;
      onHeadersReceived: () => void;
      onProgressUpdate: () => void;
    };

    expect(() => {
      task.onProgressUpdate();
      task.offProgressUpdate();
      task.onHeadersReceived();
      task.offHeadersReceived();
      task.abort();
    }).not.toThrow();
  });

  it("should call complete when uploadFile has no success callback", async () => {
    const complete = vi.fn<(result: { errMsg: string }) => void>();

    await new Promise<void>((resolve) => {
      wx.uploadFile({
        complete: (result: { errMsg: string }): void => {
          complete(result);
          resolve();
        },
        filePath: "a.txt",
        name: "file",
        url: "https://example.com/upload",
      });

      expect(complete).not.toHaveBeenCalled();
    });

    expect(complete).toHaveBeenCalledWith({ errMsg: "uploadFile:ok" });
  });

  it("should settle socket send / close callbacks", async () => {
    const task = networkApi.connectSocket({}) as SocketTaskLike;
    const sendSuccess = vi.fn<() => void>();
    const sendComplete = vi.fn<() => void>();
    const closeSuccess = vi.fn<() => void>();
    const closeComplete = vi.fn<() => void>();

    task.send({ complete: sendComplete, success: sendSuccess });
    task.close({ complete: closeComplete, success: closeSuccess });

    await tick();

    expect(sendSuccess).toHaveBeenCalledTimes(1);
    expect(sendComplete).toHaveBeenCalledTimes(1);
    expect(closeSuccess).toHaveBeenCalledTimes(1);
    expect(closeComplete).toHaveBeenCalledTimes(1);

    // Option-less calls and the no-op listeners keep the task shape usable.
    expect(() => {
      task.send();
      task.close();
      task.onOpen();
      task.onClose();
      task.onError();
      task.onMessage();
      task.offOpen();
      task.offClose();
      task.offError();
      task.offMessage();
    }).not.toThrow();
  });

  it("should register and remove every socket event", () => {
    const open = vi.fn<(result: unknown) => void>();
    const error = vi.fn<(result: unknown) => void>();
    const message = vi.fn<(result: unknown) => void>();
    const close = vi.fn<(result: unknown) => void>();

    networkApi.onSocketOpen(open);
    networkApi.onSocketError(error);
    networkApi.onSocketMessage(message);
    networkApi.onSocketClose(close);

    emitEvent("socketOpen", { header: {} });
    emitEvent("socketError", { errMsg: "boom" });
    emitEvent("socketMessage", { data: "hi" });
    emitEvent("socketClose", { code: 1000, reason: "" });

    expect(open).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(message).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);

    networkApi.offSocketOpen(open);
    networkApi.offSocketError();
    networkApi.offSocketMessage(message);
    networkApi.offSocketClose();

    emitEvent("socketOpen", { header: {} });
    emitEvent("socketError", { errMsg: "again" });
    emitEvent("socketMessage", { data: "bye" });
    emitEvent("socketClose", { code: 1001, reason: "" });

    expect(open).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(message).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("storage edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset storage and presets after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should deliver batchGetStorage failures through callbacks", async () => {
    mockWx.storage({ batchMissingKey: "fail" });

    const fail = vi.fn<(result: { errMsg: string }) => void>();
    const complete = vi.fn<(result: { errMsg: string }) => void>();

    await new Promise<void>((resolve) => {
      wx.batchGetStorage({
        complete: (result: { errMsg: string }): void => {
          complete(result);
          resolve();
        },
        fail,
        keyList: ["missing"],
      });
    });

    expect(fail).toHaveBeenCalledWith({ errMsg: "batchGetStorage:fail data not found" });
    expect(complete).toHaveBeenCalledWith({ errMsg: "batchGetStorage:fail data not found" });
  });

  it("should resolve a missing key for callback-style getStorage", async () => {
    mockWx.storage({ missingKey: "resolve" });

    const result = await new Promise<{ data?: unknown; errMsg: string }>((resolve) => {
      wx.getStorage({
        key: "missing",
        success: (res: { data?: unknown; errMsg: string }): void => resolve(res),
      });
    });

    expect(result).toStrictEqual({ data: undefined, errMsg: "getStorage:ok" });
  });

  it("should keep the legacy empty errMsg for callback-style getStorage", async () => {
    mockWx.compat({ storageResolveMissingKey: true });

    const result = await new Promise<{ data?: unknown; errMsg: string }>((resolve) => {
      wx.getStorage({
        key: "missing",
        success: (res: { data?: unknown; errMsg: string }): void => resolve(res),
      });
    });

    expect(result).toStrictEqual({ data: undefined, errMsg: "" });
  });

  it("should fall back to the generic storage error message", async () => {
    const key = {
      toString(): string {
        throw new Error("plain failure");
      },
    };

    await expect(wx.setStorage({ data: "x", key: key as never })).rejects.toStrictEqual({
      errMsg: "storage:fail",
    });
  });
});

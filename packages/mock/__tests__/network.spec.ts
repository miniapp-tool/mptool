import { describe, expect, it, vi } from "vitest";

import { emitEvent, wx } from "../src/index.js";

describe("request mock", () => {
  it("should return a RequestTask instead of a promise", () => {
    const task = wx.request({ url: "https://example.com/api" });

    expect(task).not.toBeInstanceOf(Promise);
    expect(task.abort).toBeTypeOf("function");
    expect(task.onHeadersReceived).toBeTypeOf("function");
    expect(task.offHeadersReceived).toBeTypeOf("function");
    expect(task.onChunkReceived).toBeTypeOf("function");
    expect(task.offChunkReceived).toBeTypeOf("function");
  });

  it("should call success with the mocked response", () =>
    new Promise<void>((resolve) => {
      wx.request({
        url: "https://example.com/api",
        success: (res: {
          statusCode: number;
          data: unknown;
          header: Record<string, string>;
          cookies: string[];
        }): void => {
          expect(res.statusCode).toBe(200);
          expect(res.data).toStrictEqual({});
          expect(res.header).toStrictEqual({});
          expect(res.cookies).toStrictEqual([]);
          resolve();
        },
      });
    }));

  it("should call success and complete callbacks", () =>
    new Promise<void>((resolve) => {
      let successCalled = false;

      wx.request({
        url: "https://example.com/api",
        success: (): void => {
          successCalled = true;
        },
        complete: (res: { errMsg: string }): void => {
          expect(successCalled).toBe(true);
          expect(res.errMsg).toBe("request:ok");
          resolve();
        },
      });
    }));

  it("should notify headersReceived listeners before success", () =>
    new Promise<void>((resolve) => {
      const order: string[] = [];
      const task = wx.request({
        url: "https://example.com/api",
        success: (): void => {
          order.push("success");
        },
        complete: (): void => {
          expect(order).toStrictEqual(["headersReceived", "success"]);
          resolve();
        },
      });

      task.onHeadersReceived(({ header, statusCode, cookies }): void => {
        order.push("headersReceived");
        expect(header).toStrictEqual({});
        expect(statusCode).toBe(200);
        expect(cookies).toStrictEqual([]);
      });
    }));

  it("should remove headersReceived listeners", () =>
    new Promise<void>((resolve) => {
      const listener = vi.fn<(result: unknown) => void>();
      const task = wx.request({
        url: "https://example.com/api",
        success: (): void => resolve(),
      });

      task.onHeadersReceived(listener);
      task.offHeadersReceived(listener);
    }));

  it("should abort an in-flight request", () =>
    new Promise<void>((resolve) => {
      const success = vi.fn<() => void>();
      const fail = vi.fn<(res: { errMsg: string }) => void>();

      const task = wx.request({
        url: "https://example.com/api",
        success,
        fail,
      });

      task.abort();

      setTimeout(() => {
        expect(success).not.toHaveBeenCalled();
        expect(fail).toHaveBeenCalledTimes(1);
        expect(fail).toHaveBeenCalledWith({ errMsg: "request:fail abort" });
        resolve();
      }, 5);
    }));

  it("should ignore repeated abort calls", () =>
    new Promise<void>((resolve) => {
      const fail = vi.fn<(res: { errMsg: string }) => void>();
      const task = wx.request({ url: "https://example.com/api", fail });

      task.abort();
      task.abort();

      setTimeout(() => {
        expect(fail).toHaveBeenCalledTimes(1);
        resolve();
      }, 5);
    }));

  it("should not fail when aborting a finished request", () =>
    new Promise<void>((resolve) => {
      const fail = vi.fn<(res: { errMsg: string }) => void>();
      const task = wx.request({
        url: "https://example.com/api",
        fail,
        success: (): void => {
          task.abort();

          setTimeout(() => {
            expect(fail).not.toHaveBeenCalled();
            resolve();
          }, 5);
        },
      });
    }));
});

describe("downloadFile mock", () => {
  it("should resolve a promise without callbacks", async () => {
    const res = (await wx.downloadFile({ url: "https://example.com/file" })) as {
      statusCode: number;
      tempFilePath: string;
    };

    expect(res.statusCode).toBe(200);
  });

  it("should call success callback", () =>
    new Promise<void>((resolve) => {
      void wx.downloadFile({
        url: "https://example.com/file",
        success: (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.tempFilePath).toBeTypeOf("string");
          resolve();
        },
      });
    }));

  it("should return filePath when filePath is provided", () =>
    new Promise<void>((resolve) => {
      void wx.downloadFile({
        url: "https://example.com/file",
        filePath: "wxfile://saved/file.bin",
        success: (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.filePath).toBe("wxfile://saved/file.bin");
          expect(res.tempFilePath).toBeUndefined();
          resolve();
        },
      });
    }));

  it("should return a download task when callbacks are provided", () => {
    const task = wx.downloadFile({
      url: "https://example.com/file",
      success: () => {},
    }) as {
      onProgressUpdate: (cb: (result: { progress: number }) => void) => void;
    };

    expect(task.onProgressUpdate).toBeTypeOf("function");
  });
});

describe("uploadFile mock", () => {
  it("should resolve a promise without callbacks", async () => {
    const res = (await wx.uploadFile({
      url: "https://example.com/upload",
      filePath: "a.txt",
      name: "file",
    })) as {
      statusCode: number;
      data: string;
    };

    expect(res.statusCode).toBe(200);
    expect(res.data).toBe("");
  });

  it("should call success callback", () =>
    new Promise<void>((resolve) => {
      void wx.uploadFile({
        url: "https://example.com/upload",
        filePath: "a.txt",
        name: "file",
        success: (res: { statusCode: number }): void => {
          expect(res.statusCode).toBe(200);
          resolve();
        },
      });
    }));

  it("should return an upload task when callbacks are provided", () => {
    const task = wx.uploadFile({
      url: "https://example.com/upload",
      filePath: "a.txt",
      name: "file",
      success: () => {},
    }) as {
      onProgressUpdate: (cb: (result: { progress: number }) => void) => void;
      abort: () => void;
    };

    expect(task.onProgressUpdate).toBeTypeOf("function");
    expect(task.abort).toBeTypeOf("function");
  });
});

describe("socket mock", () => {
  it("connectSocket should return a socket task", () => {
    const task = wx.connectSocket({ url: "wss://example.com" }) as {
      send: (option?: { data?: string }) => void;
      close: (option?: { code?: number }) => void;
      onOpen: (cb: () => void) => void;
    };

    expect(task.send).toBeTypeOf("function");
    expect(task.close).toBeTypeOf("function");
    expect(task.onOpen).toBeTypeOf("function");

    expect(() => task.send({ data: "hi" })).not.toThrow();
    expect(() => task.close()).not.toThrow();
  });

  it("onSocketMessage should register and offSocketMessage should remove listener", () => {
    const listener = vi.fn<(result: { data: string | ArrayBuffer }) => void>();

    wx.onSocketMessage(listener);
    emitEvent("socketMessage", { data: "hi" });
    expect(listener).toHaveBeenCalledWith({ data: "hi" });

    wx.offSocketMessage(listener);
    emitEvent("socketMessage", { data: "bye" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("sendSocketMessage and closeSocket should resolve", async () => {
    await expect(wx.sendSocketMessage({ data: "hi" })).resolves.toStrictEqual({
      errMsg: "sendSocketMessage:ok",
    });
    await expect(wx.closeSocket({})).resolves.toStrictEqual({ errMsg: "closeSocket:ok" });
  });

  it("onSocketOpen and onSocketClose should register listeners", () => {
    const open = vi.fn<(result: { header: Record<string, string> }) => void>();
    const close = vi.fn<(result: { code: number; reason: string }) => void>();

    wx.onSocketOpen(open);
    wx.onSocketClose(close);
    emitEvent("socketOpen", { header: {} });
    emitEvent("socketClose", { code: 1000, reason: "" });

    expect(open).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

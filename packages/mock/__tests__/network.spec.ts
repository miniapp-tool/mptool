import { describe, expect, it } from "vitest";

import { wx } from "../src/index.js";

describe("request mock", () => {
  it("should resolve a successful response", async () => {
    const res = (await wx.request({ url: "https://example.com/api" })) as {
      statusCode: number;
      data: unknown;
      header: Record<string, string>;
      cookies: string[];
    };

    expect(res.statusCode).toBe(200);
    expect(res.data).toStrictEqual({});
    expect(res.header).toStrictEqual({});
    expect(res.cookies).toStrictEqual([]);
  });

  it("should call success and complete callbacks", () =>
    new Promise<void>((resolve) => {
      void wx.request({
        url: "https://example.com/api",
        success: (res: { statusCode: number }): void => {
          expect(res.statusCode).toBe(200);
        },
        complete: (res: { errMsg: string }): void => {
          expect(res.errMsg).toBe("request:ok");
          resolve();
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

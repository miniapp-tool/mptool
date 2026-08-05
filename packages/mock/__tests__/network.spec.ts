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

import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { download } from "../src/index.js";

describe(download, () => {
  it("should resolve a temp file path", async () => {
    const path = await download("https://example.com/file.png");

    expect(path).toBeDefined();
  });

  it("should reject when download fails", async () => {
    const mockDownloadFile = wx as unknown as {
      downloadFile: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockDownloadFile.downloadFile = (option): void => {
      option.fail?.({ errMsg: "download fail" });
    };

    await expect(download("https://example.com/file.png")).rejects.toThrow("download fail");
  });

  it("should reject with status code on non-200 response", async () => {
    const titles: string[] = [];
    const mockShowToastApi = wx as unknown as {
      showToast: (option: { title: string }) => void;
    };

    mockShowToastApi.showToast = (option): void => {
      titles.push(option.title);
    };
    const mockDownloadFile = wx as unknown as {
      downloadFile: (option: {
        success?: (result: { statusCode: number; tempFilePath: string }) => void;
      }) => void;
    };

    mockDownloadFile.downloadFile = (option): void => {
      option.success?.({ statusCode: 404, tempFilePath: "" });
    };

    await expect(download("https://example.com/file.png")).rejects.toThrow("statusCode: 404");

    expect(titles).toStrictEqual(["下载失败"]);
  });

  it("should resolve the downloaded temp file path", async () => {
    const mockDownloadFile = wx as unknown as {
      downloadFile: (option: {
        success?: (result: { statusCode: number; tempFilePath: string }) => void;
      }) => void;
    };

    mockDownloadFile.downloadFile = (option): void => {
      option.success?.({ statusCode: 200, tempFilePath: "mock://temp/file.png" });
    };

    await expect(download("https://example.com/file.png")).resolves.toBe("mock://temp/file.png");
  });
});

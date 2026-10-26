import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { download } from "../src/index.js";

describe(download, () => {
  it("should resolve a temp file path", async () => {
    const path = await download("https://example.com/file.png");

    expect(path).toBeDefined();
  });

  it("should reject when download fails without showing UI", async () => {
    const titles: string[] = [];
    const mockShowToastApi = wx as unknown as {
      showToast: (option: { title: string }) => void;
    };

    mockShowToastApi.showToast = (option): void => {
      titles.push(option.title);
    };
    const mockDownloadFile = wx as unknown as {
      downloadFile: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockDownloadFile.downloadFile = (option): void => {
      option.fail?.({ errMsg: "download fail" });
    };

    await expect(download("https://example.com/file.png")).rejects.toThrow("download fail");

    expect(titles).toStrictEqual([]);
  });

  it("should reject with status code on non-200 response without showing UI", async () => {
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

    expect(titles).toStrictEqual([]);
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

  it("should show download progress and forward the mask option", async () => {
    const loading: { title: string; mask: boolean }[] = [];
    const mockShowLoadingApi = wx as unknown as {
      showLoading: (option: { title: string; mask?: boolean }) => void;
    };

    mockShowLoadingApi.showLoading = (option): void => {
      loading.push({ title: option.title, mask: Boolean(option.mask) });
    };
    const mockDownloadFileApi = wx as unknown as {
      downloadFile: (option: {
        success?: (result: { statusCode: number; tempFilePath: string }) => void;
      }) => {
        onProgressUpdate: (callback: (result: { progress: number }) => void) => void;
      };
    };

    mockDownloadFileApi.downloadFile = (
      option,
    ): {
      onProgressUpdate: (callback: (result: { progress: number }) => void) => void;
    } => {
      option.success?.({ statusCode: 200, tempFilePath: "mock://temp/file.png" });

      return {
        // oxlint-disable-next-line promise/prefer-await-to-callbacks -- the wx download task exposes a callback API
        onProgressUpdate: (callback): void => {
          // oxlint-disable-next-line promise/prefer-await-to-callbacks -- forward the progress to the registered listener
          callback({ progress: 42.4 });
        },
      };
    };

    await expect(download("https://example.com/file.png", true)).resolves.toBe(
      "mock://temp/file.png",
    );

    expect(loading).toStrictEqual([{ title: "下载中...42%", mask: true }]);
  });
});

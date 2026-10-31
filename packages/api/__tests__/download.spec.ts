import { mockWx as mockWxControl } from "@mptool/mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { download } from "../src/index.js";

interface MockDownloadTask {
  success?: (result: { statusCode: number; tempFilePath: string }) => void;
  fail?: (result: { errMsg: string }) => void;
  progress?: (result: { progress: number }) => void;
}

/**
 * Replace `wx.downloadFile` with a task whose callbacks the test drives.
 *
 * @returns The recorded task callbacks
 */
const mockDownloadTask = (): MockDownloadTask => {
  const task: MockDownloadTask = {};

  (
    wx as unknown as {
      downloadFile: (option: {
        success?: (result: { statusCode: number; tempFilePath: string }) => void;
        fail?: (result: { errMsg: string }) => void;
      }) => { onProgressUpdate: (callback: (result: { progress: number }) => void) => void };
    }
  ).downloadFile = (
    option,
  ): {
    onProgressUpdate: (callback: (result: { progress: number }) => void) => void;
  } => {
    task.success = option.success;
    task.fail = option.fail;

    return {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks -- the wx download task exposes a callback API
      onProgressUpdate: (callback): void => {
        task.progress = callback;
      },
    };
  };

  return task;
};

const mockShowToast = (): string[] => {
  const titles: string[] = [];

  (wx as unknown as { showToast: (option: { title: string }) => void }).showToast = (
    option,
  ): void => {
    titles.push(option.title);
  };

  return titles;
};

const mockLoading = (): string[] => {
  const calls: string[] = [];
  const mockWx = wx as unknown as {
    showLoading: (option: { title: string; mask?: boolean }) => void;
    hideLoading: () => void;
  };

  mockWx.showLoading = (): void => {
    calls.push("show");
  };
  mockWx.hideLoading = (): void => {
    calls.push("hide");
  };

  return calls;
};

describe(download, () => {
  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    mockWxControl.reset();
  });

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWxControl.reset();
  });

  it("should resolve a temp file path", async () => {
    const path = await download("https://example.com/file.png");

    expect(path).toBeDefined();
  });

  it("should reject when download fails without showing UI", async () => {
    const titles = mockShowToast();
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png");

    task.fail?.({ errMsg: "download fail" });

    await expect(promise).rejects.toThrow("download fail");

    expect(titles).toStrictEqual([]);
  });

  it("should reject with status code on non-200 response without showing UI", async () => {
    const titles = mockShowToast();
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png");

    task.success?.({ statusCode: 404, tempFilePath: "" });

    await expect(promise).rejects.toThrow("statusCode: 404");

    expect(titles).toStrictEqual([]);
  });

  it("should resolve the downloaded temp file path", async () => {
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png");

    task.success?.({ statusCode: 200, tempFilePath: "mock://temp/file.png" });

    await expect(promise).resolves.toBe("mock://temp/file.png");
  });

  it("should show download progress and forward the mask option", async () => {
    const loading: { title: string; mask: boolean }[] = [];

    (
      wx as unknown as {
        showLoading: (option: { title: string; mask?: boolean }) => void;
      }
    ).showLoading = (option): void => {
      loading.push({ title: option.title, mask: Boolean(option.mask) });
    };
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png", true);

    task.progress?.({ progress: 42.4 });
    task.success?.({ statusCode: 200, tempFilePath: "mock://temp/file.png" });

    await expect(promise).resolves.toBe("mock://temp/file.png");

    expect(loading).toStrictEqual([{ title: "下载中...42%", mask: true }]);
  });

  it("should not hide a loading it did not show on success", async () => {
    const hideLoading = vi.fn<() => void>();

    (wx as unknown as { hideLoading: () => void }).hideLoading = hideLoading;
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png");

    task.success?.({ statusCode: 200, tempFilePath: "mock://temp/file.png" });

    await expect(promise).resolves.toBe("mock://temp/file.png");

    expect(hideLoading).not.toHaveBeenCalled();
  });

  it("should not hide a loading it did not show on failure", async () => {
    const hideLoading = vi.fn<() => void>();

    (wx as unknown as { hideLoading: () => void }).hideLoading = hideLoading;
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png");

    task.fail?.({ errMsg: "download fail" });

    await expect(promise).rejects.toThrow("download fail");

    expect(hideLoading).not.toHaveBeenCalled();
  });

  it("should hide the loading it showed after a successful download", async () => {
    const calls = mockLoading();
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png");

    task.progress?.({ progress: 50 });
    task.success?.({ statusCode: 200, tempFilePath: "mock://temp/file.png" });

    await expect(promise).resolves.toBe("mock://temp/file.png");

    expect(calls).toStrictEqual(["show", "hide"]);
  });

  it("should only show a loading for in-flight progress values", async () => {
    const calls = mockLoading();
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png");

    // The first and last percent are not worth a loading, and a late progress callback after the
    // request settled must not open a loading that nobody hides anymore.
    task.progress?.({ progress: 1 });
    task.progress?.({ progress: 100 });
    task.progress?.({ progress: 50 });
    task.success?.({ statusCode: 200, tempFilePath: "mock://temp/file.png" });

    await expect(promise).resolves.toBe("mock://temp/file.png");

    task.progress?.({ progress: 60 });

    expect(calls).toStrictEqual(["show", "hide"]);
  });

  it("should hide the loading it showed after a failed download", async () => {
    const calls = mockLoading();
    const task = mockDownloadTask();
    const promise = download("https://example.com/file.png");

    task.progress?.({ progress: 10 });
    task.fail?.({ errMsg: "download fail" });

    await expect(promise).rejects.toThrow("download fail");

    expect(calls).toStrictEqual(["show", "hide"]);
  });
});

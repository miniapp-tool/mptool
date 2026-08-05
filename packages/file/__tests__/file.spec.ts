import "@mptool/mock";
import { describe, expect, it } from "vitest";

import {
  dirname,
  exists,
  isDir,
  isFile,
  ls,
  mkdir,
  readFile,
  readJSON,
  rm,
  saveFile,
  saveOnlineFile,
  unzip,
  writeFile,
  writeJSON,
} from "../src/file.js";

describe("file", () => {
  it("should not invoke wx APIs at module scope", () => {
    // 模块顶层不应再访问 wx；若仍调用 wx.getFileSystemManager，导入时即会崩溃
    expect(dirname("/a/b/c")).toBe("/a/b");
  });

  it("should be importable when wx is not defined", async () => {
    const originalWx = (globalThis as { wx?: unknown }).wx;

    delete (globalThis as { wx?: unknown }).wx;

    try {
      // @ts-expect-error: query suffix for fresh module evaluation
      const mod = (await import("../src/file.js?no-wx")) as {
        dirname: (path: string) => string;
      };

      expect(mod.dirname("/a/b")).toBe("/a");
    } finally {
      (globalThis as { wx?: unknown }).wx = originalWx;
    }
  });
});

describe("file operations", () => {
  it("should write and read a file", () => {
    writeFile("tmp/file.txt", { a: 1 });

    expect(readFile("tmp/file.txt")).toBe('{"a":1}');
  });

  it("should return undefined for missing file", () => {
    expect(readFile("tmp/missing.txt")).toBeUndefined();
  });

  it("should write and read JSON", () => {
    writeJSON("tmp/data", { b: 2 });

    expect(readJSON("tmp/data")).toStrictEqual({ b: 2 });
  });

  it("should mkdir and check existence", () => {
    mkdir("tmp/dir");

    expect(exists("tmp/dir")).toBe(true);
    expect(isDir("tmp/dir")).toBe(true);
    expect(isFile("tmp/dir")).toBe(false);
  });

  it("should list directory contents", () => {
    writeFile("tmp/dir/a.txt", "a");
    writeFile("tmp/dir/b.txt", "b");

    expect(ls("tmp/dir")).toStrictEqual(["a.txt", "b.txt"]);
  });

  it("should remove a file", () => {
    writeFile("tmp/remove.txt", "x");

    rm("tmp/remove.txt");

    expect(exists("tmp/remove.txt")).toBe(false);
  });

  it("should remove a directory recursively", () => {
    writeFile("tmp/remove-dir/a.txt", "a");

    rm("tmp/remove-dir", "dir");

    expect(exists("tmp/remove-dir")).toBe(false);
  });

  it("should unzip to target path", async () => {
    await unzip("tmp/archive.zip", "tmp/unzip");

    expect(isDir("tmp/unzip")).toBe(true);
  });

  it("should save online file", async () => {
    const path = await saveOnlineFile("https://example.com/file", "tmp/online.txt");

    expect(path).toBeDefined();
  });
});

describe("file edge cases", () => {
  it("should save a file", () => {
    saveFile("mock://temp/source", "tmp/saved.txt");

    expect(exists("tmp/saved.txt")).toBe(true);
  });

  it("should read JSON and return undefined when missing", () => {
    expect(readJSON("tmp/missing-json")).toBeUndefined();
  });

  it("should read JSON and return undefined on invalid content", () => {
    const fs = wx.getFileSystemManager();

    fs.writeFileSync(`${wx.env.USER_DATA_PATH}/tmp/bad.json`, "{invalid json");

    expect(readJSON("tmp/bad")).toBeUndefined();
  });

  it("should read binary file as ArrayBuffer", () => {
    const { buffer } = new TextEncoder().encode("data");

    writeFile("tmp/data.bin", buffer);

    const result = readFile("tmp/data.bin", "binary");

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it("should not throw when removing a missing directory", () => {
    expect(() => rm("tmp/missing-dir", "dir")).not.toThrow();
  });

  it("should remove a directory by default when it is a directory", () => {
    mkdir("tmp/default-dir");

    rm("tmp/default-dir");

    expect(exists("tmp/default-dir")).toBe(false);
  });

  it("should not throw when removing a missing file", () => {
    expect(() => rm("tmp/missing-file", "file")).not.toThrow();
  });

  it("should return empty list for a missing directory", () => {
    expect(ls("tmp/missing-ls")).toStrictEqual([]);
  });

  it("should not throw when saving to an existing path", () => {
    writeFile("tmp/exist.txt", "x");

    expect(() => saveFile("mock://temp/source", "tmp/exist.txt")).not.toThrow();
  });

  it("should reject saveOnlineFile on non-200 status", async () => {
    const mockDownloadFileApi = wx as unknown as {
      downloadFile: (option: {
        success?: (result: { statusCode: number; tempFilePath: string }) => void;
      }) => void;
    };

    mockDownloadFileApi.downloadFile = (option): void => {
      option.success?.({ statusCode: 404, tempFilePath: "" });
    };

    await expect(
      saveOnlineFile("https://example.com/file", "tmp/fail-status.txt"),
    ).rejects.toMatchObject({ code: 404 });
  });

  it("should reject saveOnlineFile when download fails", async () => {
    const mockDownloadFileApi = wx as unknown as {
      downloadFile: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockDownloadFileApi.downloadFile = (option): void => {
      option.fail?.({ errMsg: "download fail" });
    };

    await expect(
      saveOnlineFile("https://example.com/file", "tmp/fail-download.txt"),
    ).rejects.toThrow("download fail");
  });

  it("should not throw when mkdir fails on missing parent without recursion", () => {
    expect(() => mkdir("mkdir-fail-dir/x", false)).not.toThrow();
  });

  it("should reject when unzip fails", async () => {
    const fs = wx.getFileSystemManager();

    (fs as { unzip?: unknown }).unzip = (options: {
      zipFilePath: string;
      targetPath: string;
      success: () => void;
      fail?: (result: { errCode: number; errMsg: string }) => void;
    }): void => {
      options.fail?.({ errCode: 1, errMsg: "unzip fail" });
    };

    await expect(unzip("tmp/archive.zip", "tmp/unzip-fail")).rejects.toMatchObject({ code: 1 });
  });
});

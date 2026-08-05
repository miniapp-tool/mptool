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
});

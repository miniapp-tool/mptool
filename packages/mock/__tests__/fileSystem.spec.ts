import { describe, expect, it } from "vitest";

import { getFileSystemManager } from "../src/fileSystem.js";

describe(getFileSystemManager, () => {
  const fileSystem = getFileSystemManager();

  it("should write and read a file", () => {
    fileSystem.writeFileSync("fs1/file.txt", "content");

    expect(fileSystem.readFileSync("fs1/file.txt", "utf8")).toBe("content");
  });

  it("should return ArrayBuffer without encoding", () => {
    fileSystem.writeFileSync("fs2/data.bin", "data");

    const result = fileSystem.readFileSync("fs2/data.bin");

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(result as ArrayBuffer)).toBe("data");
  });

  it("should stat a file", () => {
    fileSystem.writeFileSync("fs3/file.txt", "x");

    const stats = fileSystem.statSync("fs3/file.txt");

    expect(stats.isFile()).toBe(true);
    expect(stats.isDirectory()).toBe(false);
  });

  it("should mkdir and stat a directory", () => {
    fileSystem.mkdirSync("fs4/dir", true);

    const stats = fileSystem.statSync("fs4/dir");

    expect(stats.isDirectory()).toBe(true);
    expect(stats.isFile()).toBe(false);
  });

  it("should list directory contents", () => {
    fileSystem.mkdirSync("fs5/dir", true);
    fileSystem.writeFileSync("fs5/dir/a.txt", "a");
    fileSystem.writeFileSync("fs5/dir/b.txt", "b");

    expect(fileSystem.readdirSync("fs5/dir")).toStrictEqual(["a.txt", "b.txt"]);
  });

  it("should unlink a file", () => {
    fileSystem.writeFileSync("fs6/file.txt", "x");

    fileSystem.unlinkSync("fs6/file.txt");

    expect(() => fileSystem.statSync("fs6/file.txt")).toThrow("ENOENT");
  });

  it("should rmdir recursively", () => {
    fileSystem.mkdirSync("fs7/dir", true);
    fileSystem.writeFileSync("fs7/dir/a.txt", "a");

    fileSystem.rmdirSync("fs7/dir", true);

    expect(() => fileSystem.statSync("fs7/dir/a.txt")).toThrow("ENOENT");
  });

  it("should save file and return path", () => {
    const savedPath = fileSystem.saveFileSync("mock://temp/1", "fs8/saved.txt");

    expect(savedPath).toBe("fs8/saved.txt");
    expect(fileSystem.statSync("fs8/saved.txt").isFile()).toBe(true);
  });

  it("should throw when saving to an existing file", () => {
    fileSystem.saveFileSync("mock://temp/1", "fs9/exist.txt");

    expect(() => fileSystem.saveFileSync("mock://temp/2", "fs9/exist.txt")).toThrow("EEXIST");
  });

  it("should throw ENOENT when operating on missing paths", () => {
    expect(() => fileSystem.unlinkSync("fs10/missing.txt")).toThrow("ENOENT");
    expect(() => fileSystem.rmdirSync("fs10/missing-dir")).toThrow("ENOENT");
    expect(() => fileSystem.readdirSync("fs10/missing-dir")).toThrow("ENOENT");
    expect(() => fileSystem.statSync("fs10/missing.txt")).toThrow("ENOENT");
  });
});

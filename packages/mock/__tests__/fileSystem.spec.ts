import { describe, expect, it } from "vitest";

import { getFileSystemManager } from "../src/fileSystem.js";

describe(getFileSystemManager, () => {
  const fileSystem = getFileSystemManager();

  it("should write and read a file", () => {
    fileSystem.writeFileSync("a/b.txt", "content");

    expect(fileSystem.readFileSync("a/b.txt", "utf8")).toBe("content");
  });

  it("should return ArrayBuffer without encoding", () => {
    fileSystem.writeFileSync("x/data.bin", "data");

    const result = fileSystem.readFileSync("x/data.bin");

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(result as ArrayBuffer)).toBe("data");
  });

  it("should stat a file", () => {
    const stats = fileSystem.statSync("a/b.txt");

    expect(stats.isFile()).toBe(true);
    expect(stats.isDirectory()).toBe(false);
  });

  it("should mkdir and stat a directory", () => {
    fileSystem.mkdirSync("a");
    fileSystem.mkdirSync("a/c");

    const stats = fileSystem.statSync("a/c");

    expect(stats.isDirectory()).toBe(true);
    expect(stats.isFile()).toBe(false);
  });

  it("should list directory contents", () => {
    expect(fileSystem.readdirSync("a")).toStrictEqual(["b.txt", "c"]);
  });

  it("should unlink a file", () => {
    fileSystem.unlinkSync("a/b.txt");

    expect(() => fileSystem.statSync("a/b.txt")).toThrow("ENOENT");
  });

  it("should rmdir recursively", () => {
    fileSystem.rmdirSync("a", true);

    expect(() => fileSystem.statSync("a/c")).toThrow("ENOENT");
  });

  it("should save file and return path", () => {
    const savedPath = fileSystem.saveFileSync("mock://temp/1", "tmp/saved.txt");

    expect(savedPath).toBe("tmp/saved.txt");
    expect(fileSystem.statSync("tmp/saved.txt").isFile()).toBe(true);
  });

  it("should throw when saving to an existing file", () => {
    expect(() => fileSystem.saveFileSync("mock://temp/2", "tmp/saved.txt")).toThrow("EEXIST");
  });
});

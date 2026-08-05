import { describe, expect, it } from "vitest";

import { getFileSystemManager } from "../src/fileSystem.js";

describe(getFileSystemManager, () => {
  const fileSystem = getFileSystemManager();

  it("should write and read a file", () => {
    fileSystem.writeFileSync("a/b.txt", "content");

    expect(fileSystem.readFileSync("a/b.txt")).toBe("content");
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
});

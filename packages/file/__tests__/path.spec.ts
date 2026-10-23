import "@mptool/mock";
import { describe, expect, it } from "vitest";

import {
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

const ESCAPE = /escapes the user data directory/u;

describe("user data path sandbox", () => {
  it("rejects paths that escape the user data directory", () => {
    expect(() => readFile("../secret.txt")).toThrow(ESCAPE);
    expect(() => readJSON("../secret")).toThrow(ESCAPE);
    expect(() => writeFile("../escape.txt", "x")).toThrow(ESCAPE);
    expect(() => writeJSON("../escape", { a: 1 })).toThrow(ESCAPE);
    expect(() => mkdir("../escape-dir")).toThrow(ESCAPE);
    expect(() => rm("../escape.txt")).toThrow(ESCAPE);
    expect(() => ls("../")).toThrow(ESCAPE);
    expect(() => saveFile("mock://temp/source", "../saved.txt")).toThrow(ESCAPE);
  });

  it("rejects escaping paths when downloading a file", () => {
    expect(() => saveOnlineFile("https://example.com/file", "../saved.txt")).toThrow(ESCAPE);
  });

  it("rejects escaping paths in unzip", async () => {
    await expect(unzip("../archive.zip", "target")).rejects.toThrow(ESCAPE);
    await expect(unzip("tmp/archive.zip", "../target")).rejects.toThrow(ESCAPE);
  });

  it("does not report an escaping path as missing", () => {
    expect(() => exists("../missing.txt")).toThrow(ESCAPE);
    expect(() => isFile("../missing.txt")).toThrow(ESCAPE);
    expect(() => isDir("../missing")).toThrow(ESCAPE);
  });

  it("allows .. segments that stay inside the user data directory", () => {
    mkdir("tmp/inner");

    writeFile("tmp/inner/../normalized.txt", "ok");

    expect(readFile("tmp/normalized.txt")).toBe("ok");
    expect(exists("tmp/inner/../normalized.txt")).toBe(true);
  });

  it("treats absolute-looking paths as relative to the user data directory", () => {
    writeFile("/tmp/absolute-looking.txt", "ok");

    expect(readFile("tmp/absolute-looking.txt")).toBe("ok");
  });

  it("normalizes redundant separators", () => {
    writeFile("tmp//double//slash.txt", "ok");

    expect(readFile("tmp/double/slash.txt")).toBe("ok");
  });
});

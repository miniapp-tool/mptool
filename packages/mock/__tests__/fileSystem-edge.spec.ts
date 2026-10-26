import { afterEach, describe, expect, it } from "vitest";

import { getFileSystemManager } from "../src/fileSystem.js";
import type { MockFileNode } from "../src/fileSystem.js";
import { mockWx } from "../src/index.js";

interface CallbackOption<T> {
  complete: (result: T) => void;
  fail: (result: T) => void;
  success: (result: T) => void;
}

const callbackResult = <T = Record<string, unknown>>(
  run: (callbacks: CallbackOption<T>) => void,
): Promise<T> =>
  new Promise((resolve) => {
    run({
      complete: (result) => {
        resolve(result);
      },
      fail: (result) => {
        resolve(result);
      },
      success: (result) => {
        resolve(result);
      },
    });
  });

describe("file system edge cases", () => {
  const fs = getFileSystemManager();

  // oxlint-disable-next-line vitest/no-hooks -- reset the in-memory file system after every case
  afterEach(() => {
    mockWx.reset();
  });

  describe("encoding errors", () => {
    it("should reject malformed hex input", () => {
      expect(() => fs.writeFileSync("hex-odd.txt", "abc", "hex")).toThrow(/Invalid argument/u);
      expect(() => fs.writeFileSync("hex-bad.txt", "zz", "hex")).toThrow(/Invalid argument/u);
    });

    it("should reject malformed base64 input", () => {
      expect(() => fs.writeFileSync("b64-short.txt", "a", "base64")).toThrow(
        /base64 encode error/u,
      );
      expect(() => fs.writeFileSync("b64-bad.txt", "!!!!", "base64")).toThrow(
        /base64 encode error/u,
      );
    });

    it("should encode a single trailing byte as base64 padding", () => {
      fs.writeFileSync("one.bin", new Uint8Array([65]) as never);

      expect(fs.readFileSync("one.bin", "base64")).toBe("QQ==");
    });

    it("should support every remaining encoding label", () => {
      fs.writeFileSync("binary.txt", "hi", "binary");
      fs.writeFileSync("ucs2.txt", "hi", "ucs2");
      fs.writeFileSync("ucs-2.txt", "hi", "ucs-2");

      expect(fs.readFileSync("binary.txt", "binary")).toBe("hi");
      expect(fs.readFileSync("ucs2.txt", "ucs2")).toBe("hi");
      expect(fs.readFileSync("ucs-2.txt", "ucs-2")).toBe("hi");
    });

    it("should coerce typed arrays and other values to bytes", () => {
      fs.writeFileSync("view.bin", new Uint8Array([1, 2, 3]).subarray(1) as never);
      fs.writeFileSync("number.txt", 42 as never);

      expect([...new Uint8Array(fs.readFileSync("view.bin") as ArrayBuffer)]).toStrictEqual([2, 3]);
      expect(fs.readFileSync("number.txt", "utf-8")).toBe("42");
    });

    it("should fall back to a generic error for values that throw while stringified", async () => {
      const data = {
        toString(): string {
          throw new Error("plain");
        },
      };

      const result = await callbackResult<{ errCode: number; errMsg: string }>((callbacks) => {
        fs.writeFile({ data: data as never, filePath: "plain.txt", ...callbacks });
      });

      expect(result).toMatchObject({ errCode: 1300005, errMsg: "Error: plain" });
    });
  });

  describe("path resolution", () => {
    it("should resolve tmp and usr schemes", () => {
      fs.mkdirSync("tmp", true);
      fs.writeFileSync("wxfile://tmp/tmp.txt", "tmp");
      fs.writeFileSync("wxfile://usr/usr.txt", "usr");

      expect(fs.readFileSync("wxfile://tmp/tmp.txt", "utf-8")).toBe("tmp");
      expect(fs.readFileSync("wxfile://usr/usr.txt", "utf-8")).toBe("usr");
      expect(() => fs.writeFileSync("wxfile://usr", "x")).toThrow(/Is a directory/u);
    });

    it("should strip a custom user-data root", () => {
      mockWx.system({ userDataPath: "custom-root" });

      fs.writeFileSync("custom-root/a.txt", "a");

      expect(fs.readFileSync("custom-root/a.txt", "utf-8")).toBe("a");
      expect(fs.readFileSync("a.txt", "utf-8")).toBe("a");
    });

    it("should treat a missing path as the root directory", () => {
      expect(() => fs.readFileSync(undefined as never)).toThrow(/illegal operation/u);
    });

    it("should expose the root through stat / readdir", () => {
      fs.writeFileSync("root-a.txt", "a");
      fs.writeFileSync("root-b.txt", "b");

      expect(fs.statSync("/")).toMatchObject({ size: 128 });
      expect(fs.readdirSync("/")).toStrictEqual(["root-a.txt", "root-b.txt"]);
      expect(fs.statSync("/", true)).toHaveLength(2);
    });
  });

  describe("sync error branches", () => {
    it("should reject a file used as a parent directory", () => {
      fs.writeFileSync("parent.txt", "x");

      expect(() => fs.writeFileSync("parent.txt/child.txt", "x")).toThrow(/not a directory/u);
    });

    it("should reject appending to a directory", () => {
      fs.mkdirSync("dir", true);

      expect(() => fs.appendFileSync("dir", "x")).toThrow(/illegal operation/u);
    });

    it("should append to a missing file", () => {
      fs.appendFileSync("appended.txt", "x");

      expect(fs.readFileSync("appended.txt", "utf-8")).toBe("x");
    });

    it("should reject a bad file descriptor", () => {
      expect(() => fs.closeSync({ fd: "missing" })).toThrow(/bad file descriptor/u);
    });

    it("should reject copying onto a directory", () => {
      fs.writeFileSync("source.txt", "x");
      fs.mkdirSync("target-dir", true);

      expect(() => fs.copyFileSync("source.txt", "target-dir")).toThrow(/illegal operation/u);
    });

    it("should ignore mkdir of the root", () => {
      expect(() => fs.mkdirSync("")).not.toThrow();
    });

    it("should reject recursive mkdir below a file", () => {
      fs.writeFileSync("blocker.txt", "x");

      expect(() => fs.mkdirSync("blocker.txt/child", true)).toThrow(/not a directory/u);
    });

    it("should validate openSync flags", () => {
      fs.mkdirSync("open-dir", true);
      fs.writeFileSync("existing.txt", "x");

      expect(() => fs.openSync({ filePath: "open-dir" })).toThrow(/illegal operation/u);
      expect(() => fs.openSync({ filePath: "existing.txt", flag: "wx" })).toThrow(
        /file already exists/u,
      );
      expect(() => fs.openSync({ filePath: "missing.txt" })).toThrow(/no such file/u);

      const created = fs.openSync({ filePath: "created.txt", flag: "w" });

      fs.closeSync({ fd: created });
      expect(fs.readFileSync("created.txt", "utf-8")).toBe("");

      const truncated = fs.openSync({ filePath: "existing.txt", flag: "w" });

      fs.closeSync({ fd: truncated });
      expect(fs.readFileSync("existing.txt", "utf-8")).toBe("");
    });

    it("should report readdir errors with the original trailing slash", () => {
      let error: unknown;

      try {
        fs.readdirSync("missing-dir/");
      } catch (err) {
        error = err;
      }

      expect(error).toMatchObject({ errCode: 1300002 });
      expect((error as Error).message).toContain("missing-dir/");
    });

    it("should reject readdir on a file", () => {
      fs.writeFileSync("not-dir.txt", "x");

      expect(() => fs.readdirSync("not-dir.txt")).toThrow(/not a directory/u);
    });

    it("should slice readFileSync by position and length", () => {
      fs.writeFileSync("slice.txt", "hello");

      expect(fs.readFileSync("slice.txt", "utf-8", 1, 2)).toBe("el");
    });

    it("should rename files and directories", () => {
      fs.mkdirSync("rename-src/nested", true);
      fs.writeFileSync("rename-src/a.txt", "a");
      fs.writeFileSync("rename-src/nested/b.txt", "b");
      fs.renameSync("rename-src", "rename-dst");

      expect(fs.readFileSync("rename-dst/a.txt", "utf-8")).toBe("a");
      expect(fs.readFileSync("rename-dst/nested/b.txt", "utf-8")).toBe("b");

      fs.writeFileSync("rename-file.txt", "f");
      fs.mkdirSync("rename-dir", true);

      expect(() => fs.renameSync("missing.txt", "x.txt")).toThrow(/no such file/u);
      expect(() => fs.renameSync("rename-file.txt", "rename-dir")).toThrow(/illegal operation/u);
    });

    it("should reject rmdir on a missing path", () => {
      expect(() => fs.rmdirSync("missing-dir")).toThrow(/no such file/u);
    });

    it("should save a temporary file under the default path", () => {
      fs.writeFileSync("temp.txt", "temp");

      const saved = fs.saveFileSync("temp.txt");

      expect(saved).toMatch(/store_/u);
      expect(fs.readFileSync(saved, "utf-8")).toBe("temp");
    });

    it("should support both truncateSync signatures", () => {
      fs.writeFileSync("truncate.txt", "hello");
      fs.truncateSync("truncate.txt", 2);
      expect(fs.readFileSync("truncate.txt", "utf-8")).toBe("he");

      fs.writeFileSync("truncate.txt", "hello");
      fs.truncateSync("truncate.txt");
      expect(fs.readFileSync("truncate.txt", "utf-8")).toBe("");

      fs.writeFileSync("truncate.txt", "hello");
      fs.truncateSync({ filePath: "truncate.txt" });
      expect(fs.readFileSync("truncate.txt", "utf-8")).toBe("");

      fs.writeFileSync("truncate.txt", "hello");
      fs.truncateSync({ filePath: "truncate.txt", length: 5 });
      expect(fs.readFileSync("truncate.txt", "utf-8")).toBe("hello");

      fs.truncateSync({ filePath: "truncate.txt", length: 3 });
      expect(fs.readFileSync("truncate.txt", "utf-8")).toBe("hel");
    });

    it("should reject invalid truncate lengths", () => {
      fs.writeFileSync("length.txt", "hello");

      expect(() => fs.truncateSync({ filePath: "length.txt", length: -1 })).toThrow(
        /Invalid argument/u,
      );
      expect(() => fs.truncateSync({ filePath: "length.txt", length: 1.5 })).toThrow(
        /Invalid argument/u,
      );
    });

    it("should enforce the maximum file size", () => {
      fs.writeFileSync("huge.txt", "x");

      expect(() =>
        fs.truncateSync({ filePath: "huge.txt", length: 100 * 1024 * 1024 + 1 }),
      ).toThrow(/maximum size/u);
    });

    it("should reject unlink on a missing file", () => {
      expect(() => fs.unlinkSync("missing.txt")).toThrow(/no such file/u);
    });

    it("should default the writeSync position and ftruncate length", () => {
      fs.writeFileSync("fd.txt", "abc");

      const fd = fs.openSync({ filePath: "fd.txt", flag: "r+" });

      fs.writeSync({ data: "Z", fd });
      expect(fs.readFileSync("fd.txt", "utf-8")).toBe("Zbc");

      fs.ftruncateSync({ fd } as never);
      expect(fs.readFileSync("fd.txt", "utf-8")).toBe("");
      fs.closeSync({ fd });
    });
  });

  describe("zip edge cases", () => {
    it("should reject invalid archives", async () => {
      fs.writeFileSync("bad.zip", "not-json");

      await expect(
        callbackResult<{ errCode: number; errMsg: string }>((callbacks) => {
          fs.readZipEntry({ entries: "all", filePath: "bad.zip", ...callbacks });
        }),
      ).resolves.toMatchObject({ errCode: 1301104 });

      fs.writeFileSync("array.zip", "[]");

      await expect(
        callbackResult<{ errCode: number; errMsg: string }>((callbacks) => {
          fs.readZipEntry({ entries: "all", filePath: "array.zip", ...callbacks });
        }),
      ).resolves.toMatchObject({ errCode: 1301104 });
    });

    it("should read selected and base64 entries", async () => {
      fs.writeFileSync(
        "archive.zip",
        JSON.stringify({ "a.txt": "a", "b.bin": { base64: "aGVsbG8=" }, "c.bin": {} }),
      );

      await expect(
        callbackResult<{ entries: Record<string, { data: string }>; errMsg: string }>(
          (callbacks) => {
            fs.readZipEntry({
              entries: [{ path: "a.txt" }, { path: "b.bin" }, { path: "c.bin" }],
              filePath: "archive.zip",
              ...callbacks,
            });
          },
        ),
      ).resolves.toMatchObject({
        entries: {
          "a.txt": { data: "a" },
          "b.bin": { data: "hello" },
          "c.bin": { data: "" },
        },
        errMsg: "readZipEntry:ok",
      });
    });

    it("should fail for a missing zip entry", async () => {
      fs.writeFileSync("archive.zip", JSON.stringify({ "a.txt": "a" }));

      await expect(
        callbackResult<{ errCode: number; errMsg: string }>((callbacks) => {
          fs.readZipEntry({
            entries: [{ path: "missing.txt" }],
            filePath: "archive.zip",
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({ errCode: 1301103 });
    });

    it("should unzip base64 entries", async () => {
      fs.writeFileSync("base64.zip", JSON.stringify({ "a.bin": { base64: "aGVsbG8=" } }));

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.unzip({ targetPath: "out", zipFilePath: "base64.zip", ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "unzip:ok" });
      expect(fs.readFileSync("out/a.bin", "utf-8")).toBe("hello");
    });

    it("should unzip an entry with no base64 payload", async () => {
      fs.writeFileSync("empty-base64.zip", JSON.stringify({ "a.bin": {} }));

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.unzip({ targetPath: "out", zipFilePath: "empty-base64.zip", ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "unzip:ok" });
      expect(fs.readFileSync("out/a.bin", "utf-8")).toBe("");
    });

    it("should reject a non-noent unzip failure", async () => {
      fs.writeFileSync("bad-unzip.zip", "not-json");

      await expect(
        callbackResult<{ errCode: number; errMsg: string }>((callbacks) => {
          fs.unzip({ targetPath: "out", zipFilePath: "bad-unzip.zip", ...callbacks });
        }),
      ).resolves.toMatchObject({ errCode: 1301104 });
    });

    it("should unzip an empty entry name into the target root", async () => {
      fs.writeFileSync("empty-entry.zip", JSON.stringify({ "": "x" }));

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.unzip({ targetPath: "/", zipFilePath: "empty-entry.zip", ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "unzip:ok" });
    });
  });

  describe("restored nodes without bytes", () => {
    const snapshot = (): Map<string, MockFileNode> =>
      new Map<string, MockFileNode>([
        ["empty.txt", { mtime: 0, type: "file" }],
        ["dir", { mtime: 0, type: "dir" }],
        ["dir/", { mtime: 0, type: "file" }],
      ]);

    it("should treat a restored file without bytes as empty", () => {
      fs.restore(snapshot());

      expect(fs.readFileSync("empty.txt", "utf-8")).toBe("");
      expect((fs.readFileSync("empty.txt") as ArrayBuffer).byteLength).toBe(0);
      expect(fs.statSync("empty.txt")).toMatchObject({ size: 0 });
      expect(
        fs.readCompressedFileSync({ compressionAlgorithm: "br", filePath: "empty.txt" }),
      ).toBeInstanceOf(ArrayBuffer);
      expect(fs.readdirSync("dir")).toStrictEqual([]);
    });

    it("should append / copy / save / truncate files restored without bytes", () => {
      fs.restore(snapshot());
      fs.appendFileSync("empty.txt", "a");
      expect(fs.readFileSync("empty.txt", "utf-8")).toBe("a");

      fs.restore(snapshot());
      fs.copyFileSync("empty.txt", "copy.txt");
      expect(fs.readFileSync("copy.txt", "utf-8")).toBe("");

      fs.restore(snapshot());
      const saved = fs.saveFileSync("empty.txt");
      expect(fs.readFileSync(saved, "utf-8")).toBe("");

      fs.restore(snapshot());
      fs.truncateSync({ filePath: "empty.txt", length: 2 });
      expect((fs.readFileSync("empty.txt") as ArrayBuffer).byteLength).toBe(2);
    });

    it("should read / write / truncate restored files through a descriptor", () => {
      fs.restore(snapshot());

      const reader = fs.openSync({ filePath: "empty.txt", flag: "r+" });

      expect(fs.readSync({ arrayBuffer: new ArrayBuffer(1), fd: reader })).toMatchObject({
        bytesRead: 0,
      });
      fs.ftruncateSync({ fd: reader, length: 0 });
      fs.closeSync({ fd: reader });

      fs.restore(snapshot());

      const writer = fs.openSync({ filePath: "empty.txt", flag: "r+" });

      expect(fs.writeSync({ data: "x", fd: writer })).toStrictEqual({ bytesWritten: 1 });
      fs.closeSync({ fd: writer });
      expect(fs.readFileSync("empty.txt", "utf-8")).toBe("x");
    });

    it("should read zip / file info from restored files without bytes", async () => {
      fs.restore(snapshot());

      await expect(
        callbackResult<{ errCode: number; errMsg: string }>((callbacks) => {
          fs.readZipEntry({ entries: "all", filePath: "empty.txt", ...callbacks });
        }),
      ).resolves.toMatchObject({ errCode: 1301104 });

      fs.restore(snapshot());

      await expect(
        callbackResult<{ digest: string; errMsg: string; size: number }>((callbacks) => {
          fs.getFileInfo({ digestAlgorithm: "md5", filePath: "empty.txt", ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "getFileInfo:ok", size: 0 });
    });
  });

  describe("async edge cases", () => {
    it("should open and write through callbacks", async () => {
      fs.writeFileSync("async-fd.txt", "abc");

      const opened = await callbackResult<{ errMsg: string; fd: string }>((callbacks) => {
        fs.open({ filePath: "async-fd.txt", flag: "r+", ...callbacks });
      });

      expect(opened.errMsg).toBe("open:ok");
      expect(opened.fd).toBeTypeOf("string");

      await expect(
        callbackResult<{ bytesWritten: number; errMsg: string }>((callbacks) => {
          fs.write({ data: "Z", fd: opened.fd, ...callbacks });
        }),
      ).resolves.toMatchObject({ bytesWritten: 1, errMsg: "write:ok" });
      expect(fs.readFileSync("async-fd.txt", "utf-8")).toBe("Zbc");
    });

    it("should omit the digest when no algorithm is requested", async () => {
      fs.writeFileSync("digest.txt", "hello");

      await expect(
        callbackResult<{ digest: string; errMsg: string }>((callbacks) => {
          fs.getFileInfo({ filePath: "digest.txt", ...callbacks });
        }),
      ).resolves.toMatchObject({ digest: "", errMsg: "getFileInfo:ok" });
    });

    it("should return recursive stats through the async API", async () => {
      fs.mkdirSync("async-stat", true);
      fs.writeFileSync("async-stat/a.txt", "a");

      const result = await callbackResult<{ errMsg: string; stats: unknown[] }>((callbacks) => {
        fs.stat({ path: "async-stat", recursive: true, ...callbacks });
      });

      expect(result.errMsg).toBe("stat:ok");
      expect(result.stats).toHaveLength(1);
    });
  });
});

import { afterEach, describe, expect, it } from "vitest";

import { getFileSystemManager } from "../src/fileSystem.js";
import { mockWx, wx } from "../src/index.js";

const USER_ROOT = wx.env.USER_DATA_PATH;

const callbackResult = <T = Record<string, unknown>>(
  run: (callbacks: {
    complete: (result: T) => void;
    fail: (result: T) => void;
    success: (result: T) => void;
  }) => void,
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

interface StatLike {
  isDirectory: () => boolean;
  isFile: () => boolean;
  lastModifiedTime: number;
  mode: number;
  size: number;
}

interface FileStatLike {
  path: string;
  stats: StatLike;
}

describe("file system manager", () => {
  const fs = getFileSystemManager();

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  it("should expose all 45 methods", () => {
    const methods = [
      "readdirSync",
      "readCompressedFileSync",
      "access",
      "accessSync",
      "appendFile",
      "appendFileSync",
      "close",
      "copyFile",
      "copyFileSync",
      "fstat",
      "ftruncate",
      "getFileInfo",
      "getSavedFileList",
      "mkdir",
      "mkdirSync",
      "open",
      "read",
      "readCompressedFile",
      "readFile",
      "readZipEntry",
      "readdir",
      "removeSavedFile",
      "rename",
      "renameSync",
      "rmdir",
      "rmdirSync",
      "saveFile",
      "stat",
      "truncate",
      "unlink",
      "unlinkSync",
      "unzip",
      "write",
      "writeFile",
      "writeFileSync",
      "readSync",
      "fstatSync",
      "statSync",
      "writeSync",
      "openSync",
      "saveFileSync",
      "readFileSync",
      "closeSync",
      "ftruncateSync",
      "truncateSync",
    ] as const;

    for (const method of methods) expect(fs[method]).toBeTypeOf("function");
    expect(methods).toHaveLength(45);
  });

  describe("encoding", () => {
    it("should read without encoding as ArrayBuffer", () => {
      fs.mkdirSync(`${USER_ROOT}/enc`, true);
      fs.writeFileSync(`${USER_ROOT}/enc/data.bin`, new Uint8Array([0, 1, 2, 255, 254]).buffer);

      const result = fs.readFileSync(`${USER_ROOT}/enc/data.bin`);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect([...new Uint8Array(result as ArrayBuffer)]).toStrictEqual([0, 1, 2, 255, 254]);
    });

    it("should read binary as a string", () => {
      fs.mkdirSync(`${USER_ROOT}/enc`, true);
      fs.writeFileSync(`${USER_ROOT}/enc/hello.txt`, "hello");

      expect(fs.readFileSync(`${USER_ROOT}/enc/hello.txt`, "binary")).toBe("hello");
    });

    it("should round-trip base64 / hex / latin1 / utf16le", () => {
      fs.mkdirSync(`${USER_ROOT}/enc`, true);

      fs.writeFileSync(`${USER_ROOT}/enc/base64.txt`, "hello");
      expect(fs.readFileSync(`${USER_ROOT}/enc/base64.txt`, "base64")).toBe("aGVsbG8=");
      fs.writeFileSync(`${USER_ROOT}/enc/base64.bin`, "aGVsbG8=", "base64");
      expect(fs.readFileSync(`${USER_ROOT}/enc/base64.bin`, "utf-8")).toBe("hello");

      fs.writeFileSync(`${USER_ROOT}/enc/hex.txt`, "hello");
      expect(fs.readFileSync(`${USER_ROOT}/enc/hex.txt`, "hex")).toBe("68656c6c6f");
      fs.writeFileSync(`${USER_ROOT}/enc/hex.bin`, "68656c6c6f", "hex");
      expect(fs.readFileSync(`${USER_ROOT}/enc/hex.bin`, "utf-8")).toBe("hello");

      fs.writeFileSync(`${USER_ROOT}/enc/latin1.txt`, "\u00E9", "latin1");
      expect(fs.readFileSync(`${USER_ROOT}/enc/latin1.txt`, "latin1")).toBe("\u00E9");

      fs.writeFileSync(`${USER_ROOT}/enc/utf16.txt`, "\u4F60\u597D", "utf16le");
      expect(fs.readFileSync(`${USER_ROOT}/enc/utf16.txt`, "utf16le")).toBe("\u4F60\u597D");
    });

    it("should fail for an unknown encoding", () => {
      fs.mkdirSync(`${USER_ROOT}/enc`, true);
      fs.writeFileSync(`${USER_ROOT}/enc/hello.txt`, "hello");

      expect(() => fs.readFileSync(`${USER_ROOT}/enc/hello.txt`, "nope")).toThrow(
        /Unknown encoding/u,
      );
    });
  });

  describe("errors", () => {
    it("should use official errCodes and messages for missing paths", () => {
      const missing = `${USER_ROOT}/e/missing.txt`;

      for (const run of [
        (): unknown => fs.statSync(missing),
        (): unknown => fs.readdirSync(`${USER_ROOT}/e/missing-dir`),
        (): unknown => fs.accessSync(missing),
        (): unknown => fs.readFileSync(missing, "utf-8"),
      ]) {
        let error: unknown;

        try {
          run();
        } catch (err) {
          error = err;
        }

        expect(error).toMatchObject({ errCode: 1300002 });
        expect((error as Error).message).toMatch(/no such file or directory|not found/u);
      }
    });

    it("should reject parent directories that do not exist", () => {
      let error: unknown;

      try {
        fs.writeFileSync(`${USER_ROOT}/no-parent/file.txt`, "x");
      } catch (err) {
        error = err;
      }

      expect(error).toMatchObject({ errCode: 1300002 });
      expect((error as Error).message).toMatch(/no such file or directory/u);
    });

    it("should reject illegal operations on directories", () => {
      fs.mkdirSync(`${USER_ROOT}/ops`, true);
      fs.writeFileSync(`${USER_ROOT}/ops/file.txt`, "x");
      fs.mkdirSync(`${USER_ROOT}/ops/dir`);

      expect(() => fs.writeFileSync(`${USER_ROOT}/ops/dir`, "x")).toThrow(/Is a directory/u);
      expect(() => fs.unlinkSync(`${USER_ROOT}/ops/dir`)).toThrow(/Is a directory/u);
      expect(() => fs.rmdirSync(`${USER_ROOT}/ops/file.txt`)).toThrow(/not a directory/u);
      expect(() => fs.readFileSync(`${USER_ROOT}/ops/dir`, "utf-8")).toThrow(
        /illegal operation on a directory/u,
      );
    });

    it("should reject non-empty rmdir without recursive", () => {
      fs.mkdirSync(`${USER_ROOT}/non-empty/dir`, true);
      fs.writeFileSync(`${USER_ROOT}/non-empty/dir/file.txt`, "x");

      expect(() => fs.rmdirSync(`${USER_ROOT}/non-empty/dir`)).toThrow(/directory not empty/u);
      expect(() => fs.rmdirSync(`${USER_ROOT}/non-empty/dir`, true)).not.toThrow();
      expect(() => fs.statSync(`${USER_ROOT}/non-empty/dir`)).toThrow(/no such file/u);
    });

    it("should reject existing paths on non-recursive mkdir", () => {
      fs.mkdirSync(`${USER_ROOT}/exists/dir`, true);

      expect(() => fs.mkdirSync(`${USER_ROOT}/exists/dir`)).toThrow(/file already exists/u);
      expect(() => fs.mkdirSync(`${USER_ROOT}/exists/dir`, true)).not.toThrow();
    });

    it("should reject paths that escape the user directory", () => {
      expect(() => fs.readFileSync("../../etc/passwd", "utf-8")).toThrow(/permission denied/u);
      expect(() => fs.readFileSync(`${USER_ROOT}/../escape.txt`, "utf-8")).toThrow(
        /permission denied/u,
      );
      expect(() => fs.statSync("..")).toThrow(/permission denied/u);
    });

    it("should normalize . and .. inside the sandbox", () => {
      fs.mkdirSync(`${USER_ROOT}/norm`, true);
      fs.writeFileSync(`${USER_ROOT}/norm/a.txt`, "a");

      expect(fs.readFileSync(`${USER_ROOT}/norm/./a.txt`, "utf-8")).toBe("a");
      expect(fs.readFileSync(`${USER_ROOT}/norm/../norm/a.txt`, "utf-8")).toBe("a");
    });
  });

  describe("stat / readdir / access", () => {
    it("should expose Stats fields", () => {
      fs.mkdirSync(`${USER_ROOT}/stat`, true);
      fs.writeFileSync(`${USER_ROOT}/stat/file.txt`, "hello");

      const stats = fs.statSync(`${USER_ROOT}/stat/file.txt`) as StatLike;

      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      expect(stats.size).toBe(5);
      expect(stats.lastModifiedTime).toBeTypeOf("number");
      expect(stats.mode).toBe(33188);

      const dirStats = fs.statSync(`${USER_ROOT}/stat`) as StatLike;

      expect(dirStats.isDirectory()).toBe(true);
      expect(dirStats.isFile()).toBe(false);
    });

    it("should list directory entries", () => {
      fs.mkdirSync(`${USER_ROOT}/ls/dir`, true);
      fs.writeFileSync(`${USER_ROOT}/ls/dir/b.txt`, "b");
      fs.writeFileSync(`${USER_ROOT}/ls/dir/a.txt`, "a");

      expect(fs.readdirSync(`${USER_ROOT}/ls/dir`)).toStrictEqual(["a.txt", "b.txt"]);
    });

    it("should return FileStats for recursive stat", () => {
      fs.mkdirSync(`${USER_ROOT}/recursive/dir`, true);
      fs.writeFileSync(`${USER_ROOT}/recursive/dir/a.txt`, "a");

      const result = fs.statSync(`${USER_ROOT}/recursive/dir`, true) as FileStatLike[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ path: expect.stringContaining("a.txt") });
      expect(result[0].stats.size).toBe(1);
    });

    it("should pass access for files and directories", () => {
      fs.mkdirSync(`${USER_ROOT}/access/dir`, true);
      fs.writeFileSync(`${USER_ROOT}/access/dir/a.txt`, "a");

      expect(() => fs.accessSync(`${USER_ROOT}/access/dir/a.txt`)).not.toThrow();
      expect(() => fs.accessSync(`${USER_ROOT}/access/dir`)).not.toThrow();
    });
  });

  describe("file operations", () => {
    it("should copy, rename, append and truncate files", () => {
      fs.mkdirSync(`${USER_ROOT}/mutate`, true);
      fs.writeFileSync(`${USER_ROOT}/mutate/a.txt`, "hello");

      fs.copyFileSync(`${USER_ROOT}/mutate/a.txt`, `${USER_ROOT}/mutate/copy.txt`);
      expect(fs.readFileSync(`${USER_ROOT}/mutate/copy.txt`, "utf-8")).toBe("hello");

      fs.renameSync(`${USER_ROOT}/mutate/copy.txt`, `${USER_ROOT}/mutate/renamed.txt`);
      expect(fs.readFileSync(`${USER_ROOT}/mutate/renamed.txt`, "utf-8")).toBe("hello");

      fs.appendFileSync(`${USER_ROOT}/mutate/a.txt`, "!");
      expect(fs.readFileSync(`${USER_ROOT}/mutate/a.txt`, "utf-8")).toBe("hello!");

      fs.truncateSync({ filePath: `${USER_ROOT}/mutate/a.txt`, length: 2 });
      expect(fs.readFileSync(`${USER_ROOT}/mutate/a.txt`, "utf-8")).toBe("he");
    });

    it("should save temporary files and reject missing sources", () => {
      fs.mkdirSync(`${USER_ROOT}/save`, true);
      fs.writeFileSync(`${USER_ROOT}/save/temp.txt`, "temp");

      const saved = fs.saveFileSync(`${USER_ROOT}/save/temp.txt`, `${USER_ROOT}/save/saved.txt`);

      expect(saved).toBe(`${USER_ROOT}/save/saved.txt`);
      expect(fs.readFileSync(`${USER_ROOT}/save/saved.txt`, "utf-8")).toBe("temp");
      expect(() =>
        fs.saveFileSync(`${USER_ROOT}/save/missing.txt`, `${USER_ROOT}/save/other.txt`),
      ).toThrow(/tempFilePath file not exist/u);
      expect(() =>
        fs.saveFileSync(`${USER_ROOT}/save/temp.txt`, `${USER_ROOT}/save/saved.txt`),
      ).toThrow(/file already exists/u);
    });

    it("should support file descriptors", () => {
      fs.mkdirSync(`${USER_ROOT}/fd`, true);
      fs.writeFileSync(`${USER_ROOT}/fd/a.txt`, "abc");

      const fd = fs.openSync({ filePath: `${USER_ROOT}/fd/a.txt`, flag: "r+" });
      const buffer = new ArrayBuffer(3);
      const read = fs.readSync({ arrayBuffer: buffer, fd });

      expect(read.bytesRead).toBe(3);
      expect(new TextDecoder().decode(buffer)).toBe("abc");

      fs.writeSync({ data: "Z", fd, position: 1 });
      expect(fs.readFileSync(`${USER_ROOT}/fd/a.txt`, "utf-8")).toBe("aZc");

      const stats = fs.fstatSync({ fd });

      expect(stats.size).toBe(3);

      fs.ftruncateSync({ fd, length: 2 });
      expect(fs.readFileSync(`${USER_ROOT}/fd/a.txt`, "utf-8")).toBe("aZ");
      fs.closeSync({ fd });
      expect(() => fs.fstatSync({ fd })).toThrow(/bad file descriptor/u);
    });
  });

  describe("async methods", () => {
    it("should read and write files through callbacks", async () => {
      fs.mkdirSync(`${USER_ROOT}/async`, true);

      const writeResult = await callbackResult<{ errMsg: string }>((callbacks) => {
        fs.writeFile({ data: "hello", filePath: `${USER_ROOT}/async/a.txt`, ...callbacks });
      });

      expect(writeResult.errMsg).toBe("writeFile:ok");

      const readResult = await callbackResult<{ data: string; errMsg: string }>((callbacks) => {
        fs.readFile({ encoding: "utf-8", filePath: `${USER_ROOT}/async/a.txt`, ...callbacks });
      });

      expect(readResult.data).toBe("hello");
      expect(readResult.errMsg).toBe("readFile:ok");

      const missingResult = await callbackResult<{ errCode: number; errMsg: string }>(
        (callbacks) => {
          fs.readFile({ filePath: `${USER_ROOT}/async/missing.txt`, ...callbacks });
        },
      );

      expect(missingResult.errMsg).toMatch(/readFile:fail/u);
      expect(missingResult.errCode).toBe(1300002);
    });

    it("should support stat / readdir / access / mkdir / rmdir / unlink callbacks", async () => {
      fs.mkdirSync(`${USER_ROOT}/async2`, true);
      fs.writeFileSync(`${USER_ROOT}/async2/a.txt`, "a");

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.stat({ path: `${USER_ROOT}/async2/a.txt`, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "stat:ok" });

      await expect(
        callbackResult<{ files: string[]; errMsg: string }>((callbacks) => {
          fs.readdir({ dirPath: `${USER_ROOT}/async2`, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "readdir:ok", files: ["a.txt"] });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.access({ path: `${USER_ROOT}/async2/a.txt`, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "access:ok" });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.mkdir({ dirPath: `${USER_ROOT}/async2/new-dir`, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "mkdir:ok" });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.rmdir({ dirPath: `${USER_ROOT}/async2/new-dir`, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "rmdir:ok" });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.unlink({ filePath: `${USER_ROOT}/async2/a.txt`, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "unlink:ok" });
    });

    it("should support copy / rename / append / truncate / getFileInfo callbacks", async () => {
      fs.mkdirSync(`${USER_ROOT}/async3`, true);
      fs.writeFileSync(`${USER_ROOT}/async3/a.txt`, "hello");

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.copyFile({
            destPath: `${USER_ROOT}/async3/copy.txt`,
            srcPath: `${USER_ROOT}/async3/a.txt`,
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({ errMsg: "copyFile:ok" });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.rename({
            newPath: `${USER_ROOT}/async3/renamed.txt`,
            oldPath: `${USER_ROOT}/async3/copy.txt`,
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({ errMsg: "rename:ok" });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.appendFile({
            data: "!",
            filePath: `${USER_ROOT}/async3/a.txt`,
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({ errMsg: "appendFile:ok" });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.truncate({
            filePath: `${USER_ROOT}/async3/a.txt`,
            length: 2,
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({ errMsg: "truncate:ok" });

      await expect(
        callbackResult<{ digest: string; errMsg: string; size: number }>((callbacks) => {
          fs.getFileInfo({
            digestAlgorithm: "md5",
            filePath: `${USER_ROOT}/async3/a.txt`,
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({ errMsg: "getFileInfo:ok", size: 2 });
    });

    it("should support fd callbacks and saved-file callbacks", async () => {
      fs.mkdirSync(`${USER_ROOT}/async4`, true);
      fs.writeFileSync(`${USER_ROOT}/async4/a.txt`, "abc");

      const fd = fs.openSync({ filePath: `${USER_ROOT}/async4/a.txt`, flag: "r" });

      await expect(
        callbackResult<{ bytesRead: number; errMsg: string }>((callbacks) => {
          fs.read({ arrayBuffer: new ArrayBuffer(3), fd, ...callbacks });
        }),
      ).resolves.toMatchObject({ bytesRead: 3, errMsg: "read:ok" });

      await expect(
        callbackResult<{ stats: { size: number }; errMsg: string }>((callbacks) => {
          fs.fstat({ fd, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "fstat:ok", stats: { size: 3 } });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.ftruncate({ fd, length: 2, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "ftruncate:ok" });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.close({ fd, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "close:ok" });

      await expect(
        callbackResult<{ fileList: unknown[]; errMsg: string }>((callbacks) => {
          fs.getSavedFileList(callbacks);
        }),
      ).resolves.toMatchObject({ errMsg: "getSavedFileList:ok" });

      fs.writeFileSync(`${USER_ROOT}/async4/saved.txt`, "saved");

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.removeSavedFile({ filePath: `${USER_ROOT}/async4/saved.txt`, ...callbacks });
        }),
      ).resolves.toMatchObject({ errMsg: "removeSavedFile:ok" });
    });

    it("should support saveFile and readCompressedFile callbacks", async () => {
      fs.mkdirSync(`${USER_ROOT}/async5`, true);
      fs.writeFileSync(`${USER_ROOT}/async5/temp.txt`, "temp");

      await expect(
        callbackResult<{ errMsg: string; savedFilePath: string }>((callbacks) => {
          fs.saveFile({
            filePath: `${USER_ROOT}/async5/saved.txt`,
            tempFilePath: `${USER_ROOT}/async5/temp.txt`,
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({
        errMsg: "saveFile:ok",
        savedFilePath: `${USER_ROOT}/async5/saved.txt`,
      });

      await expect(
        callbackResult<{ data: ArrayBuffer; errMsg: string }>((callbacks) => {
          fs.readCompressedFile({
            compressionAlgorithm: "br",
            filePath: `${USER_ROOT}/async5/temp.txt`,
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({ errMsg: "readCompressedFile:ok" });
    });
  });

  describe("zip", () => {
    const writeArchive = (entries: Record<string, string>): void => {
      fs.mkdirSync(`${USER_ROOT}/zip`, true);
      fs.writeFileSync(`${USER_ROOT}/zip/archive.zip`, JSON.stringify(entries));
    };

    it("should unzip preset entries", async () => {
      writeArchive({ "a.txt": "a", "nested/b.txt": "b" });

      await expect(
        callbackResult<{ errMsg: string }>((callbacks) => {
          fs.unzip({
            targetPath: `${USER_ROOT}/zip/out`,
            zipFilePath: `${USER_ROOT}/zip/archive.zip`,
            ...callbacks,
          });
        }),
      ).resolves.toMatchObject({ errMsg: "unzip:ok" });

      expect(fs.readFileSync(`${USER_ROOT}/zip/out/a.txt`, "utf-8")).toBe("a");
      expect(fs.readFileSync(`${USER_ROOT}/zip/out/nested/b.txt`, "utf-8")).toBe("b");
    });

    it("should fail when the zip file is missing", async () => {
      const result = await callbackResult<{ errCode: number; errMsg: string }>((callbacks) => {
        fs.unzip({
          targetPath: `${USER_ROOT}/zip/out`,
          zipFilePath: `${USER_ROOT}/zip/missing.zip`,
          ...callbacks,
        });
      });

      expect(result.errCode).toBe(1301102);
    });

    it("should reject zip-slip entries", async () => {
      writeArchive({ "../escaped.txt": "escaped" });

      const result = await callbackResult<{ errCode: number; errMsg: string }>((callbacks) => {
        fs.unzip({
          targetPath: `${USER_ROOT}/zip/out`,
          zipFilePath: `${USER_ROOT}/zip/archive.zip`,
          ...callbacks,
        });
      });

      expect(result.errCode).toBe(1300014);
      expect(() => fs.statSync(`${USER_ROOT}/zip/escaped.txt`)).toThrow(/no such file/u);
    });

    it("should read zip entries", async () => {
      writeArchive({ "a.txt": "a" });

      await expect(
        callbackResult<{ entries: Record<string, { data: string }>; errMsg: string }>(
          (callbacks) => {
            fs.readZipEntry({
              entries: "all",
              filePath: `${USER_ROOT}/zip/archive.zip`,
              ...callbacks,
            });
          },
        ),
      ).resolves.toMatchObject({
        entries: { "a.txt": { data: "a" } },
        errMsg: "readZipEntry:ok",
      });
    });
  });

  describe("snapshots", () => {
    it("should restore file contents by value", () => {
      fs.mkdirSync(`${USER_ROOT}/snap`, true);
      fs.writeFileSync(`${USER_ROOT}/snap/a.txt`, "before");

      const snapshot = fs.snapshot();

      fs.writeFileSync(`${USER_ROOT}/snap/a.txt`, "after");
      fs.writeFileSync(`${USER_ROOT}/snap/b.txt`, "new");

      fs.restore(snapshot);

      expect(fs.readFileSync(`${USER_ROOT}/snap/a.txt`, "utf-8")).toBe("before");
      expect(() => fs.statSync(`${USER_ROOT}/snap/b.txt`)).toThrow(/no such file/u);
    });
  });
});

describe("file save API mock", () => {
  const fileSystem = getFileSystemManager();

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  it("saveFile should resolve with savedFilePath", async () => {
    const res = (await wx.saveFile({ tempFilePath: "mock://temp/1" })) as {
      savedFilePath: string;
    };

    expect(res.savedFilePath).toBeTypeOf("string");
  });

  it("saveFile should keep provided filePath", async () => {
    const res = (await wx.saveFile({
      tempFilePath: "mock://temp/1",
      filePath: "wxfile://saved",
    })) as {
      savedFilePath: string;
    };

    expect(res.savedFilePath).toBe("wxfile://saved");
  });

  it("getSavedFileList should resolve with empty list", async () => {
    const res = (await wx.getSavedFileList({})) as { fileList: unknown[] };

    expect(res.fileList).toStrictEqual([]);
  });

  it("getSavedFileInfo should resolve", async () => {
    const res = (await wx.getSavedFileInfo({ filePath: "wxfile://saved" })) as {
      size: number;
      createTime: number;
    };

    expect(res.size).toBe(0);
    expect(res.createTime).toBe(0);
  });

  it("removeSavedFile should resolve", async () => {
    await expect(wx.removeSavedFile({ filePath: "wxfile://saved" })).resolves.toStrictEqual({
      errMsg: "removeSavedFile:ok",
    });
  });

  it("should not leak files between resets", () => {
    fileSystem.mkdirSync(`${USER_ROOT}/leak`, true);
    fileSystem.writeFileSync(`${USER_ROOT}/leak/a.txt`, "a");

    mockWx.reset();

    expect(() => fileSystem.statSync(`${USER_ROOT}/leak/a.txt`)).toThrow(/no such file/u);
  });
});

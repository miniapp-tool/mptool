// oxlint-disable vitest/no-commented-out-tests
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mockWx, wx } from "../src/index.js";

describe("wx mock", () => {
  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    wx.clearStorageSync();
  });

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("getStorage", () => {
    it("should fail for a non-existent key", async () => {
      await expect(wx.getStorage({ key: "nonexistent" })).rejects.toMatchObject({
        errMsg: "getStorage:fail data not found",
      });
    });

    it("should return stored value", async () => {
      wx.setStorageSync("test-key", "test-value");
      const result = await wx.getStorage({ key: "test-key" });
      expect(result.data).toBe("test-value");
      expect(result.errMsg).toBe("getStorage:ok");
    });

    it("should work with callback style", () =>
      new Promise<void>((resolve) => {
        wx.setStorageSync("callback-key", { foo: "bar" });
        wx.getStorage({
          key: "callback-key",
          success: (res) => {
            expect(res.data).toStrictEqual({ foo: "bar" });
            expect(res.errMsg).toBe("getStorage:ok");
            resolve();
          },
        });
      }));

    it("should call fail and complete for a missing key", () =>
      new Promise<void>((resolve) => {
        wx.getStorage({
          key: "missing-callback-key",
          fail: (res) => {
            expect(res.errMsg).toBe("getStorage:fail data not found");
          },
          complete: (res) => {
            expect(res.errMsg).toBe("getStorage:fail data not found");
            resolve();
          },
        });
      }));

    it("should call complete after success", () =>
      new Promise<void>((resolve) => {
        wx.setStorageSync("complete-key", "value");
        let successCalled = false;
        wx.getStorage({
          key: "complete-key",
          success: () => {
            successCalled = true;
          },
          complete: (res) => {
            expect(successCalled).toBe(true);
            expect(res.errMsg).toBe("getStorage:ok");
            resolve();
          },
        });
      }));

    it("should return promise without callbacks", async () => {
      wx.setStorageSync("promise-key", 12345);
      const result = await wx.getStorage({ key: "promise-key" });
      expect(result.data).toBe(12345);
    });

    it("should keep the old missing-key behaviour with the compat flag", async () => {
      mockWx.compat({ storageResolveMissingKey: true });

      const result = await wx.getStorage({ key: "nonexistent" });

      expect(result.data).toBeUndefined();
      expect(result.errMsg).toBe("");
    });

    it("should support MockStorageOptions.missingKey", async () => {
      mockWx.storage({ missingKey: "resolve" });

      const result = await wx.getStorage({ key: "nonexistent" });

      expect(result.data).toBeUndefined();
      expect(result.errMsg).toBe("getStorage:ok");
    });
  });

  describe("getStorageSync", () => {
    it("should return an empty string for a non-existent key", () => {
      expect(wx.getStorageSync("nonexistent")).toBe("");
    });

    it("should return stored string value", () => {
      wx.setStorageSync("sync-string", "hello");
      expect(wx.getStorageSync("sync-string")).toBe("hello");
    });

    it("should return stored object value", () => {
      wx.setStorageSync("sync-object", { foo: "bar" });
      expect(wx.getStorageSync("sync-object")).toStrictEqual({ foo: "bar" });
    });

    it("should return stored array value", () => {
      wx.setStorageSync("sync-array", [1, 2, 3]);
      expect(wx.getStorageSync("sync-array")).toStrictEqual([1, 2, 3]);
    });

    it("should support MockStorageOptions.missingKeySync", () => {
      mockWx.storage({ missingKeySync: "undefined" });

      expect(wx.getStorageSync("nonexistent")).toBeUndefined();
    });

    it("should keep the old undefined behaviour with the compat flag", () => {
      mockWx.compat({ storageResolveMissingKey: true });

      expect(wx.getStorageSync("nonexistent")).toBeUndefined();
    });
  });

  describe("setStorage", () => {
    it("should store value with promise", async () => {
      await wx.setStorage({ key: "promise-set", data: { a: 1 } });
      expect(wx.getStorageSync("promise-set")).toStrictEqual({ a: 1 });
    });

    it("should store value with callback", () =>
      new Promise<void>((resolve) => {
        wx.setStorage({
          key: "callback-set",
          data: { a: 1 },
          success: (res) => {
            expect(res.errMsg).toBe("setStorage:ok");
            resolve();
          },
        });
      }));

    it("should call complete after success", () =>
      new Promise<void>((resolve) => {
        let successCalled = false;
        wx.setStorage({
          key: "complete-set",
          data: "value",
          success: () => {
            successCalled = true;
          },
          complete: (res) => {
            expect(successCalled).toBe(true);
            expect(res.errMsg).toBe("setStorage:ok");
            resolve();
          },
        });
      }));

    it("should overwrite existing value", async () => {
      wx.setStorageSync("overwrite", "old");
      await wx.setStorage({ key: "overwrite", data: "new" });
      expect(wx.getStorageSync("overwrite")).toBe("new");
    });

    it("should store objects", async () => {
      const value = { nested: { list: [1, 2, 3] } };
      await wx.setStorage({ key: "object-set", data: value });
      expect(wx.getStorageSync("object-set")).toStrictEqual(value);
    });
  });

  describe("setStorageSync", () => {
    it("should store string value", () => {
      wx.setStorageSync("sync-set-string", "value");
      expect(wx.getStorageSync("sync-set-string")).toBe("value");
    });

    it("should store number value", () => {
      wx.setStorageSync("sync-set-number", 42);
      expect(wx.getStorageSync("sync-set-number")).toBe(42);
    });

    it("should store boolean value", () => {
      wx.setStorageSync("sync-set-boolean", false);
      expect(wx.getStorageSync("sync-set-boolean")).toBe(false);
    });

    it("should store null value", () => {
      wx.setStorageSync("sync-set-null", null);
      expect(wx.getStorageSync("sync-set-null")).toBeNull();
    });
  });

  describe("removeStorage", () => {
    it("should remove key with callback style", () =>
      new Promise<void>((resolve) => {
        wx.setStorageSync("callback-remove", "value");
        wx.removeStorage({
          key: "callback-remove",
          success: (res) => {
            expect(res.errMsg).toBe("removeStorage:ok");
            resolve();
          },
        });
      }));

    it("should call complete after success", () =>
      new Promise<void>((resolve) => {
        wx.setStorageSync("complete-remove-key", "value");
        let successCalled = false;
        wx.removeStorage({
          key: "complete-remove-key",
          success: () => {
            successCalled = true;
          },
          complete: (res) => {
            expect(successCalled).toBe(true);
            expect(res.errMsg).toBe("removeStorage:ok");
            expect(wx.getStorageSync("complete-remove-key")).toBe("");
            resolve();
          },
        });
      }));

    it("should handle removing non-existent key", async () => {
      await wx.removeStorage({ key: "nonexistent" });
      expect(wx.getStorageSync("nonexistent")).toBe("");
    });
  });

  describe("removeStorageSync", () => {
    it("should remove existing key", () => {
      wx.setStorageSync("remove-sync", "value");
      wx.removeStorageSync("remove-sync");
      expect(wx.getStorageSync("remove-sync")).toBe("");
    });

    it("should handle non-existent key gracefully", () => {
      expect(() => wx.removeStorageSync("nonexistent")).not.toThrow();
    });
  });

  describe("clearStorageSync", () => {
    it("should clear all storage", () => {
      wx.setStorageSync("key1", "value1");
      wx.setStorageSync("key2", "value2");
      wx.clearStorageSync();
      expect(wx.getStorageInfoSync().keys).toStrictEqual([]);
    });

    it("should return empty after clear", () => {
      wx.setStorageSync("any-key", "any-value");
      wx.clearStorageSync();
      expect(wx.getStorageSync("any-key")).toBe("");
    });
  });

  describe("clearStorage", () => {
    it("should clear storage with callback", () =>
      new Promise<void>((resolve) => {
        wx.setStorageSync("clear-key", "clear-value");
        wx.clearStorage({
          success: (res) => {
            expect(res.errMsg).toBe("clearStorage:ok");
            resolve();
          },
        });
      }));

    it("should call complete after success", () =>
      new Promise<void>((resolve) => {
        let successCalled = false;
        wx.clearStorage({
          success: () => {
            successCalled = true;
          },
          complete: (res) => {
            expect(successCalled).toBe(true);
            expect(res.errMsg).toBe("clearStorage:ok");
            resolve();
          },
        });
      }));

    it("should clear storage with promise", async () => {
      wx.setStorageSync("promise-clear-key", "promise-clear-value");
      await wx.clearStorage();
      expect(wx.getStorageSync("promise-clear-key")).toBe("");
    });
  });

  describe("batchGetStorage", () => {
    it("should return values for multiple keys with callback", () =>
      new Promise<void>((resolve) => {
        wx.setStorageSync("batch-key-1", "value1");
        wx.setStorageSync("batch-key-2", "value2");
        wx.batchGetStorage({
          keyList: ["batch-key-1", "batch-key-2"],
          success: (res) => {
            expect(res.dataList).toStrictEqual(["value1", "value2"]);
            expect(res.errMsg).toBe("batchGetStorage:ok");
            resolve();
          },
        });
      }));

    it("should call complete after success", () =>
      new Promise<void>((resolve) => {
        wx.setStorageSync("complete-batch-key", "value");
        let successCalled = false;
        wx.batchGetStorage({
          keyList: ["complete-batch-key"],
          success: () => {
            successCalled = true;
          },
          complete: (res) => {
            expect(successCalled).toBe(true);
            expect(res.errMsg).toBe("batchGetStorage:ok");
            resolve();
          },
        });
      }));

    it("should return values with promise", async () => {
      wx.setStorageSync("batch-promise-1", { a: 1 });
      wx.setStorageSync("batch-promise-2", { b: 2 });
      const res = await wx.batchGetStorage({
        keyList: ["batch-promise-1", "batch-promise-2"],
      });
      expect(res.dataList).toStrictEqual([{ a: 1 }, { b: 2 }]);
    });

    it("should succeed with null for missing keys", async () => {
      const res = await wx.batchGetStorage({ keyList: ["nonexistent"] });

      expect(res.dataList).toStrictEqual([null]);
      expect(res.errMsg).toBe("batchGetStorage:ok");
    });

    it("should return null only for the missing positions", async () => {
      wx.setStorageSync("mixed-present", "value");

      const res = await wx.batchGetStorage({
        keyList: ["mixed-present", "mixed-missing"],
      });

      expect(res.dataList).toStrictEqual(["value", null]);
    });

    it("should fail when configured with batchMissingKey fail", async () => {
      mockWx.storage({ batchMissingKey: "fail" });

      await expect(wx.batchGetStorage({ keyList: ["nonexistent"] })).rejects.toMatchObject({
        errMsg: "batchGetStorage:fail data not found",
      });
    });

    it("should resolve missing keys as undefined in compat mode", async () => {
      mockWx.compat({ storageResolveMissingKey: true });

      const res = await wx.batchGetStorage({
        keyList: ["nonexistent-1", "nonexistent-2"],
      });

      expect(res.dataList).toStrictEqual([undefined, undefined]);
    });
  });

  describe("batchSetStorage", () => {
    it("should store multiple key-value pairs with callback", () =>
      new Promise<void>((resolve) => {
        wx.batchSetStorage({
          kvList: [
            { key: "batch-set-1", value: "value1" },
            { key: "batch-set-2", value: "value2" },
          ],
          success: (res) => {
            expect(res.errMsg).toBe("batchSetStorage:ok");
            expect(wx.getStorageSync("batch-set-1")).toBe("value1");
            expect(wx.getStorageSync("batch-set-2")).toBe("value2");
            resolve();
          },
        });
      }));

    it("should call complete after success", () =>
      new Promise<void>((resolve) => {
        let successCalled = false;
        wx.batchSetStorage({
          kvList: [{ key: "complete-batch-set-key", value: "value" }],
          success: () => {
            successCalled = true;
          },
          complete: (res) => {
            expect(successCalled).toBe(true);
            expect(res.errMsg).toBe("batchSetStorage:ok");
            expect(wx.getStorageSync("complete-batch-set-key")).toBe("value");
            resolve();
          },
        });
      }));

    it("should store multiple key-value pairs with promise", async () => {
      await wx.batchSetStorage({
        kvList: [
          { key: "batch-promise-set-1", value: 123 },
          { key: "batch-promise-set-2", value: { nested: true } },
        ],
      });
      expect(wx.getStorageSync("batch-promise-set-1")).toBe(123);
      expect(wx.getStorageSync("batch-promise-set-2")).toStrictEqual({ nested: true });
    });

    it("should overwrite existing values", async () => {
      wx.setStorageSync("overwrite-batch", "original");
      await wx.batchSetStorage({
        kvList: [{ key: "overwrite-batch", value: "updated" }],
      });
      expect(wx.getStorageSync("overwrite-batch")).toBe("updated");
    });
  });

  describe("batchSetStorageSync", () => {
    it("should store multiple key-value pairs", () => {
      wx.batchSetStorageSync([
        { key: "sync-batch-1", value: "value1" },
        { key: "sync-batch-2", value: "value2" },
        { key: "sync-batch-3", value: 42 },
      ]);
      expect(wx.getStorageSync("sync-batch-1")).toBe("value1");
      expect(wx.getStorageSync("sync-batch-2")).toBe("value2");
      expect(wx.getStorageSync("sync-batch-3")).toBe(42);
    });

    it("should overwrite existing values", () => {
      wx.setStorageSync("sync-overwrite", "original");
      wx.batchSetStorageSync([{ key: "sync-overwrite", value: "new-value" }]);
      expect(wx.getStorageSync("sync-overwrite")).toBe("new-value");
    });
  });

  describe("getRealtimeLogManager", () => {
    it("should return console-like object", () => {
      const logger = wx.getRealtimeLogManager();
      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("error");
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("log");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("group");
      expect(logger).toHaveProperty("groupEnd");
      expect(logger).toHaveProperty("setFilterMsg");
    });

    it("should accept logs and filter messages without persisting them", () => {
      const logger = wx.getRealtimeLogManager();

      expect(() => {
        logger.debug("debug");
        logger.info("info");
        logger.warn("warn");
        logger.error("error");
        logger.log("log");
        logger.group("group");
        logger.groupEnd();
        logger.setFilterMsg("filter");
      }).not.toThrow();
    });
  });

  describe("getLogManager", () => {
    it("should return console-like object", () => {
      const logger = wx.getLogManager();
      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("error");
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("log");
      expect(logger).toHaveProperty("warn");
    });
  });

  describe("getStorageInfo", () => {
    it("should return keys with callback", () =>
      new Promise<void>((resolve) => {
        wx.setStorageSync("info-key-1", "value1");
        wx.setStorageSync("info-key-2", "value2");
        wx.getStorageInfo({
          success: (result) => {
            expect(result.keys).toContain("info-key-1");
            expect(result.keys).toContain("info-key-2");
            expect(result.currentSize).toBeGreaterThan(0);
            expect(result.limitSize).toBe(1024 * 10);
            resolve();
          },
        });
      }));

    it("should call complete after success", () =>
      new Promise<void>((resolve) => {
        let successCalled = false;
        wx.getStorageInfo({
          success: () => {
            successCalled = true;
          },
          complete: (res) => {
            expect(successCalled).toBe(true);
            expect(res.errMsg).toBe("getStorageInfo:ok");
            resolve();
          },
        });
      }));

    it("should return promise without callbacks", async () => {
      wx.setStorageSync("promise-info-key", "value");
      const result = await wx.getStorageInfo();
      expect(result.keys).toContain("promise-info-key");
    });
  });

  describe("getStorageInfoSync", () => {
    it("should return keys synchronously", () => {
      wx.setStorageSync("sync-info-1", "value1");
      wx.setStorageSync("sync-info-2", "value2");
      const result = wx.getStorageInfoSync();
      expect(result.keys).toContain("sync-info-1");
      expect(result.keys).toContain("sync-info-2");
      expect(result.limitSize).toBe(1024 * 10);
    });

    it("should return empty keys when no storage", () => {
      const result = wx.getStorageInfoSync();
      expect(result.keys).toStrictEqual([]);
    });
  });

  // describe("getFileSystemManager", () => {
  //   it("should return a FileSystemManager instance", () => {
  //     const fsm = wx.getFileSystemManager();
  //     expectTypeOf(fsm).toBeObject();
  //     expectTypeOf(fsm.mkdirSync).toBeFunction();
  //     expectTypeOf(fsm.writeFileSync).toBeFunction();
  //     expectTypeOf(fsm.readFileSync).toBeFunction();
  //     expectTypeOf(fsm.statSync).toBeFunction();
  //     expectTypeOf(fsm.unlinkSync).toBeFunction();
  //     expectTypeOf(fsm.rmdirSync).toBeFunction();
  //     expectTypeOf(fsm.readdirSync).toBeFunction();
  //     expectTypeOf(fsm.saveFileSync).toBeFunction();
  //   });

  //   describe("mkdirSync", () => {
  //     it("should create a directory", () => {
  //       const fsm = wx.getFileSystemManager();
  //       fsm.mkdirSync("wxfile://test-dir");
  //       expect(() => fsm.statSync("wxfile://test-dir")).not.toThrow();
  //     });
  //   });

  //   describe("writeFileSync", () => {
  //     it("should write a file", () => {
  //       const fsm = wx.getFileSystemManager();
  //       fsm.writeFileSync("wxfile://test-file.txt", "hello world");
  //       const content = fsm.readFileSync("wxfile://test-file.txt", "utf-8");
  //       expect(content).toBe("hello world");
  //     });

  //     it("should write and read binary data", () => {
  //       const fsm = wx.getFileSystemManager();
  //       const buffer = new ArrayBuffer(8);
  //       fsm.writeFileSync("wxfile://binary-file", buffer, "binary");
  //       const content = fsm.readFileSync("wxfile://binary-file", "binary");
  //       expect(content).toBeInstanceOf(ArrayBuffer);
  //     });
  //   });

  //   describe("statSync", () => {
  //     it("should return isFile true for files", () => {
  //       const fsm = wx.getFileSystemManager();
  //       fsm.writeFileSync("wxfile://stat-file.txt", "content");
  //       const stat = fsm.statSync("wxfile://stat-file.txt");
  //       expect(stat.isFile()).toBe(true);
  //       expect(stat.isDirectory()).toBe(false);
  //     });

  //     it("should return isDirectory true for directories", () => {
  //       const fsm = wx.getFileSystemManager();
  //       fsm.mkdirSync("wxfile://stat-dir");
  //       const stat = fsm.statSync("wxfile://stat-dir");
  //       expect(stat.isDirectory()).toBe(true);
  //       expect(stat.isFile()).toBe(false);
  //     });

  //     it("should throw for non-existent path", () => {
  //       const fsm = wx.getFileSystemManager();
  //       expect(() => fsm.statSync("wxfile://nonexistent")).toThrow();
  //     });
  //   });

  //   describe("readdirSync", () => {
  //     it("should list directory contents", () => {
  //       const fsm = wx.getFileSystemManager();
  //       fsm.mkdirSync("wxfile://ls-dir");
  //       fsm.writeFileSync("wxfile://ls-dir/file1.txt", "content1");
  //       fsm.writeFileSync("wxfile://ls-dir/file2.txt", "content2");
  //       const files = fsm.readdirSync("wxfile://ls-dir");
  //       // WeChat readdirSync returns file names relative to the directory
  //       expect(files).toContain("file1.txt");
  //       expect(files).toContain("file2.txt");
  //     });
  //   });

  //   describe("unlinkSync", () => {
  //     it("should delete a file", () => {
  //       const fsm = wx.getFileSystemManager();
  //       fsm.writeFileSync("wxfile://to-delete.txt", "content");
  //       fsm.unlinkSync("wxfile://to-delete.txt");
  //       expect(() => fsm.readFileSync("wxfile://to-delete.txt")).toThrow();
  //     });
  //   });

  //   describe("rmdirSync", () => {
  //     it("should delete a directory", () => {
  //       const fsm = wx.getFileSystemManager();
  //       fsm.mkdirSync("wxfile://to-rmdir");
  //       fsm.rmdirSync("wxfile://to-rmdir");
  //       expect(() => fsm.readdirSync("wxfile://to-rmdir")).toThrow();
  //     });
  //   });

  //   describe("saveFileSync", () => {
  //     it("should return the saved file path", () => {
  //       const fsm = wx.getFileSystemManager();
  //       const result = fsm.saveFileSync("temp://file.txt", "wxfile://saved-file.txt");
  //       expect(result).toBe("saved-file.txt");
  //     });
  //   });
  // });

  // describe("downloadFile", () => {
  //   it("should download file with callback", () =>
  //     new Promise<void>((resolve) => {
  //       wx.downloadFile({
  //         url: "https://example.com/file.txt",
  //         filePath: "wxfile://downloads/file.txt",
  //         success: (result) => {
  //           expect(result.statusCode).toBe(200);
  //           expect(result.tempFilePath).toBe("wxfile://downloads/file.txt");
  //           resolve();
  //         },
  //       });
  //     }));

  //   it("should return promise without callbacks", async () => {
  //     const result = await wx.downloadFile({
  //       url: "https://example.com/file.txt",
  //     });
  //     expect((result as { tempFilePath: string; statusCode: number }).statusCode).toBe(200);
  //   });
  // });

  describe("env", () => {
    it("should have correct USER_DATA_PATH", () => {
      expect(wx.env.USER_DATA_PATH).toBe("wxfile://usr");
    });
  });

  describe("version", () => {
    it("should expose the client version", () => {
      expect(wx.version).toBe("8.0.30");
    });
  });
});

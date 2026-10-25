import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mockWx, wx } from "../src/index.js";

const KB = 1024;

describe("storage normalisation", () => {
  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    wx.clearStorageSync();
  });

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("serialisation", () => {
    it("should store by value instead of by reference", () => {
      const value = { nested: { count: 1 } };

      wx.setStorageSync("ref", value);
      value.nested.count = 2;

      expect(wx.getStorageSync("ref")).toStrictEqual({ nested: { count: 1 } });
    });

    it("should deserialize every read into a fresh object", () => {
      wx.setStorageSync("copy", { count: 1 });

      const first = wx.getStorageSync<{ count: number }>("copy");

      first.count = 99;

      expect(wx.getStorageSync("copy")).toStrictEqual({ count: 1 });
      expect(wx.getStorageSync("copy")).not.toBe(first);
    });

    it("should round-trip JSON-supported values", () => {
      const value = {
        date: new Date("2024-01-01T00:00:00.000Z"),
        list: [1, "2", null, true],
        nested: { key: "value" },
      };

      wx.setStorageSync("json", value);

      expect(wx.getStorageSync("json")).toStrictEqual({
        date: "2024-01-01T00:00:00.000Z",
        list: [1, "2", null, true],
        nested: { key: "value" },
      });
    });

    it("should round-trip undefined values", () => {
      wx.setStorageSync("undef", undefined);

      expect(wx.getStorageSync("undef")).toBeUndefined();
    });

    it("should reject values that cannot be serialized", () => {
      const circular: Record<string, unknown> = {};

      circular.self = circular;

      expect(() => wx.setStorageSync("circular", circular)).toThrow(/JSON serializable/u);
      expect(wx.getStorageInfoSync().keys).not.toContain("circular");
    });
  });

  describe("quota", () => {
    it("should enforce the default 1 MB single-key quota", () => {
      const oversized = "x".repeat(KB * KB + 1);

      expect(() => wx.setStorageSync("oversized-key", oversized)).toThrow(
        /exceed storage max size/u,
      );
      expect(wx.getStorageInfoSync().keys).not.toContain("oversized-key");
    });

    it("should enforce the total quota", () => {
      mockWx.storage({ keySize: 2, limitSize: 2 });

      wx.setStorageSync("first", "a".repeat(1200));

      expect(() => wx.setStorageSync("second", "b".repeat(1200))).toThrow(
        /exceed storage max size/u,
      );
      expect(wx.getStorageInfoSync().keys).toStrictEqual(["first"]);
    });

    it("should not double count an overwritten key", () => {
      mockWx.storage({ keySize: 2, limitSize: 2 });

      wx.setStorageSync("overwrite", "a".repeat(KB));
      wx.setStorageSync("overwrite", "b".repeat(KB));

      expect(wx.getStorageSync("overwrite")).toBe("b".repeat(KB));
    });

    it("should respect a custom single-key quota", () => {
      mockWx.storage({ keySize: 1 });

      expect(() => wx.setStorageSync("large", "x".repeat(KB + 1))).toThrow(/exceed/u);
    });

    it("should reject async writes and keep the previous data", async () => {
      mockWx.storage({ keySize: 1, limitSize: 1 });

      wx.setStorageSync("first", "a".repeat(KB - 2));

      await expect(
        wx.setStorage({ data: "b".repeat(KB * 2), key: "second" }),
      ).rejects.toMatchObject({ errMsg: "setStorage:fail exceed storage max size" });

      expect(wx.getStorageInfoSync().keys).toStrictEqual(["first"]);
    });

    it("should call fail and complete for async quota failures", () =>
      new Promise<void>((resolve) => {
        mockWx.storage({ keySize: 1 });

        wx.setStorage({
          data: "x".repeat(KB + 1),
          key: "callback-quota",
          fail: (res) => {
            expect(res.errMsg).toBe("setStorage:fail exceed storage max size");
          },
          complete: (res) => {
            expect(res.errMsg).toBe("setStorage:fail exceed storage max size");
            expect(wx.getStorageInfoSync().keys).toStrictEqual([]);
            resolve();
          },
        });
      }));

    it("should validate a batch atomically", async () => {
      mockWx.storage({ keySize: 1, limitSize: 1 });

      await expect(
        wx.batchSetStorage({
          kvList: [
            { key: "batch-a", value: "a".repeat(600) },
            { key: "batch-b", value: "b".repeat(600) },
          ],
        }),
      ).rejects.toMatchObject({ errMsg: "setStorage:fail exceed storage max size" });

      expect(wx.getStorageInfoSync().keys).toStrictEqual([]);
    });

    it("should reject an oversized key inside a sync batch", () => {
      mockWx.storage({ keySize: 1 });

      expect(() =>
        wx.batchSetStorageSync([{ key: "batch-oversized", value: "x".repeat(KB + 1) }]),
      ).toThrow(/exceed/u);
      expect(wx.getStorageInfoSync().keys).toStrictEqual([]);
    });

    it("should support injected quota / noent failures", async () => {
      mockWx.failNext("setStorage", { type: "quota" });

      await expect(wx.setStorage({ data: "value", key: "injected" })).rejects.toMatchObject({
        errMsg: "setStorage:fail exceed storage max size",
      });

      mockWx.failNext("getStorage", { type: "noent" });

      await expect(wx.getStorage({ key: "injected" })).rejects.toMatchObject({
        errCode: 1300002,
      });
    });
  });

  describe("currentSize", () => {
    it("should be 0 for an empty storage", () => {
      expect(wx.getStorageInfoSync().currentSize).toBe(0);
    });

    it("should count serialized value bytes only", () => {
      wx.setStorageSync("small", "x".repeat(KB - 2));

      expect(wx.getStorageInfoSync().currentSize).toBe(1);

      wx.setStorageSync("medium", "x".repeat(KB * 3 - 2));

      expect(wx.getStorageInfoSync().currentSize).toBe(4);
    });

    it("should not count undefined values", () => {
      wx.setStorageSync("undef", undefined);

      expect(wx.getStorageInfoSync().currentSize).toBe(0);
    });

    it("should go back to 0 after remove and clear", () => {
      wx.setStorageSync("removed", "x".repeat(KB));
      wx.removeStorageSync("removed");
      expect(wx.getStorageInfoSync().currentSize).toBe(0);

      wx.setStorageSync("cleared", "x".repeat(KB));
      wx.clearStorageSync();
      expect(wx.getStorageInfoSync().currentSize).toBe(0);
    });

    it("should expose the configured limitSize", () => {
      mockWx.storage({ limitSize: 20 });

      expect(wx.getStorageInfoSync().limitSize).toBe(20);
      expect(wx.getStorageInfoSync().currentSize).toBe(0);
    });

    it("should use the default 10 MB limit", () => {
      expect(wx.getStorageInfoSync().limitSize).toBe(10240);
    });
  });

  describe("batchGetStorage", () => {
    it("should return missing keys as undefined when configured to resolve", async () => {
      mockWx.storage({ missingKey: "resolve" });

      const result = await wx.batchGetStorage({ keyList: ["missing-a", "missing-b"] });

      expect(result.data).toStrictEqual([undefined, undefined]);
    });

    it("should fail when a key is missing", async () => {
      wx.setStorageSync("present", "value");

      await expect(wx.batchGetStorage({ keyList: ["present", "missing"] })).rejects.toMatchObject({
        errMsg: "batchGetStorage:fail data not found",
      });
    });
  });
});

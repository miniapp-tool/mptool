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
        list: [1, "2", null, true],
        nested: { key: "value" },
      };

      wx.setStorageSync("json", value);

      expect(wx.getStorageSync("json")).toStrictEqual(value);
    });

    it("should keep a top-level Date a Date", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");

      wx.setStorageSync("date", date);

      const value = wx.getStorageSync<Date>("date");

      expect(value).toBeInstanceOf(Date);
      expect(value.getTime()).toBe(date.getTime());
    });

    it("should serialize nested Dates to ISO strings", () => {
      wx.setStorageSync("nested-date", {
        when: new Date("2024-01-01T00:00:00.000Z"),
        list: [new Date("2025-02-02T00:00:00.000Z")],
      });

      expect(wx.getStorageSync("nested-date")).toStrictEqual({
        when: "2024-01-01T00:00:00.000Z",
        list: ["2025-02-02T00:00:00.000Z"],
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
    it("should not enforce the per-key limit by default", () => {
      // The developer tools accept multi-MB single keys; only the 10 MB total is enforced.
      wx.setStorageSync("two-mb", "x".repeat(KB * KB * 2));

      expect(wx.getStorageInfoSync().keys).toStrictEqual(["two-mb"]);
    });

    it("should enforce a per-key limit when configured", () => {
      mockWx.storage({ keySize: 1 });

      expect(() => wx.setStorageSync("large", "x".repeat(KB + 1))).toThrow(/exceed/u);
    });

    it("should enforce the total quota", () => {
      mockWx.storage({ limitSize: 2 });

      wx.setStorageSync("first", "a".repeat(1200));

      expect(() => wx.setStorageSync("second", "b".repeat(1200))).toThrow(
        /exceed storage max size 10Mb/u,
      );
      expect(wx.getStorageInfoSync().keys).toStrictEqual(["first"]);
    });

    it("should count key names in the total quota", () => {
      mockWx.storage({ limitSize: 1 });

      // 1000 key bytes + 3 value bytes still fit in 1 KB, a 1024-byte key does not.
      wx.setStorageSync("k".repeat(1000), "x");

      expect(() => wx.setStorageSync("k".repeat(1024), "x")).toThrow(/exceed/u);
    });

    it("should not double count an overwritten key", () => {
      mockWx.storage({ limitSize: 2 });

      wx.setStorageSync("overwrite", "a".repeat(1200));
      wx.setStorageSync("overwrite", "b".repeat(1200));

      expect(wx.getStorageSync("overwrite")).toBe("b".repeat(1200));
    });

    it("should reject async writes and keep the previous data", async () => {
      mockWx.storage({ limitSize: 1 });

      wx.setStorageSync("first", "a".repeat(KB - 10));

      await expect(
        wx.setStorage({ data: "b".repeat(KB * 2), key: "second" }),
      ).rejects.toMatchObject({ errMsg: "setStorage:fail exceed storage max size 10Mb" });

      expect(wx.getStorageInfoSync().keys).toStrictEqual(["first"]);
    });

    it("should call fail and complete for async quota failures", () =>
      new Promise<void>((resolve) => {
        mockWx.storage({ limitSize: 1 });

        wx.setStorage({
          data: "x".repeat(KB * 2),
          key: "callback-quota",
          fail: (res) => {
            expect(res.errMsg).toBe("setStorage:fail exceed storage max size 10Mb");
          },
          complete: (res) => {
            expect(res.errMsg).toBe("setStorage:fail exceed storage max size 10Mb");
            expect(wx.getStorageInfoSync().keys).toStrictEqual([]);
            resolve();
          },
        });
      }));

    it("should validate a batch atomically", async () => {
      mockWx.storage({ limitSize: 1 });

      await expect(
        wx.batchSetStorage({
          kvList: [
            { key: "batch-a", value: "a".repeat(600) },
            { key: "batch-b", value: "b".repeat(600) },
          ],
        }),
      ).rejects.toMatchObject({ errMsg: "setStorage:fail exceed storage max size 10Mb" });

      expect(wx.getStorageInfoSync().keys).toStrictEqual([]);
    });

    it("should reject an oversized key inside a sync batch when configured", () => {
      mockWx.storage({ keySize: 1 });

      expect(() =>
        wx.batchSetStorageSync([{ key: "batch-oversized", value: "x".repeat(KB + 1) }]),
      ).toThrow(/exceed/u);
      expect(wx.getStorageInfoSync().keys).toStrictEqual([]);
    });

    it("should support injected quota / noent failures", async () => {
      mockWx.failNext("setStorage", { type: "quota" });

      await expect(wx.setStorage({ data: "value", key: "injected" })).rejects.toMatchObject({
        errMsg: "setStorage:fail exceed storage max size 10Mb",
      });

      mockWx.failNext("getStorage", { type: "noent" });

      await expect(wx.getStorage({ key: "injected" })).rejects.toMatchObject({
        errCode: 1300002,
      });
    });
  });

  describe("currentSize", () => {
    it("should report 1 for an empty storage", () => {
      // The developer tools report a 1 KB baseline for an empty storage.
      expect(wx.getStorageInfoSync().currentSize).toBe(1);
    });

    it("should count key and value bytes", () => {
      wx.setStorageSync("k", "x".repeat(KB));
      expect(wx.getStorageInfoSync().currentSize).toBe(2);

      wx.setStorageSync("k".repeat(1024), "x");
      expect(wx.getStorageInfoSync().currentSize).toBeGreaterThanOrEqual(2);
    });

    it("should count large keys", () => {
      wx.setStorageSync("k".repeat(4096), "x");

      expect(wx.getStorageInfoSync().currentSize).toBe(5);
    });

    it("should not count undefined values", () => {
      wx.setStorageSync("undef", undefined);

      // Only the key bytes are counted, which still rounds up to the 1 KB baseline.
      expect(wx.getStorageInfoSync().currentSize).toBe(1);
    });

    it("should go back to 1 after remove and clear", () => {
      wx.setStorageSync("removed", "x".repeat(KB));
      wx.removeStorageSync("removed");
      expect(wx.getStorageInfoSync().currentSize).toBe(1);

      wx.setStorageSync("cleared", "x".repeat(KB));
      wx.clearStorageSync();
      expect(wx.getStorageInfoSync().currentSize).toBe(1);
    });

    it("should expose the configured limitSize", () => {
      mockWx.storage({ limitSize: 20 });

      expect(wx.getStorageInfoSync().limitSize).toBe(20);
      expect(wx.getStorageInfoSync().currentSize).toBe(1);
    });

    it("should use the default 10 MB limit", () => {
      expect(wx.getStorageInfoSync().limitSize).toBe(10240);
    });
  });

  describe("batchGetStorage", () => {
    it("should succeed with null entries for missing keys", async () => {
      wx.setStorageSync("present", "value");

      const result = await wx.batchGetStorage({ keyList: ["present", "missing"] });

      expect(result.dataList).toStrictEqual(["value", null]);
      expect(result.errMsg).toBe("batchGetStorage:ok");
    });

    it("should fail when configured with batchMissingKey fail", async () => {
      mockWx.storage({ batchMissingKey: "fail" });

      await expect(
        wx.batchGetStorage({ keyList: ["missing-a", "missing-b"] }),
      ).rejects.toMatchObject({ errMsg: "batchGetStorage:fail data not found" });
    });
  });
});

import "@mptool/mock";
import type { MpError } from "@mptool/shared";
import { MpError as MpErrorClass } from "@mptool/shared";
import { describe, expect, it } from "vitest";

import {
  check,
  checkAsync,
  get,
  getAsync,
  put,
  remove,
  removeAsync,
  set,
  setAsync,
  storage,
  take,
} from "../src/storage.js";

describe(set, () => {
  it("set sync simple", () => {
    set("simple-sync", "mister-hope");
    expect(get("simple-sync")).toBe("mister-hope");
  });

  it("set sync", () => {
    set("data-sync", { title: 123 });
    expect(get("data-sync")).toStrictEqual({ title: 123 });
  });

  it("set async", () =>
    new Promise<void>((resolve) => {
      void setAsync("data-async", { title: 123 }).then(() => {
        expect(get("data-async")).toStrictEqual({ title: 123 });
        resolve();
      });
    }));

  it("set expire", async () => {
    await setAsync("data-expire", { title: 123 }, 100);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 150);
    });

    const data = await getAsync("data-expire");

    expect(data).toBeUndefined();
  });

  it("set expire x2", () =>
    new Promise<void>((resolve) => {
      void setAsync("data-expire-x2", { title: 123 }, 100).then(() => {
        // Use a TTL well above the 150 ms wait: a loaded CI worker can delay the timer past a
        // tight 200 ms expiry and turn this into a flaky failure.
        set("data-expire-x2", { title: 456 }, 1000);
        setTimeout(() => {
          expect(get("data-expire-x2")).toStrictEqual({ title: 456 });
          resolve();
        }, 150);
      });
    }));

  it("set expire then update value", () =>
    new Promise<void>((resolve) => {
      void setAsync("data-expire-update", { title: 123 }, 100).then(() => {
        set("data-expire-update", { title: 456 }, "keep");
        setTimeout(() => {
          expect(get("data-expire-update")).toBeUndefined();
          resolve();
        }, 200);
      });
    }));
});

describe(check, () => {
  it("should keep permanent cache", () => {
    set("check-permanent", { a: 1 }, 0);

    check();

    expect(get("check-permanent")).toStrictEqual({ a: 1 });
  });

  it("should remove expired cache", () =>
    new Promise<void>((resolve) => {
      set("check-expired", { a: 1 }, 50);

      setTimeout(() => {
        check();

        expect(get("check-expired")).toBeUndefined();
        resolve();
      }, 100);
    }));

  it("should remove once values written by a previous session", () => {
    set("check-once-key", "value", "once");

    const raw = wx.getStorageSync<{ expired: number }>("_cache_check-once-key");

    wx.setStorageSync("_cache_check-once-key", {
      data: "stale",
      expired: raw.expired - 1000,
      once: true,
    });

    check();

    expect(wx.getStorageSync("_cache_check-once-key")).toBeFalsy();
  });

  it("should remove values whose clock moved backwards", () => {
    wx.setStorageSync("_cache_check-rollback-key", {
      data: "future",
      expired: Date.now() + 60_000,
      createdAt: Date.now() + 30_000,
    });

    check();

    expect(wx.getStorageSync("_cache_check-rollback-key")).toBeFalsy();
  });
});

describe(checkAsync, () => {
  it("should keep permanent cache", async () => {
    await setAsync("check-async-permanent", { a: 1 }, 0);

    await checkAsync();

    await expect(getAsync("check-async-permanent")).resolves.toStrictEqual({ a: 1 });
  });

  it("should remove expired cache", async () => {
    await setAsync("check-async-expired", { a: 1 }, 50);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    await checkAsync();

    await expect(getAsync("check-async-expired")).resolves.toBeUndefined();
  });
});

describe(put, () => {
  it("should store value in memory", () => {
    put("put-key", { a: 1 });

    expect(storage.get("put-key")).toStrictEqual({ a: 1 });
  });
});

describe(take, () => {
  it("should return and remove the value", () => {
    put("take-key", "value");

    expect(take("take-key")).toBe("value");
    expect(take("take-key")).toBeUndefined();
  });

  it("should return undefined for a missing key", () => {
    expect(take("take-missing-key")).toBeUndefined();
  });
});

describe(set, () => {
  it("should be valid within the session when once", () => {
    set("once-key", "value", "once");

    expect(get("once-key")).toBe("value");
  });

  it("should not cache when keep has no previous value", () => {
    set("keep-none-key", "value", "keep");

    expect(get("keep-none-key")).toBeUndefined();
  });

  it("should bound once values to the writing session", () => {
    set("once-session-key", "value", "once");

    const raw = wx.getStorageSync<{ expired: number; once?: boolean }>("_cache_once-session-key");

    expect(raw.once).toBe(true);
    // A payload written by a previous session (with a rolled back clock) must not be revived
    wx.setStorageSync("_cache_once-session-key", {
      data: "stale",
      expired: raw.expired - 1000,
      once: true,
    });

    expect(get("once-session-key")).toBeUndefined();
    expect(wx.getStorageSync("_cache_once-session-key")).toBeFalsy();
  });

  it("should preserve the once marker when keeping the expiry", () => {
    set("keep-once-key", "first", "once");

    const before = wx.getStorageSync<{ expired: number }>("_cache_keep-once-key");

    set("keep-once-key", "second", "keep");

    const after = wx.getStorageSync<{ expired: number; once?: boolean }>("_cache_keep-once-key");

    expect(after).toMatchObject({ data: "second", expired: before.expired, once: true });
    expect(get("keep-once-key")).toBe("second");
  });

  it("should preserve the creation time when keeping the expiry", () => {
    set("keep-created-key", "first", 1000);

    const before = wx.getStorageSync<{ createdAt?: number }>("_cache_keep-created-key");

    set("keep-created-key", "second", "keep");

    expect(wx.getStorageSync("_cache_keep-created-key")).toMatchObject({
      data: "second",
      createdAt: before.createdAt,
    });
  });

  it("should expire timestamp based values when the clock moved backwards", () => {
    wx.setStorageSync("_cache_clock-rollback-key", {
      data: "future",
      expired: Date.now() + 60_000,
      createdAt: Date.now() + 30_000,
    });

    expect(get("clock-rollback-key")).toBeUndefined();
    expect(wx.getStorageSync("_cache_clock-rollback-key")).toBeFalsy();
  });

  it("should keep timestamp based values while the clock is monotonic", () => {
    wx.setStorageSync("_cache_clock-normal-key", {
      data: "valid",
      expired: Date.now() + 60_000,
      createdAt: Date.now(),
    });

    expect(get("clock-normal-key")).toBe("valid");
  });

  it("should remove legacy timestamp entries that have already expired", () => {
    wx.setStorageSync("_cache_legacy-expired-key", { data: "stale", expired: Date.now() - 1 });

    expect(get("legacy-expired-key")).toBeUndefined();
  });
});

describe(remove, () => {
  it("should remove synced cache", () => {
    set("remove-key", "value");

    remove("remove-key");

    expect(get("remove-key")).toBeUndefined();
  });
});

describe(removeAsync, () => {
  it("should remove async cache", async () => {
    await setAsync("remove-async-key", "value");

    await removeAsync("remove-async-key");

    await expect(getAsync("remove-async-key")).resolves.toBeUndefined();
  });
});

describe(setAsync, () => {
  it("should reject with MpError when setStorage fails", async () => {
    const wxAny = wx as unknown as {
      setStorage: (option: { fail?: (result: { errMsg: string }) => void }) => Promise<never>;
    };
    const original = wxAny.setStorage;

    wxAny.setStorage = (option): Promise<never> => {
      option.fail?.({ errMsg: "set fail" });

      return Promise.reject(new Error("set fail"));
    };

    try {
      const error = await setAsync("fail-set-key", "value").catch((err: unknown) => err);

      expect(error).toBeInstanceOf(MpErrorClass);
      expect(error as MpError).toMatchObject({ message: expect.stringContaining("set fail") });
      expect(get("fail-set-key")).toBeUndefined();
    } finally {
      wxAny.setStorage = original;
    }
  });
});

describe("storage error contract", () => {
  it("should throw MpError with errMsg when the sync write fails", () => {
    const wxAny = wx as unknown as { setStorageSync: (key: string, data: unknown) => void };
    const original = wxAny.setStorageSync;

    wxAny.setStorageSync = (): void => {
      throw Object.assign(new Error("quota exceeded"), {
        errCode: 1001,
        errMsg: "setStorageSync:fail exceed storage max size",
      });
    };

    try {
      let error: unknown;

      try {
        set("quota-key", { a: 1 });
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(MpErrorClass);
      expect(error).toMatchObject({
        code: 1001,
        message: expect.stringContaining("exceed storage max size"),
      });
    } finally {
      wxAny.setStorageSync = original;
    }
  });

  it("should reject with MpError when the async prepare step fails", async () => {
    const wxAny = wx as unknown as { getStorageSync: (key: string) => unknown };
    const original = wxAny.getStorageSync;

    wxAny.getStorageSync = (): never => {
      throw Object.assign(new Error("read failed"), { errMsg: "getStorageSync:fail read failed" });
    };

    try {
      await expect(setAsync("fail-prepare-key", "value", "keep")).rejects.toMatchObject({
        name: "MpError",
        message: expect.stringContaining("read failed"),
      });
    } finally {
      wxAny.getStorageSync = original;
    }
  });
});

describe(getAsync, () => {
  it("should return undefined for a missing key with the real mock semantics", async () => {
    await expect(getAsync("missing-key-without-stub")).resolves.toBeUndefined();
  });

  it("should return undefined when getStorage fails", async () => {
    const wxAny = wx as unknown as {
      getStorage: (option: { fail?: (result: { errMsg: string }) => void }) => Promise<never>;
    };
    const original = wxAny.getStorage;

    wxAny.getStorage = (option): Promise<never> => {
      option.fail?.({ errMsg: "getStorage:fail data not found" });

      return Promise.reject(
        Object.assign(new Error("data not found"), {
          errMsg: "getStorage:fail data not found",
        }),
      );
    };

    try {
      await expect(getAsync("missing-get-key")).resolves.toBeUndefined();
    } finally {
      wxAny.getStorage = original;
    }
  });

  it("should reject with MpError when getStorage fails for another reason", async () => {
    const wxAny = wx as unknown as {
      getStorage: (option: { fail?: (result: { errMsg: string }) => void }) => Promise<never>;
    };
    const original = wxAny.getStorage;

    wxAny.getStorage = (option): Promise<never> => {
      option.fail?.({ errMsg: "getStorage:fail permission denied" });

      return Promise.reject(
        Object.assign(new Error("permission denied"), {
          errMsg: "getStorage:fail permission denied",
        }),
      );
    };

    try {
      const error = await getAsync("fail-get-key").catch((err: unknown) => err);

      expect(error).toBeInstanceOf(MpErrorClass);
      expect(error as MpError).toMatchObject({
        message: expect.stringContaining("permission denied"),
      });
    } finally {
      wxAny.getStorage = original;
    }
  });
});

describe(checkAsync, () => {
  it("should ignore keys that disappear before getStorage resolves", async () => {
    const wxAny = wx as unknown as {
      getStorage: (option: { key: string }) => Promise<unknown>;
      getStorageInfo: () => Promise<{ currentSize: number; keys: string[]; limitSize: number }>;
    };
    const originalGetStorageInfo = wxAny.getStorageInfo;
    const originalGetStorage = wxAny.getStorage;

    wxAny.getStorageInfo = (): Promise<{
      currentSize: number;
      keys: string[];
      limitSize: number;
    }> => Promise.resolve({ currentSize: 0, keys: ["_cache_raced"], limitSize: 10240 });
    wxAny.getStorage = (): Promise<never> =>
      Promise.reject(
        Object.assign(new Error("getStorage:fail data not found"), {
          errMsg: "getStorage:fail data not found",
        }),
      );

    try {
      await expect(checkAsync()).resolves.toBeUndefined();
    } finally {
      wxAny.getStorageInfo = originalGetStorageInfo;
      wxAny.getStorage = originalGetStorage;
    }
  });
});

import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { Cookie } from "../src/cookie.js";
import { CookieStore } from "../src/index.js";
import type { CookieType } from "../src/typings.js";

const mockedResponse = {
  header: {
    "Set-Cookie":
      "EGG_SESSION=cQgFSy2NnOAAqWu7YUVVEoFWkf2YxXL1pi4GYPBl9ieUPI_YSy6LBvs7lsxB52cZ; domain=baidu.com; path=/; expires=Fri, 27 Jul 9999 04:02:51 GMT; httponly, dwf_sg_task_completion=False; expires=Sat, 25-Aug-2020 04:04:04 GMT; Max-Age=2592000; Path=/; secure;, PSINO=7; domain=.baidu.com; path=/,prod_crm_session=gBz4cg45F7A5TwRuSNgOw5xSRilpiec9Mht7bS9a; expires=Thu, 26-Jul-2020 06:14:05 GMT; Max-Age=2592000; path=/; domain=.taobao.com; httponly",
  },
} as unknown as WechatMiniprogram.RequestSuccessCallbackResult;

const TEST_NAME = "session_id";
const TEST_VALUE = "session_id_value";

describe(CookieStore, () => {
  it("request", () => {
    const cookieStore = new CookieStore("cookie-request");

    cookieStore.applyResponse(mockedResponse, "baidu.com");

    expect(cookieStore.getHeader("baidu.com")).toBe(
      "EGG_SESSION=cQgFSy2NnOAAqWu7YUVVEoFWkf2YxXL1pi4GYPBl9ieUPI_YSy6LBvs7lsxB52cZ; dwf_sg_task_completion=False; PSINO=7",
    );
  });

  it("set", () => {
    const cookieStore = new CookieStore("cookie-set");
    const result = cookieStore.set({
      name: TEST_NAME,
      value: TEST_VALUE,
      domain: "baidu.com",
    });

    expect(result.value).toBe(TEST_VALUE);
  });

  it("has", () => {
    const cookieStore = new CookieStore("cookie-has");

    cookieStore.set({ name: TEST_NAME, value: TEST_VALUE, domain: "baidu.com" });

    expect(cookieStore.has(TEST_NAME, { domain: "baidu.com" })).toBe(true);
  });

  it("get", () => {
    const cookieStore = new CookieStore("cookie-get");

    cookieStore.set({ name: TEST_NAME, value: TEST_VALUE, domain: "baidu.com" });

    const result = cookieStore.get(TEST_NAME, { domain: "baidu.com" })!;

    expect(result).toBeInstanceOf(Cookie);
    expect(result.name).toBe(TEST_NAME);
  });

  it("getValue", () => {
    const cookieStore = new CookieStore("cookie-getvalue");

    cookieStore.set({ name: TEST_NAME, value: TEST_VALUE, domain: "baidu.com" });

    expect(cookieStore.getValue(TEST_NAME, { domain: "baidu.com" })).toBe(TEST_VALUE);
  });

  it("set cookie with domain is sent to subdomains", () => {
    const cookieStore = new CookieStore("cookie-subdomain");

    cookieStore.set({ name: TEST_NAME, value: TEST_VALUE, domain: "example.com" });

    // 与 applyHeader 写入行为一致：子域请求也能获取该 cookie
    expect(cookieStore.getValue(TEST_NAME, { domain: "www.example.com" })).toBe(TEST_VALUE);
  });

  it("getCookies", () => {
    const cookieStore = new CookieStore("cookie-getcookies");

    cookieStore.applyResponse(mockedResponse, "baidu.com");

    // mockedResponse 中属于 baidu.com 作用域的 cookie 有 3 个
    expect(cookieStore.getCookies({ domain: "baidu.com" })).toHaveLength(3);
  });

  it("getCookiesMap", () => {
    const cookieStore = new CookieStore("cookie-getcookiesmap");

    cookieStore.set({ name: TEST_NAME, value: TEST_VALUE, domain: "baidu.com" });

    expect(cookieStore.getCookiesMap({ domain: "baidu.com" })[TEST_NAME]).toBe(TEST_VALUE);
  });

  it("delete", () => {
    const cookieStore = new CookieStore("cookie-delete");

    cookieStore.applyResponse(mockedResponse, "baidu.com");
    cookieStore.delete("EGG_SESSION", "baidu.com");

    expect(cookieStore.has("EGG_SESSION", "baidu.com")).toBe(false);
  });

  it("list()", () => {
    const cookieStore = new CookieStore("cookie-list");

    cookieStore.set({ name: TEST_NAME, value: TEST_VALUE, domain: "baidu.com" });

    expect(cookieStore.list()[".baidu.com"]).toBeTypeOf("object");
  });

  it("list() should include cookies stored on non-root paths", () => {
    const cookieStore = new CookieStore("cookie-list-paths");

    cookieStore.set({ name: "root", value: "1", domain: "baidu.com", path: "/" });
    cookieStore.set({ name: "api", value: "2", domain: "baidu.com", path: "/api" });

    expect(cookieStore.list()[".baidu.com"]).toStrictEqual({ api: "2", root: "1" });
  });

  it("list() should prefer the more specific path for a duplicated name", () => {
    const cookieStore = new CookieStore("cookie-list-path-priority");

    cookieStore.set({ name: "sid", value: "root", domain: "baidu.com", path: "/" });
    cookieStore.set({ name: "sid", value: "api", domain: "baidu.com", path: "/api" });

    expect(cookieStore.list()[".baidu.com"]).toStrictEqual({ sid: "api" });
  });

  it("list() should handle a cookie without a domain", () => {
    const cookieStore = new CookieStore("cookie-list-empty-domain");

    cookieStore.set({ name: "local", value: "1", domain: "" });

    expect(cookieStore.list()).toStrictEqual({ "": { local: "1" } });
  });

  it("list() should omit expired cookies", () => {
    vi.useFakeTimers();

    try {
      const cookieStore = new CookieStore("cookie-list-expired");

      cookieStore.set({ name: "short", value: "1", domain: "baidu.com", maxAge: 1 });
      vi.advanceTimersByTime(2000);

      expect(cookieStore.list()).toStrictEqual({ ".baidu.com": {} });
    } finally {
      vi.useRealTimers();
    }
  });

  it("clear", () => {
    const cookieStore = new CookieStore("cookie-clear");

    cookieStore.set({ name: "a", value: "1", domain: "baidu.com", path: "/" });
    cookieStore.set({ name: "b", value: "2", domain: "example.com", path: "/" });

    cookieStore.clear("baidu.com", true);

    expect(cookieStore.get("a", { domain: "baidu.com", path: "/" })).toBeNull();
    expect(cookieStore.get("b", { domain: "example.com", path: "/" })).not.toBeNull();

    cookieStore.clear();

    expect(cookieStore.getAllCookies()).toHaveLength(0);
  });

  it("clear should clean subdomain cookies when not exact", () => {
    const cookieStore = new CookieStore("cookie-clear-sub");

    cookieStore.set({ name: "a", value: "1", domain: "baidu.com", path: "/" });
    cookieStore.set({ name: "b", value: "2", domain: "sub.baidu.com", path: "/" });
    cookieStore.set({ name: "c", value: "3", domain: "example.com", path: "/" });

    cookieStore.clear("baidu.com");

    expect(cookieStore.get("a", { domain: "baidu.com", path: "/" })).toBeNull();
    expect(cookieStore.get("b", { domain: "sub.baidu.com", path: "/" })).toBeNull();
    expect(cookieStore.get("c", { domain: "example.com", path: "/" })).not.toBeNull();
  });
});

describe("cookie store extras", () => {
  it("apply should add cookies", () => {
    const store = new CookieStore("apply-test");

    store.apply([new Cookie({ name: "a", value: "1", domain: "example.com", path: "/" })]);

    expect(store.getHeader("example.com")).toBe("a=1");
  });

  it("getAllCookies should return all valid cookies", () => {
    const store = new CookieStore("all-test");

    store.set({ name: "a", value: "1", domain: "example.com" });
    store.set({ name: "b", value: "2", domain: "other.com" });

    expect(
      store
        .getAllCookies()
        .map((cookie) => cookie.name)
        .sort(),
    ).toStrictEqual(["a", "b"]);
  });

  it("should ignore expired cookies", () => {
    const store = new CookieStore("expired-test");

    store.set({ name: "a", value: "1", domain: "example.com", maxAge: -1 });

    expect(store.getCookies({ domain: "example.com" })).toStrictEqual([]);
    expect(store.getHeader("example.com")).toBe("");
  });

  it("applyHeader should parse string Set-Cookie", () => {
    const store = new CookieStore("apply-header-string-test");

    store.applyHeader({ "Set-Cookie": "a=1; Domain=example.com; Path=/" }, "example.com");

    expect(store.getHeader("example.com")).toBe("a=1");
  });

  it("applyHeader should parse array Set-Cookie", () => {
    const store = new CookieStore("apply-header-array-test");

    store.applyHeader({ "Set-Cookie": ["a=1; Path=/", "b=2; Path=/"] }, "example.com");

    expect(store.getHeader("example.com")).toBe("a=1; b=2");
  });

  it("applyHeader should parse lowercase set-cookie", () => {
    const store = new CookieStore("apply-header-lower-test");

    store.applyHeader({ "set-cookie": "a=1; Path=/" }, "example.com");

    expect(store.getHeader("example.com")).toBe("a=1");
  });

  it("set should overwrite existing cookie", () => {
    const store = new CookieStore("overwrite-test");

    store.set({ name: "a", value: "1", domain: "example.com", path: "/" });
    store.set({ name: "a", value: "2", domain: "example.com", path: "/" });

    expect(store.getValue("a", { domain: "example.com", path: "/" })).toBe("2");
  });

  it("should restore persisted cookies from storage", async () => {
    const store = new CookieStore("persist-restore-key");
    store.set({ name: "a", value: "1", domain: "example.com", path: "/", maxAge: 100 });

    // storage writes are batched into a microtask
    await Promise.resolve();

    const restored = new CookieStore("persist-restore-key");

    expect(restored.getValue("a", { domain: "example.com", path: "/" })).toBe("1");
  });

  it("should return null for a non-matching domain", () => {
    const store = new CookieStore("domain-mismatch-key");

    store.set({ name: "a", value: "1", domain: "example.com", path: "/" });

    expect(store.get("a", { domain: "other.com" })).toBeNull();
  });

  it("should not throw when writing storage fails", async () => {
    const wxAny = wx as unknown as {
      setStorageSync: (key: string, data: unknown) => void;
    };
    const original = wxAny.setStorageSync;

    wxAny.setStorageSync = (): void => {
      throw new Error("storage fail");
    };

    try {
      const store = new CookieStore("storage-fail-key");

      store.set({ name: "a", value: "1", domain: "example.com" });

      // the flush happens in a microtask, it must not throw / reject
      await expect(Promise.resolve()).resolves.toBeUndefined();
      expect(store.getAllCookies()).toHaveLength(1);
    } finally {
      wxAny.setStorageSync = original;
    }
  });

  it("should not throw when reading storage fails", () => {
    const wxAny = wx as unknown as {
      getStorageSync: (key: string) => unknown;
    };
    const original = wxAny.getStorageSync;

    wxAny.getStorageSync = (): never => {
      throw new Error("storage fail");
    };

    try {
      const store = new CookieStore("storage-read-fail-key");

      // storage is only read on the first operation
      expect(() => store.getAllCookies()).not.toThrow();
    } finally {
      wxAny.getStorageSync = original;
    }
  });

  it("should delete a cookie across all domains", () => {
    const store = new CookieStore("delete-all-key");

    store.set({ name: "a", value: "1", domain: "example.com", path: "/" });
    store.set({ name: "a", value: "2", domain: "other.com", path: "/" });

    store.delete("a");

    expect(store.get("a", { domain: "example.com", path: "/" })).toBeNull();
    expect(store.get("a", { domain: "other.com", path: "/" })).toBeNull();
  });

  it("should ignore a delete for a domain without cookies", () => {
    const store = new CookieStore("delete-unknown-domain");

    store.set({ name: "a", value: "1", domain: "example.com", path: "/" });

    store.delete("a", "other.com");

    expect(store.getValue("a", { domain: "example.com" })).toBe("1");
  });
});

describe("cookie domain validation", () => {
  it("should reject a Domain attribute that does not cover the response host", () => {
    const store = new CookieStore("domain-tossing");

    store.applyHeader(
      // 一个来自 bank.com 的响应试图把 cookie 写到 evil.com，甚至写到公共后缀 com
      { "Set-Cookie": "sid=1; Domain=evil.com; Path=/, attack=1; Domain=com; Path=/" },
      "bank.com",
    );

    expect(store.getHeader("bank.com")).toBe("");
    expect(store.getHeader("evil.com")).toBe("");
  });

  it("should accept a parent domain and scope the cookie to it", () => {
    const store = new CookieStore("parent-domain");

    store.applyHeader({ "Set-Cookie": "a=1; Domain=example.com; Path=/" }, "sub.example.com");

    expect(store.getHeader("example.com")).toBe("a=1");
    expect(store.getHeader("www.example.com")).toBe("a=1");
    // 必须是标签边界上的后缀匹配
    expect(store.getHeader("notexample.com")).toBe("");
  });

  it("should treat cookies without a Domain attribute as host-only", () => {
    const store = new CookieStore("host-only");

    store.applyHeader({ "Set-Cookie": "a=1; Path=/" }, "api.example.com");

    expect(store.getHeader("api.example.com")).toBe("a=1");
    // host-only cookie 不得泄漏到子域名或父域名
    expect(store.getHeader("www.api.example.com")).toBe("");
    expect(store.getHeader("example.com")).toBe("");
  });

  it("should keep host-only cookies host-only after a storage round trip", async () => {
    const store = new CookieStore("host-only-persist");

    store.applyHeader({ "Set-Cookie": "a=1; Path=/; Max-Age=3600" }, "api.example.com");

    await Promise.resolve();

    const restored = new CookieStore("host-only-persist");

    expect(restored.getHeader("api.example.com")).toBe("a=1");
    expect(restored.getHeader("www.api.example.com")).toBe("");
  });

  it("should only accept an exact match for IP address hosts", () => {
    const store = new CookieStore("ip-domain");

    store.applyHeader({ "Set-Cookie": "a=1; Domain=example.com; Path=/" }, "127.0.0.1");
    store.applyHeader({ "Set-Cookie": "b=2; Domain=127.0.0.1; Path=/" }, "127.0.0.1");

    expect(store.getHeader("127.0.0.1")).toBe("b=2");
  });
});

describe("cookie ordering", () => {
  it("should order cookies by path length", () => {
    const store = new CookieStore("cookie-order-path");

    store.set({ name: "a", value: "root", domain: "example.com", path: "/" });
    store.set({ name: "a", value: "admin", domain: "sub.example.com", path: "/admin" });

    // 两个 Cookie 都匹配 https://sub.example.com/admin/panel
    expect(
      store
        .getCookies({ domain: "sub.example.com", path: "/admin/panel" })
        .map(({ value }) => value),
    ).toStrictEqual(["admin", "root"]);
    expect(store.getHeader("https://sub.example.com/admin/panel")).toBe("a=admin; a=root");
    expect(store.getValue("a", { domain: "sub.example.com", path: "/admin/panel" })).toBe("admin");
    expect(store.getCookiesMap({ domain: "sub.example.com", path: "/admin/panel" })).toStrictEqual({
      a: "admin",
    });
  });

  it("should order cookies with the same path length by creation time", () => {
    const store = new CookieStore("cookie-order-created");

    store.apply([
      new Cookie({
        name: "a",
        value: "newer",
        domain: "sub.example.com",
        path: "/",
        createdAt: 2000,
      }),
      new Cookie({ name: "a", value: "older", domain: "example.com", path: "/", createdAt: 1000 }),
    ]);

    expect(store.getHeader("sub.example.com")).toBe("a=older; a=newer");
    expect(store.getValue("a", { domain: "sub.example.com", path: "/" })).toBe("older");
  });

  it("should keep the creation time when a cookie is updated", () => {
    const store = new CookieStore("cookie-order-update");

    store.apply([
      new Cookie({ name: "a", value: "1", domain: "example.com", path: "/", createdAt: 1000 }),
    ]);
    store.set({ name: "a", value: "2", domain: "example.com", path: "/" });

    expect(store.getValue("a", { domain: "example.com", path: "/" })).toBe("2");
    expect(store.get("a", { domain: "example.com", path: "/" })?.createdAt).toBe(1000);
  });

  it("should keep the order after a storage round trip", async () => {
    const store = new CookieStore("cookie-order-persist");

    store.apply([
      new Cookie({
        name: "a",
        value: "newer",
        domain: "sub.example.com",
        path: "/",
        createdAt: 2000,
        maxAge: 100,
      }),
      new Cookie({
        name: "a",
        value: "older",
        domain: "example.com",
        path: "/",
        createdAt: 1000,
        maxAge: 100,
      }),
    ]);

    await Promise.resolve();

    const restored = new CookieStore("cookie-order-persist");

    expect(restored.getHeader("sub.example.com")).toBe("a=older; a=newer");
  });
});

describe("cookie path keys", () => {
  it("should keep cookies with the same name on different paths", () => {
    const store = new CookieStore("cookie-path-keys");

    store.set({ name: "sid", value: "root", domain: "example.com", path: "/" });
    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin" });

    expect(store.getAllCookies()).toHaveLength(2);
    expect(store.getCookies({ domain: "example.com", path: "/admin/panel" })).toHaveLength(2);
    // 请求路径同时匹配多个 path 时，返回 path 更具体的那条
    expect(store.getValue("sid", { domain: "example.com", path: "/admin/panel" })).toBe("admin");
    expect(store.getValue("sid", { domain: "example.com", path: "/" })).toBe("root");
    expect(store.getValue("sid", { domain: "example.com", path: "/other" })).toBe("root");
    // 请求头按 path 长度降序拼接
    expect(store.getHeader({ domain: "example.com", path: "/admin/panel" })).toBe(
      "sid=admin; sid=root",
    );
  });

  it("should overwrite only the same name and path", () => {
    const store = new CookieStore("cookie-path-overwrite");

    store.set({ name: "sid", value: "root", domain: "example.com", path: "/" });
    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin" });
    store.set({ name: "sid", value: "root-2", domain: "example.com", path: "/" });

    expect(store.getAllCookies()).toHaveLength(2);
    expect(store.getValue("sid", { domain: "example.com", path: "/" })).toBe("root-2");
    expect(store.getValue("sid", { domain: "example.com", path: "/admin/panel" })).toBe("admin");
  });

  it("should apply Set-Cookie entries with the same name and different paths", () => {
    const store = new CookieStore("cookie-path-header");

    store.applyHeader({ "Set-Cookie": "sid=root; Path=/, sid=admin; Path=/admin" }, "example.com");

    expect(
      store
        .getCookies({ domain: "example.com", path: "/admin/panel" })
        .map((cookie) => cookie.value)
        .sort(),
    ).toStrictEqual(["admin", "root"]);
  });

  it("should delete a single path", () => {
    const store = new CookieStore("cookie-path-delete");

    store.set({ name: "sid", value: "root", domain: "example.com", path: "/" });
    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin" });

    store.delete("sid", "example.com", "/admin");

    expect(store.getAllCookies()).toHaveLength(1);
    expect(store.getValue("sid", { domain: "example.com", path: "/admin/panel" })).toBe("root");
  });

  it("should delete every path when no path is given", () => {
    const store = new CookieStore("cookie-path-delete-all");

    store.set({ name: "sid", value: "root", domain: "example.com", path: "/" });
    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin" });

    store.delete("sid", "example.com");

    expect(store.getAllCookies()).toHaveLength(0);
  });

  it("should drop the cookie name when its last path is deleted", () => {
    const store = new CookieStore("cookie-path-delete-last");

    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin" });

    store.delete("sid", "example.com", "/admin");

    expect(store.getAllCookies()).toStrictEqual([]);
    expect(store.has("sid", { domain: "example.com" })).toBe(false);
  });

  it("should clear every path of a domain", () => {
    const store = new CookieStore("cookie-path-clear");

    store.set({ name: "sid", value: "root", domain: "example.com", path: "/" });
    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin" });

    store.clear("example.com", true);

    expect(store.getAllCookies()).toHaveLength(0);
    expect(store.list()).toStrictEqual({});
  });

  it("should keep every path after a storage round trip", async () => {
    const store = new CookieStore("cookie-path-persist");

    store.set({ name: "sid", value: "root", domain: "example.com", path: "/", maxAge: 100 });
    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin", maxAge: 100 });

    await Promise.resolve();

    const restored = new CookieStore("cookie-path-persist");

    expect(restored.getAllCookies()).toHaveLength(2);
    expect(restored.getValue("sid", { domain: "example.com", path: "/admin/panel" })).toBe("admin");
    expect(restored.getHeader({ domain: "example.com", path: "/admin/panel" })).toBe(
      "sid=admin; sid=root",
    );
  });

  it("should restore legacy storage entries without a path as root cookies", () => {
    wx.setStorageSync("cookie-path-legacy", [
      { name: "legacy", value: "1", domain: "example.com" },
    ]);

    const store = new CookieStore("cookie-path-legacy");

    expect(store.getValue("legacy", { domain: "example.com", path: "/" })).toBe("1");
  });
});

describe("cookie storage", () => {
  it("should not read storage before the first operation", () => {
    const getStorageSync = vi.spyOn(wx, "getStorageSync");

    const store = new CookieStore("storage-lazy-read");

    expect(getStorageSync).not.toHaveBeenCalled();

    // the first read triggers the lazy load
    expect(store.getAllCookies()).toStrictEqual([]);
    expect(getStorageSync).toHaveBeenCalledTimes(1);

    getStorageSync.mockRestore();
  });

  it("should not read storage when the request module is imported", async () => {
    const getStorageSync = vi.spyOn(wx, "getStorageSync");

    // @ts-expect-error: query suffix for fresh module evaluation
    await import("../src/request.js?lazy-storage");

    expect(getStorageSync).not.toHaveBeenCalled();

    getStorageSync.mockRestore();
  });

  it("should batch mutations into a single storage write", async () => {
    const store = new CookieStore("storage-batch");

    // flush writes from previous tests and load the store before spying
    await Promise.resolve();
    store.getAllCookies();

    const setStorageSync = vi.spyOn(wx, "setStorageSync");

    store.set({ name: "a", value: "1", domain: "example.com" });
    store.set({ name: "b", value: "2", domain: "example.com" });
    store.delete("missing");

    expect(setStorageSync).not.toHaveBeenCalled();

    await Promise.resolve();

    expect(setStorageSync).toHaveBeenCalledTimes(1);

    setStorageSync.mockRestore();
  });

  it("should not write storage when there is nothing to apply", async () => {
    const store = new CookieStore("storage-empty-apply");

    await Promise.resolve();
    store.getAllCookies();

    const setStorageSync = vi.spyOn(wx, "setStorageSync");

    store.apply([]);

    await Promise.resolve();

    expect(setStorageSync).not.toHaveBeenCalled();

    setStorageSync.mockRestore();
  });

  it("should drop a cookie that exceeds the size limit", () => {
    const store = new CookieStore("storage-cookie-size");

    store.set({ name: "big", value: "a".repeat(4096), domain: "example.com" });
    store.set({ name: "small", value: "a", domain: "example.com" });

    expect(store.getAllCookies()).toHaveLength(1);
    expect(store.get("big", { domain: "example.com" })).toBeNull();
    expect(store.get("small", { domain: "example.com" })).not.toBeNull();
  });

  it("should count the UTF-8 byte length of multibyte cookie values", () => {
    const store = new CookieStore("storage-cookie-utf8-size");

    store.set({ name: "two", value: "é", domain: "example.com" });
    store.set({ name: "three", value: "中", domain: "example.com" });
    store.set({ name: "four", value: "😀", domain: "example.com" });

    expect(store.getAllCookies()).toHaveLength(3);
  });

  it("should skip persisted entries without a valid name", () => {
    wx.setStorageSync("storage-invalid-entries", [
      // a legacy entry without a name must be ignored instead of stored as ""
      { value: "1", domain: "example.com" },
      { name: "no-value", domain: "example.com" },
      { name: "bad;name", value: "1", domain: "example.com" },
      { name: "kept", value: "3", domain: "example.com" },
    ] as unknown as CookieType[]);

    const store = new CookieStore("storage-invalid-entries");

    expect(
      store
        .getAllCookies()
        .map(({ name }) => name)
        .sort(),
    ).toStrictEqual(["kept", "no-value"]);
  });

  it("should prune a cookie that expires before the batched write", async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });

    try {
      const key = "storage-expire-before-save";
      const store = new CookieStore(key);

      // live for one second
      store.set({ name: "soon", value: "1", domain: "example.com", maxAge: 1 });

      // expire it before the batched write is flushed
      vi.setSystemTime(Date.now() + 2000);

      await Promise.resolve();

      // the expired cookie is pruned instead of being persisted
      expect(wx.getStorageSync(key)).toStrictEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should skip a persisted cookie that is already expired", () => {
    wx.setStorageSync("storage-expired-entry", [
      {
        name: "dead",
        value: "1",
        domain: "example.com",
        expires: new Date(Date.now() - 1000),
      },
    ] as CookieType[]);

    const store = new CookieStore("storage-expired-entry");

    expect(store.getAllCookies()).toStrictEqual([]);
  });

  it("should not return a cookie that expired while in the store", () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });

    try {
      const store = new CookieStore("storage-expire-after-set");

      store.set({ name: "soon", value: "1", domain: "example.com", maxAge: 1 });
      vi.setSystemTime(Date.now() + 2000);

      // reading before the batched write must already filter the expired cookie
      expect(store.getAllCookies()).toStrictEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should keep the other paths of a cookie name evicted by the domain limit", () => {
    const store = new CookieStore("storage-domain-limit-paths");
    const cookies = [
      new Cookie({ name: "old", value: "1", domain: "example.com", path: "/a", createdAt: 1 }),
      new Cookie({ name: "old", value: "2", domain: "example.com", path: "/b", createdAt: 2 }),
    ];

    for (let index = 0; index < 49; index += 1) {
      cookies.push(
        new Cookie({
          name: `c${index}`,
          value: `${index}`,
          domain: "example.com",
          path: "/",
          createdAt: 3 + index,
        }),
      );
    }

    // the 51st cookie evicts the oldest one, whose name still has another path
    store.apply(cookies);

    expect(store.getAllCookies()).toHaveLength(50);
    expect(store.getValue("old", { domain: "example.com", path: "/a" })).toBeUndefined();
    expect(store.getValue("old", { domain: "example.com", path: "/b" })).toBe("2");
  });

  it("should keep the other paths of a cookie name evicted by the total limit", () => {
    const store = new CookieStore("storage-total-limit-paths");

    // 2999 live cookies: 59 domains with 50 cookies plus one with 49
    for (let domainIndex = 0; domainIndex < 59; domainIndex += 1) {
      for (let index = 0; index < 50; index += 1) {
        store.set({
          name: `c${index}`,
          value: `${index}`,
          domain: `d${domainIndex}.example.com`,
        });
      }
    }

    for (let index = 0; index < 49; index += 1)
      store.set({ name: `c${index}`, value: `${index}`, domain: "d59.example.com" });

    // the first extra cookie fills the store, the second one evicts the oldest
    store.apply([
      new Cookie({ name: "old", value: "1", domain: "d60.example.com", path: "/a", createdAt: 1 }),
      new Cookie({ name: "old", value: "2", domain: "d60.example.com", path: "/b", createdAt: 2 }),
    ]);

    expect(store.getAllCookies()).toHaveLength(3000);
    expect(store.getValue("old", { domain: "d60.example.com", path: "/a" })).toBeUndefined();
    expect(store.getValue("old", { domain: "d60.example.com", path: "/b" })).toBe("2");
  });

  it("should evict the oldest cookies when a domain exceeds the limit", () => {
    const store = new CookieStore("storage-domain-limit");

    for (let index = 0; index < 51; index += 1)
      store.set({ name: `c${index}`, value: `${index}`, domain: "example.com" });

    expect(store.getAllCookies()).toHaveLength(50);
    expect(store.get("c0", { domain: "example.com" })).toBeNull();
    expect(store.get("c50", { domain: "example.com" })).not.toBeNull();
  });

  it("should evict the oldest cookies when the total exceeds the limit", () => {
    const store = new CookieStore("storage-total-limit");

    // 61 domains x 50 cookies: the per-domain limit stays intact, the total limit kicks in
    for (let domainIndex = 0; domainIndex < 61; domainIndex += 1) {
      for (let index = 0; index < 50; index += 1) {
        store.set({
          name: `c${index}`,
          value: `${index}`,
          domain: `d${domainIndex}.example.com`,
        });
      }
    }

    expect(store.getAllCookies()).toHaveLength(3000);
    expect(store.get("c0", { domain: "d0.example.com" })).toBeNull();
    expect(store.get("c49", { domain: "d60.example.com" })).not.toBeNull();
  });

  it("should remove an expired cookie instead of evicting a live one", () => {
    const store = new CookieStore("storage-expired-limit");

    for (let index = 0; index < 50; index += 1)
      store.set({ name: `c${index}`, value: `${index}`, domain: "example.com" });

    // an expired cookie must free its slot instead of evicting the oldest live cookie
    store.set({ name: "dead", value: "", domain: "example.com", maxAge: -1 });

    expect(store.getAllCookies()).toHaveLength(50);
    expect(store.get("c0", { domain: "example.com" })).not.toBeNull();
    expect(store.get("dead", { domain: "example.com" })).toBeNull();
  });

  it("should delete an existing cookie when an expired one is set", () => {
    const store = new CookieStore("storage-expired-delete");

    store.set({ name: "a", value: "1", domain: "example.com", maxAge: 100 });
    store.set({ name: "a", value: "", domain: "example.com", maxAge: 0 });

    expect(store.get("a", { domain: "example.com" })).toBeNull();
  });
});

describe("cookie security", () => {
  it("should keep response cookies without the Secure attribute", () => {
    const store = new CookieStore("cookie-security-non-secure");

    store.applyHeader({ "Set-Cookie": "a=1; Path=/" }, "example.com");

    // 标准语义：没有 Secure 只是不限制传输协议，HTTPS 正常携带
    expect(store.getHeader("https://example.com/")).toBe("a=1");
    expect(store.getHeader("http://example.com/")).toBe("a=1");
  });

  it("should persist Secure and SameSite attributes across a storage round trip", async () => {
    const store = new CookieStore("cookie-security-roundtrip");

    store.applyHeader(
      { "Set-Cookie": "sid=1; Path=/; Max-Age=3600; Secure; SameSite=Strict" },
      "example.com",
    );

    await Promise.resolve();

    const restored = new CookieStore("cookie-security-roundtrip");
    const cookie = restored.get("sid", { domain: "example.com", path: "/" });

    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("strict");
    expect(restored.getHeader("https://example.com/")).toBe("sid=1");
  });

  it("should not send Secure cookies over an insecure request", () => {
    const store = new CookieStore("cookie-security-http");

    store.applyHeader({ "Set-Cookie": "sid=1; Path=/; Secure" }, "example.com");

    expect(store.getHeader("https://example.com/")).toBe("sid=1");
    expect(store.getHeader("http://example.com/")).toBe("");
  });
});

describe("cookie domain normalization", () => {
  it("should lowercase the domain and match uppercase request hosts", () => {
    const store = new CookieStore("cookie-domain-case");

    store.applyHeader({ "Set-Cookie": "a=1; Domain=Example.COM; Path=/" }, "example.com");

    expect(store.getHeader("https://example.com/")).toBe("a=1");
    expect(store.getHeader("https://EXAMPLE.com/")).toBe("a=1");
  });

  it("should keep the path when the request host has uppercase letters", () => {
    const store = new CookieStore("cookie-domain-case-path");

    store.applyHeader({ "Set-Cookie": "a=1; Path=/API; Secure" }, "example.com");

    expect(store.getHeader("https://Example.COM/API")).toBe("a=1");
    expect(store.getHeader("https://Example.COM/api")).toBe("");
  });

  it("should reject cookies with control characters", () => {
    const store = new CookieStore("cookie-invalid-chars");

    store.applyHeader({ "Set-Cookie": "a=bad\u0000value; Path=/" }, "example.com");

    expect(store.getAllCookies()).toHaveLength(0);
    expect(() => store.set({ name: "a", value: "bad\rvalue", domain: "example.com" })).toThrow(
      new TypeError("Invalid cookie name or value"),
    );
  });
});

describe("cookie scope validation", () => {
  it("should reject path-only scopes but accept the object form", () => {
    const store = new CookieStore("cookie-path-only");

    store.applyHeader({ "Set-Cookie": "a=1; Path=/" }, "example.com");

    expect(() => store.getHeader("/")).toThrow(
      new TypeError('Cookie scope must include a domain: "/"'),
    );
    expect(() => store.getCookies("/api")).toThrow(TypeError);
    expect(() => store.applyHeader({ "Set-Cookie": "b=2; Path=/" }, "/")).toThrow(TypeError);

    // 只知道路径时使用对象形式
    expect(store.getHeader({ path: "/" })).toBe("a=1");
  });
});

import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { Cookie } from "../src/cookie.js";
import { CookieStore } from "../src/index.js";

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

  it("should restore persisted cookies from storage", () => {
    const store = new CookieStore("persist-restore-key");
    store.set({ name: "a", value: "1", domain: "example.com", path: "/", maxAge: 100 });

    const restored = new CookieStore("persist-restore-key");

    expect(restored.getValue("a", { domain: "example.com", path: "/" })).toBe("1");
  });

  it("should return null for a non-matching domain", () => {
    const store = new CookieStore("domain-mismatch-key");

    store.set({ name: "a", value: "1", domain: "example.com", path: "/" });

    expect(store.get("a", { domain: "other.com" })).toBeNull();
  });

  it("should not throw when writing storage fails", () => {
    const wxAny = wx as unknown as {
      setStorageSync: (key: string, data: unknown) => void;
    };
    const original = wxAny.setStorageSync;

    wxAny.setStorageSync = (): void => {
      throw new Error("storage fail");
    };

    try {
      expect(() => {
        const store = new CookieStore("storage-fail-key");

        store.set({ name: "a", value: "1", domain: "example.com" });
      }).not.toThrow();
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
      expect(() => new CookieStore("storage-read-fail-key")).not.toThrow();
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

  it("should keep host-only cookies host-only after a storage round trip", () => {
    const store = new CookieStore("host-only-persist");

    store.applyHeader({ "Set-Cookie": "a=1; Path=/; Max-Age=3600" }, "api.example.com");

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

  it("should keep the order after a storage round trip", () => {
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

  it("should clear every path of a domain", () => {
    const store = new CookieStore("cookie-path-clear");

    store.set({ name: "sid", value: "root", domain: "example.com", path: "/" });
    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin" });

    store.clear("example.com", true);

    expect(store.getAllCookies()).toHaveLength(0);
    expect(store.list()).toStrictEqual({});
  });

  it("should keep every path after a storage round trip", () => {
    const store = new CookieStore("cookie-path-persist");

    store.set({ name: "sid", value: "root", domain: "example.com", path: "/", maxAge: 100 });
    store.set({ name: "sid", value: "admin", domain: "example.com", path: "/admin", maxAge: 100 });

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

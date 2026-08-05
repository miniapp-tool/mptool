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
  const cookieStore = new CookieStore();

  it("request", () => {
    cookieStore.applyResponse(mockedResponse, "baidu.com");

    expect(cookieStore.getHeader("baidu.com")).toBe(
      "EGG_SESSION=cQgFSy2NnOAAqWu7YUVVEoFWkf2YxXL1pi4GYPBl9ieUPI_YSy6LBvs7lsxB52cZ; PSINO=7; dwf_sg_task_completion=False",
    );
  });

  it("set", () => {
    const result = cookieStore.set({
      name: TEST_NAME,
      value: TEST_VALUE,
      domain: "baidu.com",
    });

    expect(result.value).toBe(TEST_VALUE);
  });

  it("has", () => {
    expect(cookieStore.has(TEST_NAME, { domain: "baidu.com" })).toBe(true);
  });

  it("get", () => {
    const result = cookieStore.get(TEST_NAME, { domain: "baidu.com" })!;

    expect(result).toBeInstanceOf(Cookie);
    expect(result.name).toBe(TEST_NAME);
  });

  it("getValue", () => {
    expect(cookieStore.getValue(TEST_NAME, { domain: "baidu.com" })).toBe(TEST_VALUE);
  });

  it("getCookies", () => {
    const result = cookieStore.getCookies({ domain: "baidu.com" });

    expect(result).toHaveLength(4);
  });

  it("getCookiesMap", () => {
    const result = cookieStore.getCookiesMap({ domain: "baidu.com" });

    expect(result[TEST_NAME]).toBe(TEST_VALUE);
  });

  it("delete", () => {
    cookieStore.delete("EGG_SESSION", "baidu.com");

    expect(cookieStore.has("EGG_SESSION", "baidu.com")).toBe(false);
  });

  it("list()", () => {
    const result = cookieStore.list();

    expect(result["baidu.com"]).toBeTypeOf("object");
  });

  it("clear", () => {
    cookieStore.clear("baidu.com", true);

    expect(cookieStore.getCookies({ domain: "baidu.com" })).toHaveLength(1);

    cookieStore.clear(".baidu.com");
    expect(cookieStore.getCookies({ domain: "baidu.com" })).toHaveLength(0);

    const result1 = cookieStore.getAllCookies();

    cookieStore.clear();
    const result2 = cookieStore.getAllCookies();

    expect(result1).not.toHaveLength(result2.length);
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
    const mockSetStorageSync = wx as unknown as {
      setStorageSync: (key: string, data: unknown) => void;
    };

    mockSetStorageSync.setStorageSync = (): void => {
      throw new Error("storage fail");
    };

    expect(() => {
      const store = new CookieStore("storage-fail-key");

      store.set({ name: "a", value: "1", domain: "example.com" });
    }).not.toThrow();
  });

  it("should not throw when reading storage fails", () => {
    const mockGetStorageSync = wx as unknown as {
      getStorageSync: (key: string) => unknown;
    };

    mockGetStorageSync.getStorageSync = (): never => {
      throw new Error("storage fail");
    };

    expect(() => new CookieStore("storage-read-fail-key")).not.toThrow();
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

import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { Cookie } from "../src/cookie.js";
import { CookieStore } from "../src/index.js";

const cookieStore = new CookieStore();

const mockedResponse = {
  header: {
    "Set-Cookie":
      "EGG_SESSION=cQgFSy2NnOAAqWu7YUVVEoFWkf2YxXL1pi4GYPBl9ieUPI_YSy6LBvs7lsxB52cZ; domain=baidu.com; path=/; expires=Fri, 27 Jul 9999 04:02:51 GMT; httponly, dwf_sg_task_completion=False; expires=Sat, 25-Aug-2020 04:04:04 GMT; Max-Age=2592000; Path=/; secure;, PSINO=7; domain=.baidu.com; path=/,prod_crm_session=gBz4cg45F7A5TwRuSNgOw5xSRilpiec9Mht7bS9a; expires=Thu, 26-Jul-2020 06:14:05 GMT; Max-Age=2592000; path=/; domain=.taobao.com; httponly",
  },
} as unknown as WechatMiniprogram.RequestSuccessCallbackResult;

const TEST_NAME = "session_id";
const TEST_VALUE = "session_id_value";

describe("cookies", () => {
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
    expect(cookieStore.has(TEST_NAME, { domain: "baidu.com" })).toBeTruthy();
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

    expect(result.length).toBe(4);
  });

  it("getCookiesMap", () => {
    const result = cookieStore.getCookiesMap({ domain: "baidu.com" });

    expect(result[TEST_NAME]).toBe(TEST_VALUE);
  });

  it("delete", () => {
    cookieStore.delete("EGG_SESSION", "baidu.com");

    expect(cookieStore.has("EGG_SESSION", "baidu.com")).toBeFalsy();
  });

  it("list()", () => {
    const result = cookieStore.list();

    expect(result["baidu.com"]).toBeTypeOf("object");
  });

  it("clear", () => {
    cookieStore.clear("baidu.com", true);

    expect(cookieStore.getCookies({ domain: "baidu.com" }).length).toBe(1);

    cookieStore.clear(".baidu.com");
    expect(cookieStore.getCookies({ domain: "baidu.com" }).length).toBe(0);

    const result1 = cookieStore.getAllCookies();

    cookieStore.clear();
    const result2 = cookieStore.getAllCookies();

    expect(result1.length).not.toBe(result2.length);
  });
});

import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { CookieStore } from "../src/cookieStore.js";
import { Headers, URLSearchParams, createRequest, request } from "../src/index.js";

interface MockRequestCall {
  method: string;
  url: string;
  header: Record<string, string>;
  data: unknown;
}

const mockRequest = (fail = false): MockRequestCall[] => {
  const calls: MockRequestCall[] = [];
  const mockRequestApi = wx as unknown as {
    request: (option: {
      url: string;
      method: string;
      header: Record<string, string>;
      data: unknown;
      success?: (result: {
        data: unknown;
        statusCode: number;
        header: Record<string, string>;
      }) => void;
      fail?: (result: { errMsg: string; errno?: number }) => void;
    }) => void;
  };

  mockRequestApi.request = (option): void => {
    calls.push({
      method: option.method,
      url: option.url,
      header: option.header,
      data: option.data,
    });

    if (fail) option.fail?.({ errMsg: "request fail", errno: 2001 });
    else option.success?.({ data: {}, statusCode: 200, header: {} });
  };

  return calls;
};

describe(request, () => {
  it("should resolve a successful request", async () => {
    mockRequest();

    const res = await request("https://example.com/api");

    expect(res.status).toBe(200);
    expect(res.data).toStrictEqual({});
    expect(res.headers).toBeInstanceOf(Headers);
  });

  it("should uppercase method and set json content-type for plain object body", async () => {
    const calls = mockRequest();

    await request("https://example.com/api", { method: "post", body: { a: 1 } });

    const [call] = calls;

    expect(call.method).toBe("POST");
    expect(call.header["content-type"]).toBe("application/json; charset=UTF-8");
    expect(call.data).toStrictEqual({ a: 1 });
  });

  it("should set form content-type for URLSearchParams body", async () => {
    const calls = mockRequest();

    await request("https://example.com/api", { body: new URLSearchParams({ a: "1", b: "2" }) });

    const [call] = calls;

    expect(call.header["content-type"]).toBe("application/x-www-form-urlencoded; charset=UTF-8");
    expect(call.data).toBe("a=1&b=2");
  });

  it("should set octet-stream content-type for ArrayBuffer body", async () => {
    const calls = mockRequest();
    const { buffer } = new TextEncoder().encode("data");

    await request("https://example.com/api", { body: buffer });

    const [call] = calls;

    expect(call.header["content-type"]).toBe("application/octet-stream; charset=UTF-8");
    expect(call.data).toBe(buffer);
  });

  it("should keep user provided content-type", async () => {
    const calls = mockRequest();

    await request("https://example.com/api", {
      headers: { "Content-Type": "text/plain" },
      body: { a: 1 },
    });

    const [call] = calls;

    expect(call.header["content-type"]).toBe("text/plain");
  });

  it("should inject cookie header from cookie store", async () => {
    const calls = mockRequest();
    const cookieStore = new CookieStore("request-cookie-test");
    cookieStore.set({ name: "session", value: "abc", domain: "example.com", path: "/" });

    await request("https://example.com/api", { cookieStore });

    const [call] = calls;

    expect(call.header.cookie).toContain("session=abc");
  });

  it("should reject with MpError when request fails", async () => {
    mockRequest(true);

    await expect(request("https://example.com/api")).rejects.toThrow("request fail");
  });
});

describe(createRequest, () => {
  it("should throw when no server is provided for a relative url", () => {
    const { request: req } = createRequest();

    expect(() => req("/api")).toThrow("No server provided");
  });

  it("should prepend server to relative url", async () => {
    const calls = mockRequest();
    const { request: req } = createRequest({ server: "https://example.com/" });

    const res = await req("/api");

    expect(res.status).toBe(200);

    const [call] = calls;

    expect(call.url).toBe("https://example.com/api");
  });

  it("should keep absolute url", async () => {
    const calls = mockRequest();
    const { request: req } = createRequest({ server: "https://example.com" });

    const res = await req("https://other.com/api");

    expect(res.status).toBe(200);

    const [call] = calls;

    expect(call.url).toBe("https://other.com/api");
  });
});

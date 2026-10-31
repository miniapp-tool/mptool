import { describe, expect, it } from "vitest";

import type { CookieOptions } from "../src/utils.js";
import { getUrlInfo, getDomain, parseUrl } from "../src/utils.js";

describe(parseUrl, () => {
  it("should parse root url", () => {
    expect(parseUrl("https://example.com")).toStrictEqual({
      domain: "example.com",
      path: "/",
    });
    expect(parseUrl("https://example.com?a=1")).toStrictEqual({
      domain: "example.com",
      path: "/",
    });
    expect(parseUrl("https://example.com#a")).toStrictEqual({
      domain: "example.com",
      path: "/",
    });
    expect(parseUrl("https://example.com/?a=1")).toStrictEqual({
      domain: "example.com",
      path: "/",
    });
    expect(parseUrl("https://example.com/#a")).toStrictEqual({
      domain: "example.com",
      path: "/",
    });
    expect(parseUrl("https://example.com/#a?a=1&b=2")).toStrictEqual({
      domain: "example.com",
      path: "/",
    });
    expect(parseUrl("https://example.com/?a=1&b=2#a")).toStrictEqual({
      domain: "example.com",
      path: "/",
    });
    expect(parseUrl("//example.com/?a=1")).toStrictEqual({
      domain: "example.com",
      path: "/",
    });
  });

  it("should parse url", () => {
    expect(parseUrl("https://example.com/a.jpg")).toStrictEqual({
      domain: "example.com",
      path: "/a.jpg",
    });
    expect(parseUrl("https://example.com/a.jpg?a=1")).toStrictEqual({
      domain: "example.com",
      path: "/a.jpg",
    });
    expect(parseUrl("https://example.com/a.jpg#a")).toStrictEqual({
      domain: "example.com",
      path: "/a.jpg",
    });
    expect(parseUrl("https://example.com/a.jpg?a=1#a")).toStrictEqual({
      domain: "example.com",
      path: "/a.jpg",
    });
    expect(parseUrl("https://example.com/a.jpg#a?a=1")).toStrictEqual({
      domain: "example.com",
      path: "/a.jpg",
    });
    expect(parseUrl("https://example.com/a/b.html")).toStrictEqual({
      domain: "example.com",
      path: "/a/b.html",
    });
  });

  it("should parse domain url with port", () => {
    expect(parseUrl("https://example.com:443/a/b.html")).toStrictEqual({
      domain: "example.com",
      path: "/a/b.html",
    });
    expect(parseUrl("https://example.com:443/a/b.html?a=1")).toStrictEqual({
      domain: "example.com",
      path: "/a/b.html",
    });
    expect(parseUrl("https://example.com:443/a/b.html#a")).toStrictEqual({
      domain: "example.com",
      path: "/a/b.html",
    });
    expect(parseUrl("https://example.com:443/a/b.html#a?a=1")).toStrictEqual({
      domain: "example.com",
      path: "/a/b.html",
    });
    expect(parseUrl("https://example.com:443/a/b.html?a=1#a")).toStrictEqual({
      domain: "example.com",
      path: "/a/b.html",
    });
  });

  it("should parse sub-domain url", () => {
    expect(parseUrl("https://sub.example.com")).toStrictEqual({
      domain: "sub.example.com",
      path: "/",
    });
    expect(parseUrl("https://sub.example.com/a.jpg")).toStrictEqual({
      domain: "sub.example.com",
      path: "/a.jpg",
    });

    expect(parseUrl("https://sub.example.com/a/b.html")).toStrictEqual({
      domain: "sub.example.com",
      path: "/a/b.html",
    });
    expect(parseUrl("https://sub.example.com:443/a/b.html")).toStrictEqual({
      domain: "sub.example.com",
      path: "/a/b.html",
    });

    expect(parseUrl("sub.example.com")).toStrictEqual({
      domain: "sub.example.com",
      path: "/",
    });
  });
});

describe(getDomain, () => {
  it("should strip the hash and the query string", () => {
    expect(getDomain("https://example.com/a?b=1#c")).toBe("example.com");
    expect(getDomain("https://example.com:8080/a#c")).toBe("example.com");
    expect(getDomain("example.com#c?a=1")).toBe("example.com");
    expect(getDomain("example.com#")).toBe("example.com");
    expect(getDomain("#fragment")).toBe("");
  });

  it("should accept an upper-case scheme", () => {
    expect(getDomain("HTTPS://Example.COM/api")).toBe("example.com");
    expect(getDomain("HTTP://Example.COM:8080/api?a=1")).toBe("example.com");
  });

  it("should accept a protocol-relative url", () => {
    expect(getDomain("//Example.COM/api")).toBe("example.com");
    expect(getDomain("//Example.COM:8080/api?b=2")).toBe("example.com");
  });
});

describe(getUrlInfo, () => {
  it("should parse a url string", () => {
    expect(getUrlInfo("https://example.com/a/b")).toStrictEqual({
      domain: ".example.com",
      path: "/a/b",
    });
  });

  it("should use object options with defaults", () => {
    expect(getUrlInfo({ domain: "example.com" })).toStrictEqual({
      domain: ".example.com",
      path: "/",
    });
  });

  it("should fall back to an empty scope for a non-string, non-object input", () => {
    // JavaScript callers can omit the argument even though the type requires it
    expect(getUrlInfo(undefined as unknown as CookieOptions)).toStrictEqual({
      domain: "",
      path: "/",
    });
  });

  it("should reject inputs without a domain", () => {
    for (const input of ["", "/", "/api", "api/x", "https://"]) {
      expect(() => parseUrl(input)).toThrow(
        new TypeError(`Cookie scope must include a domain: "${input}"`),
      );
    }
  });

  it("should accept bare domains and localhost", () => {
    expect(parseUrl("example.com:8080/api")).toStrictEqual({
      domain: "example.com",
      path: "/api",
    });
    expect(parseUrl("localhost:8080/api")).toStrictEqual({
      domain: "localhost",
      path: "/api",
    });
  });
});

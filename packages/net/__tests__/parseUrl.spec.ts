import { describe, expect, it } from "vitest";

import { getUrlInfo, parseUrl } from "../src/utils.js";

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
});

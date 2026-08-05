import { describe, expect, it } from "vitest";

import { Cookie } from "../src/cookie.js";

describe(Cookie, () => {
  it("should use session expiry by default", () => {
    const cookie = new Cookie({ name: "a", value: "b", domain: "example.com" });

    expect(cookie.expires).toBe("session");
    expect(cookie.isExpired()).toBe(false);
    expect(cookie.isPersistence()).toBe(false);
  });

  it("should be outdate for non-positive maxAge", () => {
    const cookie = new Cookie({ name: "a", value: "b", domain: "example.com", maxAge: 0 });

    expect(cookie.expires).toBe("outdate");
    expect(cookie.isExpired()).toBe(true);
  });

  it("should compute expires from maxAge", () => {
    const cookie = new Cookie({ name: "a", value: "b", domain: "example.com", maxAge: 100 });

    expect(cookie.expires).toBeInstanceOf(Date);
    expect(cookie.isPersistence()).toBe(true);
  });

  it("should use expires date", () => {
    const cookie = new Cookie({
      name: "a",
      value: "b",
      domain: "example.com",
      expires: new Date(Date.now() + 1000),
    });

    expect(cookie.expires).toBeInstanceOf(Date);
  });

  it("isDomainMatched", () => {
    const cookie = new Cookie({ name: "a", value: "b", domain: ".example.com" });

    expect(cookie.isDomainMatched("example.com")).toBe(true);
    expect(cookie.isDomainMatched("other.com")).toBe(false);
  });

  it("isPathMatched", () => {
    const cookie = new Cookie({ name: "a", value: "b", domain: "example.com", path: "/foo" });

    expect(cookie.isPathMatched("/foo")).toBe(true);
    expect(cookie.isPathMatched("/foo/bar")).toBe(true);
    expect(cookie.isPathMatched("/bar")).toBe(false);
    expect(cookie.isPathMatched("/foobar")).toBe(false);
  });

  it("isPathMatched with trailing slash", () => {
    const cookie = new Cookie({ name: "a", value: "b", domain: "example.com", path: "/foo/" });

    expect(cookie.isPathMatched("/foo")).toBe(true);
    expect(cookie.isPathMatched("/foo/bar")).toBe(true);
    expect(cookie.isPathMatched("/foobar")).toBe(false);
  });

  it("isPathMatched with root path", () => {
    const cookie = new Cookie({ name: "a", value: "b", domain: "example.com", path: "/" });

    expect(cookie.isPathMatched("/foo")).toBe(true);
    expect(cookie.isPathMatched("/foo/bar")).toBe(true);
  });

  it("toString", () => {
    const cookie = new Cookie({ name: "a", value: "b" });

    expect(cookie.toString()).toBe("a=b");
  });

  it("toJSON", () => {
    const cookie = new Cookie({
      name: "a",
      value: "b",
      domain: "example.com",
      path: "/x",
      httpOnly: true,
      expires: new Date(Date.now() + 1000),
    });
    const json = cookie.toJSON();

    expect(json.name).toBe("a");
    expect(json.path).toBe("/x");
    expect(json.httpOnly).toBe(true);
    expect(json.expires).toBeInstanceOf(Date);
  });

  it("toJSON with defaults", () => {
    const cookie = new Cookie({ name: "a", value: "b" });
    const json = cookie.toJSON();

    expect(json.path).toBeUndefined();
    expect(json.httpOnly).toBeUndefined();
  });
});

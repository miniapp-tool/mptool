import { describe, expect, it } from "vitest";

import { getCookieScopeDomain } from "../src/utils.js";

describe(getCookieScopeDomain, () => {
  it("should normalize domain", () => {
    expect(getCookieScopeDomain("example.com")).toStrictEqual([
      "example.com",
      ".example.com",
      ".com",
    ]);
    expect(getCookieScopeDomain(".example.com")).toStrictEqual([
      "example.com",
      ".example.com",
      ".com",
    ]);

    expect(getCookieScopeDomain("example.com.")).toStrictEqual([
      "example.com",
      ".example.com",
      ".com",
    ]);
    expect(getCookieScopeDomain(".example.com.")).toStrictEqual([
      "example.com",
      ".example.com",
      ".com",
    ]);

    expect(getCookieScopeDomain("abc.example.com")).toStrictEqual([
      "abc.example.com",
      ".abc.example.com",
      ".example.com",
      ".com",
    ]);
    expect(getCookieScopeDomain(".abc.example.com")).toStrictEqual([
      "abc.example.com",
      ".abc.example.com",
      ".example.com",
      ".com",
    ]);

    expect(getCookieScopeDomain("abc.example.com.")).toStrictEqual([
      "abc.example.com",
      ".abc.example.com",
      ".example.com",
      ".com",
    ]);
    expect(getCookieScopeDomain(".abc.example.com.")).toStrictEqual([
      "abc.example.com",
      ".abc.example.com",
      ".example.com",
      ".com",
    ]);
  });

  it("should return empty array for empty domain", () => {
    expect(getCookieScopeDomain()).toStrictEqual([]);
    expect(getCookieScopeDomain("")).toStrictEqual([]);
  });

  it("should not duplicate scopes for repeated labels", () => {
    expect(getCookieScopeDomain("com.com")).toStrictEqual(["com.com", ".com.com", ".com"]);
  });
});

import { describe, expect, it } from "vitest";

import { getCookieScopeDomain } from "../src/utils.js";

describe("normalizeDomain", () => {
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
});

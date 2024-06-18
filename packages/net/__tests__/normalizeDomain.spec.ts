import { describe, expect, it } from "vitest";

import { normalizeDomain } from "../src/utils.js";

describe("normalizeDomain", () => {
  it("should normalize domain", () => {
    expect(normalizeDomain("")).toBe("");
    expect(normalizeDomain("example.com")).toBe(".example.com");
    expect(normalizeDomain(".example.com")).toBe(".example.com");
    expect(normalizeDomain("example.com.")).toBe(".example.com");
    expect(normalizeDomain(".example.com.")).toBe(".example.com");
    expect(normalizeDomain("abc.example.com.")).toBe(".abc.example.com");
  });
});

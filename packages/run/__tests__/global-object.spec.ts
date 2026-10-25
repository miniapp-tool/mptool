import { describe, expect, it } from "vitest";

import { run } from "./golden.js";

describe("sandbox global object", () => {
  it("should expose Object.prototype members as global identifiers", () => {
    expect(run("typeof toString")).toBe("function");
    expect(run("typeof hasOwnProperty")).toBe("function");
    expect(run("typeof constructor")).toBe("function");
    expect(run("constructor === Object")).toBe(true);
    expect(run("toString()")).toBe("[object Object]");
  });

  it("should let top-level lexical declarations shadow inherited globals", () => {
    expect(run("let toString = 1; toString")).toBe(1);
    expect(run("const hasOwnProperty = 2; hasOwnProperty")).toBe(2);
  });

  it("should not inject eval or Function with global: true", () => {
    expect(run("typeof eval", { global: true })).toBe("undefined");
    expect(run("typeof Function", { global: true })).toBe("undefined");
    expect(() => run("eval('1')", { global: true })).toThrow(ReferenceError);
    // host globals are still injected
    expect(run("typeof Promise", { global: true })).toBe("function");
  });

  it("should keep sandbox globals writable", () => {
    expect(run("toString = 1; toString")).toBe(1);
    expect(run("globalThis.toString = 2; toString")).toBe(2);
  });
});

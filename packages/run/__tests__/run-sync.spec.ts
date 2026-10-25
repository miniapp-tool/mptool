import { describe, expect, it } from "vitest";

import { runSync } from "../src/index.js";

describe("runSync contract", () => {
  it("should return a synchronous value", () => {
    expect(runSync("1 + 2")).toBe(3);
    expect(runSync("const f = (a) => a * 3; f(4)")).toBe(12);
  });

  it("should return a Promise value produced by synchronous code", async () => {
    const resolved = runSync("Promise.resolve(1)");

    expect(resolved).toBeInstanceOf(Promise);
    await expect(resolved as Promise<number>).resolves.toBe(1);
  });

  it("should return a pending Promise created by synchronous code", () => {
    const pending = runSync("const p = new Promise(() => {}); p");

    expect(pending).toBeInstanceOf(Promise);
  });

  it("should throw when async functions are invoked", () => {
    expect(() => runSync("async function f() {} f()")).toThrow(Error);
    expect(() => runSync("(async () => 1)()")).toThrow(/async/u);
  });

  it("should throw even when user code catches the async rejection", () => {
    expect(() =>
      runSync("let caught = false; try { (async () => 1)(); } catch (e) { caught = true; } caught"),
    ).toThrow(Error);
  });
});

import { describe, expect, it } from "vitest";

import { createSandbox } from "../src/index.js";

describe("sandbox reentrancy", () => {
  it("should reject a nested run() from a host callback", () => {
    const sandbox = createSandbox();

    sandbox.setGlobal("reenter", () => sandbox.run("1"));

    expect(() => sandbox.run("reenter()")).toThrow(/not reentrant/u);
  });

  it("should reject a new run() while async code is still pending", async () => {
    const sandbox = createSandbox();
    const pending = sandbox.run("(async () => { await 1; return 1; })()");

    expect(() => sandbox.run("2")).toThrow(/not reentrant/u);

    await expect(pending).resolves.toBe(1);
    expect(sandbox.run("2")).toBe(2);
  });

  it("should allow sequential synchronous runs", () => {
    const sandbox = createSandbox();

    expect(sandbox.run("let a = 1; a")).toBe(1);
    expect(sandbox.run("2")).toBe(2);
  });

  it("should reject a nested run() after a synchronous throw", () => {
    const sandbox = createSandbox();

    sandbox.setGlobal("boom", () => {
      throw new Error("boom");
    });

    expect(() => sandbox.run("boom()")).toThrow("boom");
    // the guard is released again
    expect(sandbox.run("3")).toBe(3);
  });
});

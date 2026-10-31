import { describe, expect, it } from "vitest";

import type { RunOptions } from "../src/index.js";
import { Runtime } from "../src/interpreter.js";
import { parse } from "../src/parser.js";

/**
 * Run code through the interpreter.
 *
 * 用解释器运行代码。
 *
 * @param code - Source code / 源码
 * @param options - Runtime options / 运行时选项
 * @returns The completion value / 完成值
 */
const run = (code: string, options?: RunOptions): unknown => new Runtime(options).run(parse(code));

describe("async resumption stack accounting", () => {
  it("should keep stackDepth positive across many awaited resumptions", async () => {
    const runtime = new Runtime();
    const depths: number[] = [];

    runtime.setGlobal("probe", () => {
      depths.push(runtime.stackDepth);
    });

    await runtime.run(
      parse(
        [
          "async function f() {",
          "  await 0; probe();",
          "  await 0; probe();",
          "  await 0; probe();",
          "  return 1;",
          "}",
          "f()",
        ].join("\n"),
      ),
    );

    // the async body always runs with exactly one resumption frame on the stack
    // async 函数体运行时栈上始终恰好有一个恢复帧
    expect(depths).toStrictEqual([1, 1, 1]);
    expect(runtime.stackDepth).toBe(0);
  });

  it("should keep maxStack enforced after many awaited resumptions", async () => {
    const runtime = new Runtime({ maxStack: 16 });
    const awaits = "await 0;".repeat(100);
    const source = [
      "async function f() {",
      `  ${awaits}`,
      "  function rec(n) { return n <= 0 ? 0 : rec(n - 1); }",
      "  return rec(40);",
      "}",
      "f()",
    ].join("\n");

    // 100 awaited resumptions must not push stackDepth negative (which would disable maxStack)
    // 100 次 await 恢复不得把 stackDepth 推成负数（那会使 maxStack 失效）
    await expect(runtime.run(parse(source))).rejects.toThrow(/Maximum call stack size/u);
    expect(runtime.stackDepth).toBe(0);
  });

  it("should not pollute the stack when concurrent async tasks interleave", async () => {
    const runtime = new Runtime();
    const depths: number[] = [];

    runtime.setGlobal("probe", () => {
      depths.push(runtime.stackDepth);
    });
    runtime.setGlobal(
      "tick",
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        }),
    );

    await runtime.run(
      parse(
        [
          "async function task(n) {",
          "  await tick(); probe();",
          "  await tick(); probe();",
          "  return n;",
          "}",
          "Promise.all([task(1), task(2), task(3)])",
        ].join("\n"),
      ),
    );

    expect(depths).toStrictEqual([1, 1, 1, 1, 1, 1]);
    expect(runtime.stackDepth).toBe(0);
  });
});

describe("async try/catch/finally block scoping", () => {
  it("should hoist block functions of an async try block", async () => {
    await expect(
      run(
        [
          "async function f() {",
          "  try {",
          "    await 0;",
          "    return g();",
          "    function g() { return 7; }",
          "  } finally {}",
          "}",
          "f()",
        ].join("\n"),
      ),
    ).resolves.toBe(7);
  });

  it("should hoist block functions of an async catch block", async () => {
    await expect(
      run(
        [
          "async function f() {",
          "  try { throw 1; } catch (e) {",
          "    await 0;",
          "    return h();",
          "    function h() { return 8; }",
          "  }",
          "}",
          "f()",
        ].join("\n"),
      ),
    ).resolves.toBe(8);
  });

  it("should hoist block functions of an async finally block", async () => {
    await expect(
      run(
        [
          "async function f() {",
          "  try { await 0; } finally {",
          "    return k();",
          "    function k() { return 9; }",
          "  }",
          "}",
          "f()",
        ].join("\n"),
      ),
    ).resolves.toBe(9);
  });

  it("should reject duplicate lexical declarations in an async try block", async () => {
    await expect(
      run("async function f() { try { await 0; let x; let x; } finally {} } f()"),
    ).rejects.toThrow(/already been declared/u);
  });

  it("should apply the TDZ inside an async try block", async () => {
    await expect(
      run("async function f() { try { await 0; x; let x = 1; } finally {} } f()"),
    ).rejects.toThrow(/before initialization/u);
  });
});

describe("try/finally with raw null or undefined throws", () => {
  it("should rethrow null from a nested function through finally", () => {
    let thrown = false;
    let caught: unknown = "unset";

    try {
      run("function boom() { throw null; } try { boom(); } finally {}");
    } catch (err) {
      thrown = true;
      caught = err;
    }

    expect(thrown).toBe(true);
    expect(caught).toBeNull();
  });

  it("should rethrow undefined from a nested function through finally", () => {
    let thrown = false;
    let caught: unknown = "unset";

    try {
      run("function boom() { throw undefined; } try { boom(); } finally {}");
    } catch (err) {
      thrown = true;
      caught = err;
    }

    expect(thrown).toBe(true);
    expect(caught).toBeUndefined();
  });

  it("should still run the finalizer before rethrowing", () => {
    let cleaned = false;
    let thrown = false;

    try {
      run("function boom() { throw null; } try { boom(); } finally { mark(); }", {
        globals: {
          mark: () => {
            cleaned = true;
          },
        },
      });
    } catch {
      thrown = true;
    }

    expect(thrown).toBe(true);
    expect(cleaned).toBe(true);
  });
});

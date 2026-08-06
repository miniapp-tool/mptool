import { describe, expect, it } from "vitest";

import { createSandbox, run, runSync } from "../src/index.js";

/**
 * Run async code and await the result (plain values resolve as-is).
 *
 * 运行 async 代码并等待结果（普通值原样返回）。
 *
 * @param code - Source code / 源码
 * @returns The resolved result / 已解析的结果
 */
const runAsync = async (code: string): Promise<unknown> => await run(code);

describe("async functions", () => {
  it("should resolve async functions", async () => {
    await expect(runAsync("async function f() { return 42; } f()")).resolves.toBe(42);
    await expect(runAsync("const f = async () => 42; f()")).resolves.toBe(42);
    await expect(runAsync("async function f() { return await 42; } f()")).resolves.toBe(42);
    await expect(
      runAsync("async function f() { return await Promise.resolve(7); } f()"),
    ).resolves.toBe(7);
  });

  it("should return a Promise from run() and reject on throw", async () => {
    const result = run("async function f() { return 1; } f()");

    expect(result).toBeInstanceOf(Promise);
    await expect(runAsync("async function f() { throw new Error('boom'); } f()")).rejects.toThrow(
      "boom",
    );
  });

  it("should sequence awaits with correct order", async () => {
    await expect(
      runAsync(
        "const log = []; const tick = (v) => Promise.resolve().then(() => { log.push(v); return v; }); async function f() { const a = await tick('a'); const b = await tick('b'); log.push('c'); return [a, b, log.join('')]; } f()",
      ),
    ).resolves.toStrictEqual(["a", "b", "abc"]);
  });

  it("should await inside expressions", async () => {
    await expect(
      runAsync("async function f() { return (await Promise.resolve(10)) + 5; } f()"),
    ).resolves.toBe(15);
    await expect(
      runAsync(
        "async function f() { const o = { v: await Promise.resolve(3) }; return o.v * 2; } f()",
      ),
    ).resolves.toBe(6);
    await expect(
      runAsync(
        "async function f() { return [await Promise.resolve(1), await Promise.resolve(2)]; } f()",
      ),
    ).resolves.toStrictEqual([1, 2]);
    await expect(
      runAsync("async function f() { return `${await Promise.resolve('x')}y`; } f()"),
    ).resolves.toBe("xy");
  });

  it("should await inside control flow", async () => {
    await expect(
      runAsync(
        "async function f() { let s = 0; for (const n of [1, 2, 3]) s += await Promise.resolve(n); return s; } f()",
      ),
    ).resolves.toBe(6);
    await expect(
      runAsync(
        "async function f() { let s = ''; for (let i = 0; i < 3; i += 1) { if (await Promise.resolve(i % 2)) s += i; } return s; } f()",
      ),
    ).resolves.toBe("1");
    await expect(
      runAsync(
        "async function f() { let i = 0; while (i < 3) { i += await Promise.resolve(1); } return i; } f()",
      ),
    ).resolves.toBe(3);
  });

  it("should preserve short-circuit around await", async () => {
    await expect(
      runAsync(
        "async function f() { let calls = 0; const x = false && (calls += 1, await Promise.resolve(1)); return [x, calls]; } f()",
      ),
    ).resolves.toStrictEqual([false, 0]);
    await expect(
      runAsync(
        "async function f() { let calls = 0; const x = true || (calls += 1, await Promise.resolve(1)); return [x, calls]; } f()",
      ),
    ).resolves.toStrictEqual([true, 0]);
    await expect(
      runAsync(
        "async function f() { const v = 0 ? await Promise.resolve(1) : await Promise.resolve(2); return v; } f()",
      ),
    ).resolves.toBe(2);
  });

  it("should handle await in try/catch/finally", async () => {
    await expect(
      runAsync(
        "async function f() { try { await Promise.reject(new Error('x')); } catch (e) { return e.message; } } f()",
      ),
    ).resolves.toBe("x");
    await expect(
      runAsync(
        "async function f() { let s = ''; try { await Promise.resolve(1); s += 't'; } finally { s += 'f'; } return s; } f()",
      ),
    ).resolves.toBe("tf");
    await expect(
      runAsync(
        "async function f() { try { await Promise.reject(new Error('boom')); } catch (e) { return 'caught'; } finally { return 'fin'; } } f()",
      ),
    ).resolves.toBe("fin");
  });

  it("should let rejections propagate", async () => {
    await expect(runAsync("async function f() { await Promise.reject('oops'); } f()")).rejects.toBe(
      "oops",
    );
  });

  it("should support async class methods and this", async () => {
    await expect(
      runAsync(
        "class A { constructor(v) { this.v = v; } async get() { return this.v * 2; } } const a = new A(21); a.get()",
      ),
    ).resolves.toBe(42);
  });

  it("should support nested async calls", async () => {
    await expect(
      runAsync(
        "async function inner() { return 10; } async function outer() { return (await inner()) + 5; } outer()",
      ),
    ).resolves.toBe(15);
  });

  it("should support async-context arrows returning plain values", async () => {
    await expect(
      runAsync("async function f() { const g = () => await Promise.resolve(4); return g(); } f()"),
    ).resolves.toBe(4);
  });

  it("should support async arrow expression bodies", async () => {
    await expect(runAsync("const f = async () => await Promise.resolve(3); f()")).resolves.toBe(3);
  });

  it("should support concurrent async calls", async () => {
    await expect(
      runAsync(
        "async function f(v) { return await Promise.resolve(v * 2); } Promise.all([f(1), f(2), f(3)])",
      ),
    ).resolves.toStrictEqual([2, 4, 6]);
  });

  it("should support many concurrently suspended async calls", async () => {
    // suspended tasks must not accumulate stackDepth toward maxStack
    // 挂起任务不得将 stackDepth 累积计入 maxStack
    await expect(
      runAsync(
        "async function f(i) { return await Promise.resolve(i); } const tasks = []; for (let i = 0; i < 600; i += 1) tasks.push(f(i)); Promise.all(tasks).then((r) => r.length)",
      ),
    ).resolves.toBe(600);
  });

  it("should run async code in a shared sandbox", async () => {
    const sandbox = createSandbox();

    sandbox.run("async function f() { return 1; }");
    await expect(sandbox.run("f()")).resolves.toBe(1);
    sandbox.run("let counter = 0; async function inc() { counter += 1; return counter; }");
    await expect(sandbox.run("inc()")).resolves.toBe(1);
    await expect(sandbox.run("inc()")).resolves.toBe(2);
  });

  it("should throw from runSync for async code", () => {
    expect(() => runSync("async function f() {} f()")).toThrow(Error);
  });

  it("should await host setTimeout-based promises", async () => {
    const result = await run(
      "async function f() { const v = await new Promise((res) => setTimeout(() => res(5), 5)); return v; } f()",
      { globals: { setTimeout } },
    );

    expect(result).toBe(5);
  });

  it("should preserve await in destructuring assignment", async () => {
    await expect(
      runAsync(
        "async function f() { const [a, b] = await Promise.resolve([1, 2]); return a + b; } f()",
      ),
    ).resolves.toBe(3);
  });
});

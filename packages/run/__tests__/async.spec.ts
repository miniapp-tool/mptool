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

/**
 * Golden comparison against Node (indirect `eval`): run the same source in both, await both results
 * and assert they are strictly equal.
 *
 * 与 Node（间接 `eval`）的黄金对照：同一源码在两侧运行并 await，断言结果严格相等。
 *
 * @param code - Source code / 源码
 * @param globals - Host globals injected into the interpreter / 注入解释器的宿主全局
 */
const runBoth = async (code: string, globals?: Record<string, unknown>): Promise<void> => {
  const expected = await (0, eval)(code);
  const actual = await (globals ? run(code, { globals }) : runAsync(code));

  expect(actual).toStrictEqual(expected);
};

/**
 * Assert that both Node and the interpreter reject the code (reasons may differ).
 *
 * 断言 Node 与解释器都会拒绝该代码（原因可能不同）。
 *
 * @param code - Source code / 源码
 */
const expectRejectBoth = async (code: string): Promise<void> => {
  let expectedRejected = false;
  let actualRejected = false;

  try {
    await (0, eval)(code);
  } catch {
    expectedRejected = true;
  }

  try {
    await run(code);
  } catch {
    actualRejected = true;
  }

  expect(actualRejected).toBe(true);
  expect(expectedRejected).toBe(true);
};

describe("async functions", () => {
  it("should resolve async functions", async () => {
    await runBoth("async function f() { return 42; } f()");
    await runBoth("const f = async () => 42; f()");
    await runBoth("async function f() { return await 42; } f()");
    await runBoth("async function f() { return await Promise.resolve(7); } f()");
  });

  it("should return a Promise from run() and reject on throw", async () => {
    const result = run("async function f() { return 1; } f()");

    expect(result).toBeInstanceOf(Promise);
    await expectRejectBoth("async function f() { throw new Error('boom'); } f()");
  });

  it("should sequence awaits with correct order", async () => {
    await runBoth(
      "const log = []; const tick = (v) => Promise.resolve().then(() => { log.push(v); return v; }); async function f() { const a = await tick('a'); const b = await tick('b'); log.push('c'); return [a, b, log.join('')]; } f()",
    );
  });

  it("should await inside expressions", async () => {
    await runBoth("async function f() { return (await Promise.resolve(10)) + 5; } f()");
    await runBoth(
      "async function f() { const o = { v: await Promise.resolve(3) }; return o.v * 2; } f()",
    );
    await runBoth(
      "async function f() { return [await Promise.resolve(1), await Promise.resolve(2)]; } f()",
    );
    await runBoth("async function f() { return `${await Promise.resolve('x')}y`; } f()");
  });

  it("should await inside control flow", async () => {
    await runBoth(
      "async function f() { let s = 0; for (const n of [1, 2, 3]) s += await Promise.resolve(n); return s; } f()",
    );
    await runBoth(
      "async function f() { let s = ''; for (let i = 0; i < 3; i += 1) { if (await Promise.resolve(i % 2)) s += i; } return s; } f()",
    );
    await runBoth(
      "async function f() { let i = 0; while (i < 3) { i += await Promise.resolve(1); } return i; } f()",
    );
  });

  it("should preserve short-circuit around await", async () => {
    await runBoth(
      "async function f() { let calls = 0; const x = false && (calls += 1, await Promise.resolve(1)); return [x, calls]; } f()",
    );
    await runBoth(
      "async function f() { let calls = 0; const x = true || (calls += 1, await Promise.resolve(1)); return [x, calls]; } f()",
    );
    await runBoth(
      "async function f() { const v = 0 ? await Promise.resolve(1) : await Promise.resolve(2); return v; } f()",
    );
  });

  it("should handle await in try/catch/finally", async () => {
    await runBoth(
      "async function f() { try { await Promise.reject(new Error('x')); } catch (e) { return e.message; } } f()",
    );
    await runBoth(
      "async function f() { let s = ''; try { await Promise.resolve(1); s += 't'; } finally { s += 'f'; } return s; } f()",
    );
    await runBoth(
      "async function f() { try { await Promise.reject(new Error('boom')); } catch (e) { return 'caught'; } finally { return 'fin'; } } f()",
    );
  });

  it("should let rejections propagate", async () => {
    await expectRejectBoth("async function f() { await Promise.reject('oops'); } f()");
  });

  it("should support async class methods and this", async () => {
    await runBoth(
      "class A { constructor(v) { this.v = v; } async get() { return this.v * 2; } } const a = new A(21); a.get()",
    );
  });

  it("should support nested async calls", async () => {
    await runBoth(
      "async function inner() { return 10; } async function outer() { return (await inner()) + 5; } outer()",
    );
  });

  it("should support async arrow expression bodies", async () => {
    await runBoth("const f = async () => await Promise.resolve(3); f()");
  });

  it("should support concurrent async calls", async () => {
    await runBoth(
      "async function f(v) { return await Promise.resolve(v * 2); } Promise.all([f(1), f(2), f(3)])",
    );
  });

  it("should support many concurrently suspended async calls", async () => {
    // suspended tasks must not accumulate stackDepth toward maxStack
    // 挂起任务不得将 stackDepth 累积计入 maxStack
    await runBoth(
      "async function f(i) { return await Promise.resolve(i); } const tasks = []; for (let i = 0; i < 600; i += 1) tasks.push(f(i)); Promise.all(tasks).then((r) => r.length)",
    );
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
    await runBoth(
      "async function f() { const v = await new Promise((res) => setTimeout(() => res(5), 5)); return v; } f()",
      { setTimeout },
    );
  });

  it("should preserve await in destructuring assignment", async () => {
    await runBoth(
      "async function f() { const [a, b] = await Promise.resolve([1, 2]); return a + b; } f()",
    );
  });
});

describe("documented async extensions", () => {
  it("should let non-async arrows inherit the async context (design §7.3 extension)", async () => {
    // This is an intentional extension: V8/JSCore reject `() => await p` (SyntaxError), but the
    // interpreter inherits the enclosing async context for non-async arrows inside async bodies.
    // 这是有意扩展：V8/JSCore 拒绝 `() => await p`（SyntaxError），但解释器让 async 体内的非 async 箭头
    // 继承外层 async 上下文。
    await expect(
      run("async function f() { const g = () => await Promise.resolve(4); return g(); } f()"),
    ).resolves.toBe(4);
  });
});

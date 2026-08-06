import { describe, expect, it } from "vitest";

import { run } from "../src/index.js";

/**
 * Run async code and await the result (plain values resolve as-is).
 *
 * 运行 async 代码并等待结果（普通值原样返回）。
 *
 * @param code - Source code / 源码
 * @returns The resolved result / 已解析的结果
 */
const runAsync = async (code: string): Promise<unknown> => await run(code);

describe("async control flow extras", () => {
  it("should await in do-while and for-in", async () => {
    await expect(
      runAsync(
        "async function f() { let i = 0; do { i += await Promise.resolve(1); } while (i < 3); return i; } f()",
      ),
    ).resolves.toBe(3);
    await expect(
      runAsync(
        "async function f() { const o = {a: 1, b: 2}; let s = 0; for (const k in o) s += await Promise.resolve(o[k]); return s; } f()",
      ),
    ).resolves.toBe(3);
  });

  it("should preserve labeled break/continue across await", async () => {
    await expect(
      runAsync(
        "async function f() { let s = ''; outer: for (let i = 0; i < 3; i += 1) { for (let j = 0; j < 3; j += 1) { await Promise.resolve(); if (i === 1 && j === 1) continue outer; if (i === 2 && j === 1) break outer; s += i + '' + j + ','; } } return s; } f()",
      ),
    ).resolves.toBe("00,01,02,10,20,");
  });

  it("should await in switch with fall-through and break", async () => {
    await expect(
      runAsync(
        "async function f(x) { let r = ''; const d = await Promise.resolve(x); switch (d) { case 1: r += await Promise.resolve('a'); case 2: r += 'b'; break; default: r += 'd'; } return r; } Promise.all([f(1), f(2), f(3)])",
      ),
    ).resolves.toStrictEqual(["ab", "b", "d"]);
  });

  it("should await in switch discriminant and case tests", async () => {
    await expect(
      runAsync(
        "async function f(x) { switch (await Promise.resolve(x)) { case await Promise.resolve(1): return 'one'; default: return 'other'; } } Promise.all([f(1), f(2)])",
      ),
    ).resolves.toStrictEqual(["one", "other"]);
  });

  it("should await in for update", async () => {
    await expect(
      runAsync(
        "async function f() { let s = 0; for (let i = 0; i < 3; i = await Promise.resolve(i + 1)) s += i; return s; } f()",
      ),
    ).resolves.toBe(3);
  });

  it("should await in for-of right side", async () => {
    await expect(
      runAsync(
        "async function f() { let s = 0; for (const x of await Promise.resolve([1, 2, 3])) s += x; return s; } f()",
      ),
    ).resolves.toBe(6);
  });
});

describe("async expression extras", () => {
  it("should await in delete/update/unary/binary", async () => {
    await expect(
      runAsync(
        "async function f() { const o = {a: 1}; delete (await Promise.resolve(o)).a; return o.a; } f()",
      ),
    ).resolves.toBeUndefined();
    await expect(
      runAsync(
        "async function f() { const o = {n: 5}; (await Promise.resolve(o)).n += 2; return o.n; } f()",
      ),
    ).resolves.toBe(7);
    await expect(
      runAsync(
        "async function f() { const o = {n: 5}; const old = (await Promise.resolve(o)).n++; return [old, o.n]; } f()",
      ),
    ).resolves.toStrictEqual([5, 6]);
    await expect(
      runAsync(
        "async function f() { return !(await Promise.resolve(0)) && (await Promise.resolve(1)) + (await Promise.resolve(2)); } f()",
      ),
    ).resolves.toBe(3);
  });

  it("should await in spread call args and array/object literals", async () => {
    await expect(
      runAsync(
        "async function f() { const g = (a, b, c) => a + b + c; return g(...await Promise.resolve([1, 2, 3])); } f()",
      ),
    ).resolves.toBe(6);
    await expect(
      runAsync("async function f() { return [...await Promise.resolve([1, 2]), 3]; } f()"),
    ).resolves.toStrictEqual([1, 2, 3]);
    await expect(
      runAsync(
        "async function f() { const o = {...await Promise.resolve({a: 1}), b: 2}; return [o.a, o.b]; } f()",
      ),
    ).resolves.toStrictEqual([1, 2]);
    await expect(
      runAsync("async function f() { return { k: await Promise.resolve('v') }['k']; } f()"),
    ).resolves.toBe("v");
  });

  it("should await in member assignment target and compound logical", async () => {
    await expect(
      runAsync(
        "async function f() { const o = {}; (await Promise.resolve(o)).x = 5; return o.x; } f()",
      ),
    ).resolves.toBe(5);
    await expect(
      runAsync(
        "async function f() { const o = {x: 0}; (await Promise.resolve(o)).x ||= 7; return o.x; } f()",
      ),
    ).resolves.toBe(7);
    await expect(
      runAsync(
        "async function f() { const o = {x: 0}; let calls = 0; (await Promise.resolve(o)).x &&= (calls += 1, 9); return [o.x, calls]; } f()",
      ),
    ).resolves.toStrictEqual([0, 0]);
  });

  it("should await in template, sequence and conditional", async () => {
    await expect(
      runAsync(
        "async function f() { return `${await Promise.resolve('a')}-${await Promise.resolve('b')}`; } f()",
      ),
    ).resolves.toBe("a-b");
    await expect(
      runAsync(
        "async function f() { let a; let b; a = await Promise.resolve(1), b = await Promise.resolve(2); return [a, b]; } f()",
      ),
    ).resolves.toStrictEqual([1, 2]);
    await expect(
      runAsync(
        "async function f() { return (await Promise.resolve(true)) ? await Promise.resolve('y') : await Promise.resolve('n'); } f()",
      ),
    ).resolves.toBe("y");
    await expect(
      runAsync(
        "async function f() { return (await Promise.resolve(false)) ? 'y' : await Promise.resolve('n'); } f()",
      ),
    ).resolves.toBe("n");
  });

  it("should not suspend on non-thenable values", async () => {
    await expect(runAsync("async function f() { return await 42; } f()")).resolves.toBe(42);
    await expect(runAsync("async function f() { return await null; } f()")).resolves.toBeNull();
    await expect(runAsync("async function f() { return await 's'; } f()")).resolves.toBe("s");
  });
});

describe("async functions extras", () => {
  it("should support async methods in object literals and getters", async () => {
    await expect(
      runAsync("const o = { v: 3, async get() { return this.v * 3; } }; o.get()"),
    ).resolves.toBe(9);
    await expect(
      runAsync(
        "const o = { get v() { return Promise.resolve(4); } }; async function f() { return await o.v; } f()",
      ),
    ).resolves.toBe(4);
  });

  it("should support async arrow block bodies and this", async () => {
    await expect(
      runAsync(
        "const o = { v: 10, m() { const g = async () => { const x = await Promise.resolve(5); return x + this.v; }; return g(); } }; o.m()",
      ),
    ).resolves.toBe(15);
    await expect(
      runAsync(
        "async function f() { const g = async (x) => { return await Promise.resolve(x * 2); }; return await g(21); } f()",
      ),
    ).resolves.toBe(42);
  });

  it("should propagate rejection from async-context arrows", async () => {
    await expect(
      runAsync(
        "async function f() { const g = () => Promise.reject('nope'); return await g(); } f()",
      ),
    ).rejects.toBe("nope");
  });

  it("should run finally with return/break/throw overrides", async () => {
    await expect(
      runAsync(
        "async function f() { let s = ''; try { await Promise.resolve(1); return 'try'; } finally { s += 'f'; } } f()",
      ),
    ).resolves.toBe("try");
    await expect(
      runAsync(
        "async function f() { try { await Promise.reject('x'); } finally { return 'fin'; } } f()",
      ),
    ).resolves.toBe("fin");
    await expect(
      runAsync(
        "async function f() { let s = ''; for (let i = 0; i < 3; i += 1) { try { await Promise.resolve(); if (i === 1) continue; s += i; } finally { s += 'f'; } } return s; } f()",
      ),
    ).resolves.toBe("0ff2f");
    await expect(
      runAsync(
        "async function f() { try { throw await Promise.resolve('boom'); } catch (e) { return e; } } f()",
      ),
    ).resolves.toBe("boom");
  });

  it("should reject on deep async recursion via maxStack", async () => {
    await expect(
      run("async function f() { return await f(); } f()", { maxStack: 20 }),
    ).rejects.toThrow(Error);
  });

  it("should support nested async-context arrows and Promise chains", async () => {
    await expect(
      runAsync(
        "async function f() { const a = () => Promise.resolve(1).then((x) => x + 1); const b = () => a().then((x) => x * 10); return await b(); } f()",
      ),
    ).resolves.toBe(20);
    await expect(
      runAsync(
        "async function f() { const p = Promise.resolve(5).then((x) => x * 2); return await p; } f()",
      ),
    ).resolves.toBe(10);
  });

  it("should await inside labeled non-loop statements", async () => {
    await expect(
      runAsync(
        "async function f() { let s = ''; label: { s += await Promise.resolve('a'); break label; s += 'x'; } return s; } f()",
      ),
    ).resolves.toBe("a");
  });

  it("should preserve this through async methods", async () => {
    await expect(
      runAsync(
        "class A { constructor() { this.base = 100; } async add(x) { return this.base + (await Promise.resolve(x)); } } const a = new A(); a.add(23)",
      ),
    ).resolves.toBe(123);
    await expect(
      runAsync(
        "class A { async m() { return 'A'; } } class B extends A { async m() { return (await super.m()) + 'B'; } } new B().m()",
      ),
    ).resolves.toBe("AB");
  });

  it("should handle unary typeof/void with await and optional member", async () => {
    await expect(
      runAsync("async function f() { return typeof (await Promise.resolve(5)); } f()"),
    ).resolves.toBe("number");
    await expect(
      runAsync(
        "async function f() { const o = null; return o?.a ?? (await Promise.resolve('d')); } f()",
      ),
    ).resolves.toBe("d");
    await expect(
      runAsync("async function f() { void (await Promise.resolve(1)); return 'ok'; } f()"),
    ).resolves.toBe("ok");
  });
});

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

/**
 * Golden comparison against Node (indirect `eval`): run the same source in both, await both results
 * and assert they are strictly equal.
 *
 * 与 Node（间接 `eval`）的黄金对照：同一源码在两侧运行并 await，断言结果严格相等。
 *
 * @param code - Source code / 源码
 */
const runBoth = async (code: string): Promise<void> => {
  const expected = await (0, eval)(code);
  const actual = await runAsync(code);

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

describe("async control flow extras", () => {
  it("should await in do-while and for-in", async () => {
    await runBoth(
      "async function f() { let i = 0; do { i += await Promise.resolve(1); } while (i < 3); return i; } f()",
    );
    await runBoth(
      "async function f() { const o = {a: 1, b: 2}; let s = 0; for (const k in o) s += await Promise.resolve(o[k]); return s; } f()",
    );
  });

  it("should preserve labeled break/continue across await", async () => {
    await runBoth(
      "async function f() { let s = ''; outer: for (let i = 0; i < 3; i += 1) { for (let j = 0; j < 3; j += 1) { await Promise.resolve(); if (i === 1 && j === 1) continue outer; if (i === 2 && j === 1) break outer; s += i + '' + j + ','; } } return s; } f()",
    );
  });

  it("should await in switch with fall-through and break", async () => {
    await runBoth(
      "async function f(x) { let r = ''; const d = await Promise.resolve(x); switch (d) { case 1: r += await Promise.resolve('a'); case 2: r += 'b'; break; default: r += 'd'; } return r; } Promise.all([f(1), f(2), f(3)])",
    );
  });

  it("should await in switch discriminant and case tests", async () => {
    await runBoth(
      "async function f(x) { switch (await Promise.resolve(x)) { case await Promise.resolve(1): return 'one'; default: return 'other'; } } Promise.all([f(1), f(2)])",
    );
  });

  it("should await in for update", async () => {
    await runBoth(
      "async function f() { let s = 0; for (let i = 0; i < 3; i = await Promise.resolve(i + 1)) s += i; return s; } f()",
    );
  });

  it("should await in for-of right side", async () => {
    await runBoth(
      "async function f() { let s = 0; for (const x of await Promise.resolve([1, 2, 3])) s += x; return s; } f()",
    );
  });
});

describe("async expression extras", () => {
  it("should await in delete/update/unary/binary", async () => {
    await runBoth(
      "async function f() { const o = {a: 1}; delete (await Promise.resolve(o)).a; return o.a; } f()",
    );
    await runBoth(
      "async function f() { const o = {n: 5}; (await Promise.resolve(o)).n += 2; return o.n; } f()",
    );
    await runBoth(
      "async function f() { const o = {n: 5}; const old = (await Promise.resolve(o)).n++; return [old, o.n]; } f()",
    );
    await runBoth(
      "async function f() { return !(await Promise.resolve(0)) && (await Promise.resolve(1)) + (await Promise.resolve(2)); } f()",
    );
  });

  it("should await in spread call args and array/object literals", async () => {
    await runBoth(
      "async function f() { const g = (a, b, c) => a + b + c; return g(...await Promise.resolve([1, 2, 3])); } f()",
    );
    await runBoth("async function f() { return [...await Promise.resolve([1, 2]), 3]; } f()");
    await runBoth(
      "async function f() { const o = {...await Promise.resolve({a: 1}), b: 2}; return [o.a, o.b]; } f()",
    );
    await runBoth("async function f() { return { k: await Promise.resolve('v') }['k']; } f()");
  });

  it("should await in member assignment target and compound logical", async () => {
    await runBoth(
      "async function f() { const o = {}; (await Promise.resolve(o)).x = 5; return o.x; } f()",
    );
    await runBoth(
      "async function f() { const o = {x: 0}; (await Promise.resolve(o)).x ||= 7; return o.x; } f()",
    );
    await runBoth(
      "async function f() { const o = {x: 0}; let calls = 0; (await Promise.resolve(o)).x &&= (calls += 1, 9); return [o.x, calls]; } f()",
    );
  });

  it("should await in template, sequence and conditional", async () => {
    await runBoth(
      "async function f() { return `${await Promise.resolve('a')}-${await Promise.resolve('b')}`; } f()",
    );
    await runBoth(
      "async function f() { let a; let b; a = await Promise.resolve(1), b = await Promise.resolve(2); return [a, b]; } f()",
    );
    await runBoth(
      "async function f() { return (await Promise.resolve(true)) ? await Promise.resolve('y') : await Promise.resolve('n'); } f()",
    );
    await runBoth(
      "async function f() { return (await Promise.resolve(false)) ? 'y' : await Promise.resolve('n'); } f()",
    );
  });

  it("should not suspend on non-thenable values", async () => {
    await runBoth("async function f() { return await 42; } f()");
    await runBoth("async function f() { return await null; } f()");
    await runBoth("async function f() { return await 's'; } f()");
  });
});

describe("async functions extras", () => {
  it("should support async methods in object literals and getters", async () => {
    await runBoth("const o = { v: 3, async get() { return this.v * 3; } }; o.get()");
    await runBoth(
      "const o = { get v() { return Promise.resolve(4); } }; async function f() { return await o.v; } f()",
    );
  });

  it("should support async arrow block bodies and this", async () => {
    await runBoth(
      "const o = { v: 10, m() { const g = async () => { const x = await Promise.resolve(5); return x + this.v; }; return g(); } }; o.m()",
    );
    await runBoth(
      "async function f() { const g = async (x) => { return await Promise.resolve(x * 2); }; return await g(21); } f()",
    );
  });

  it("should propagate rejection from async-context arrows", async () => {
    await expectRejectBoth(
      "async function f() { const g = () => Promise.reject('nope'); return await g(); } f()",
    );
  });

  it("should await in destructuring declaration defaults", async () => {
    await runBoth(
      "async function f() { const {x = await Promise.resolve(9)} = {}; return x; } f()",
    );
    await runBoth(
      "async function f() { const [a = await Promise.resolve(5)] = []; return a; } f()",
    );
    await runBoth(
      "async function f() { let {x = await Promise.resolve(1)} = {x: 2}; return x; } f()",
    );
    await runBoth(
      "async function f() { for (const {x = await Promise.resolve(3)} of [{}]) return x; } f()",
    );
  });

  it("should support rest params in async functions", async () => {
    await runBoth(
      "async function f(a, ...rest) { return [a, await Promise.resolve(rest.length)]; } f(1, 2, 3)",
    );
  });

  it("should await in catch destructuring defaults", async () => {
    await runBoth(
      "async function f() { try { throw {}; } catch ({x = await Promise.resolve(5)}) { return x; } } f()",
    );
    await runBoth(
      "async function f() { try { throw {x: 7}; } catch ({x = await Promise.resolve(5)}) { return x; } } f()",
    );
  });

  it("should propagate throw null/undefined through async finally", async () => {
    await expectRejectBoth("async function f() { try { throw null; } finally {} } f()");
    await expectRejectBoth("async function f() { try { throw undefined; } finally {} } f()");
    await expectRejectBoth("async function f() { try { throw null; } finally {} } f()");
  });

  it("should run finally with return/break/throw overrides", async () => {
    await runBoth(
      "async function f() { let s = ''; try { await Promise.resolve(1); return 'try'; } finally { s += 'f'; } } f()",
    );
    await runBoth(
      "async function f() { try { await Promise.reject('x'); } finally { return 'fin'; } } f()",
    );
    await runBoth(
      "async function f() { let s = ''; for (let i = 0; i < 3; i += 1) { try { await Promise.resolve(); if (i === 1) continue; s += i; } finally { s += 'f'; } } return s; } f()",
    );
    await runBoth(
      "async function f() { try { throw await Promise.resolve('boom'); } catch (e) { return e; } } f()",
    );
  });

  it("should reject on deep async recursion via maxStack", async () => {
    await expect(
      run("async function f() { return await f(); } f()", { maxStack: 20 }),
    ).rejects.toThrow(Error);
  });

  it("should support nested async-context arrows and Promise chains", async () => {
    await runBoth(
      "async function f() { const a = () => Promise.resolve(1).then((x) => x + 1); const b = () => a().then((x) => x * 10); return await b(); } f()",
    );
    await runBoth(
      "async function f() { const p = Promise.resolve(5).then((x) => x * 2); return await p; } f()",
    );
  });

  it("should await inside labeled non-loop statements", async () => {
    await runBoth(
      "async function f() { let s = ''; label: { s += await Promise.resolve('a'); break label; s += 'x'; } return s; } f()",
    );
  });

  it("should preserve this through async methods", async () => {
    await runBoth(
      "class A { constructor() { this.base = 100; } async add(x) { return this.base + (await Promise.resolve(x)); } } const a = new A(); a.add(23)",
    );
    await runBoth(
      "class A { async m() { return 'A'; } } class B extends A { async m() { return (await super.m()) + 'B'; } } new B().m()",
    );
  });

  it("should handle unary typeof/void with await and optional member", async () => {
    await runBoth("async function f() { return typeof (await Promise.resolve(5)); } f()");
    await runBoth(
      "async function f() { const o = null; return o?.a ?? (await Promise.resolve('d')); } f()",
    );
    await runBoth("async function f() { void (await Promise.resolve(1)); return 'ok'; } f()");
  });
});

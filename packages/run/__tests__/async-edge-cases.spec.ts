import { describe, expect, it } from "vitest";

import { run } from "../src/index.js";

/**
 * Run code through Node's indirect `eval`, normalizing synchronous throws into rejections.
 *
 * 用 Node 间接 `eval` 运行代码，将同步抛出归一化为 rejection。
 *
 * @param code - Source code / 源码
 * @returns A promise of the result / 结果的 Promise
 */
const nodeRun = (code: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    try {
      resolve((0, eval)(code) as unknown);
    } catch (err) {
      // user code may throw any value, not just Errors
      /* oxlint-disable-next-line typescript/prefer-promise-reject-errors -- rejections may be arbitrary values */
      reject(err);
    }
  });

/**
 * Async golden comparison: Node (indirect `eval`) vs the interpreter.
 *
 * 异步黄金对照：Node（间接 `eval`）与解释器。
 *
 * @param code - Source code / 源码
 */
const runBoth = async (code: string): Promise<void> => {
  const expected = await nodeRun(code);
  const actual = await run(code);

  expect(actual).toStrictEqual(expected);
};

/**
 * Assert that both Node and the interpreter reject the code.
 *
 * 断言 Node 与解释器双方都 reject。
 *
 * @param code - Source code / 源码
 */
const expectRejectBoth = async (code: string): Promise<void> => {
  await expect(nodeRun(code)).rejects.toBeDefined();
  await expect(run(code)).rejects.toBeDefined();
};

describe("async statement edge cases", () => {
  it("should reject constructing an async function", () => {
    // constructing an async function throws synchronously on both sides
    // 构造 async 函数在两侧都同步抛错
    expect(() => {
      (0, eval)("new (async () => 1)()");
    }).toThrow(TypeError);
    expect(() => {
      run("new (async () => 1)()");
    }).toThrow(TypeError);
  });

  it("should evaluate async if-else alternate branches", async () => {
    await runBoth(
      "const f = async (x) => { if (x) return 'y'; else return await Promise.resolve('n'); }; Promise.all([f(true), f(false)])",
    );
  });

  it("should delegate safe statements (function declaration) to the sync evaluator", async () => {
    await runBoth(
      "const f = async () => { function g() { return 1; } return await Promise.resolve(g()); }; f()",
    );
  });

  it("should handle continue in async while loops", async () => {
    await runBoth(
      "const f = async () => { let i = 0; while (i < 3) { i += 1; if (i === 2) continue; } return i; }; f()",
    );
  });

  it("should handle continue and break in async do-while loops", async () => {
    await runBoth(
      "const f = async () => { let i = 0; do { i += 1; if (i === 2) continue; if (i === 4) break; } while (i < 5); return i; }; f()",
    );
  });

  it("should evaluate async var declarations with initializers", async () => {
    await runBoth(
      "const f = async () => { var a = await Promise.resolve(1); var b = 2; return a + b; }; f()",
    );
  });

  it("should handle async for var initializers", async () => {
    await runBoth(
      "const f = async () => { let s = 0; for (var i = 0; i < 3; i = await Promise.resolve(i + 1)) s += i; return s; }; f()",
    );
  });

  it("should handle async for with expression init and no binding", async () => {
    await runBoth(
      "const f = async () => { let i = 0; for (i = 0; i < 3; i += 1) { i += 1; } return i; }; f()",
    );
    await runBoth(
      "const f = async () => { let i = 0; for (i = 0; i < 3;) { i += 1; } return i; }; f()",
    );
  });

  it("should handle async for-in with member left and continue", async () => {
    await runBoth(
      "const f = async () => { const o = { a: 1, b: 2 }; const t = { k: '', s: 0 }; for (t.k in o) t.s += await Promise.resolve(1); return t.s; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = 0; for (const k in { a: 1, b: 2 }) { if (k === 'a') continue; s += 1; } return s; }; f()",
    );
  });

  it("should handle async for-of destructuring left and continue", async () => {
    await runBoth(
      "const f = async () => { let s = 0; for ([a, b] of [[1, 2], [3, 4]]) s += await Promise.resolve(a + b); return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = 0; for (const x of [1, 2, 3, 4]) { if (x % 2 === 0) continue; s += x; } return s; }; f()",
    );
  });

  it("should handle async switch with no matching case", async () => {
    await runBoth(
      "const f = async (x) => { switch (await Promise.resolve(x)) { case 1: return 'a'; } return 'none'; }; Promise.all([f(1), f(9)])",
    );
  });

  it("should preserve elisions in async array literals", async () => {
    await runBoth("const f = async () => { return [1, , await Promise.resolve(3)].length; }; f()");
  });
});

describe("async expression edge cases", () => {
  it("should read async super properties and computed methods", async () => {
    await runBoth(
      "const B = class extends (class A { get x() { return 1; } }) { async m() { return super.x; } }; new B().m()",
    );
    await runBoth(
      "const B = class extends (class A { m() { return 5; } }) { async m() { return super['m']() + 1; } }; new B().m()",
    );
  });

  it("should short-circuit async optional member and call", async () => {
    await runBoth("const f = async () => { const o = null; return o?.a; }; f()");
    await runBoth(
      "const f = async () => { const o = null; return (await Promise.resolve(o))?.a; }; f()",
    );
    await runBoth("const f = async () => { const g = null; return g?.(); }; f()");
  });

  it("should spread awaited arrays in async calls", async () => {
    await runBoth(
      "const f = async () => { const g = (a, b, c) => a + b + c; return g(...await Promise.resolve([1, 2, 3])); }; f()",
    );
  });

  it("should handle typeof of undeclared names in async", async () => {
    await runBoth("const f = async () => { return typeof notDeclared; }; f()");
  });

  it("should handle delete in async contexts", async () => {
    await runBoth(
      "const f = async () => { const o = { a: 1 }; delete (await Promise.resolve(o)).a; return o.a; }; f()",
    );
    await runBoth("const f = async () => { return delete undeclaredName; }; f()");
  });

  it("should apply async unary operators to bigint", async () => {
    await runBoth("const f = async () => { return -(await Promise.resolve(5n)); }; f()");
    await expectRejectBoth("const f = async () => { return +(await Promise.resolve(1n)); }; f()");
    await runBoth("const f = async () => { return ~(await Promise.resolve(0n)); }; f()");
  });

  it("should apply async updates to bigint members and identifiers", async () => {
    await runBoth(
      "const f = async () => { const o = { n: 5n }; (await Promise.resolve(o)).n++; return o.n; }; f()",
    );
    await runBoth("const f = async () => { let b = 3n; const old = b++; return [old, b]; }; f()");
  });

  it("should evaluate async class expressions", async () => {
    await runBoth(
      "const f = async () => { const C = class { async m() { return await Promise.resolve(7); } }; return await new C().m(); }; f()",
    );
  });

  it("should short-circuit async logical assignment", async () => {
    await runBoth(
      "const f = async () => { let x = 5; let c = 0; x ||= (c += 1, await Promise.resolve(9)); return [x, c]; }; f()",
    );
  });

  it("should reject invalid async assignment targets", async () => {
    await expectRejectBoth("const f = async () => { let x = 1; return (x() += 1); }; f()");
  });

  it("should destructure async rest patterns", async () => {
    await runBoth(
      "const f = async () => { let [a, ...rest] = await Promise.resolve([1, 2, 3]); return [a, rest]; }; f()",
    );
    await runBoth(
      "const f = async () => { const { a, ...r } = await Promise.resolve({ a: 1, b: 2 }); return [a, r]; }; f()",
    );
  });

  it("should evaluate async object getters, setters and __proto__", async () => {
    await runBoth(
      "const f = async () => { const o = { _x: await Promise.resolve(0), set x(v) { this._x = v * 2; }, get x() { return this._x; } }; o.x = 5; return o.x; }; f()",
    );
    await runBoth(
      "const f = async () => { const o = { __proto__: await Promise.resolve({ a: 1 }) }; return o.a; }; f()",
    );
  });

  it("should reject destructuring null and undefined in async", async () => {
    await expectRejectBoth(
      "const f = async () => { const [a] = await Promise.resolve(null); }; f()",
    );
    await expectRejectBoth(
      "const f = async () => { const { x } = await Promise.resolve(undefined); }; f()",
    );
  });

  it("should reject calling non-functions in async", async () => {
    await expectRejectBoth("const f = async () => { const x = 5; return await x(); }; f()");
  });

  it("should preserve raw throw values through async try/finally", async () => {
    await expectRejectBoth("const f = async () => { try { throw null; } finally {} }; f()");
  });

  it("should treat async for-in over null/undefined as a no-op", async () => {
    await runBoth(
      "const f = async () => { let s = 0; for (const k in null) s += 1; return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = 0; for (const k in undefined) s += 1; return s; }; f()",
    );
  });

  it("should short-circuit async delete over optional chains", async () => {
    await runBoth("const f = async () => { const o = null; return delete o?.a; }; f()");
    await runBoth("const f = async () => { const o = null; return delete o?.a.b; }; f()");
    await runBoth("const f = async () => { return delete undeclaredAsyncName; }; f()");
  });

  it("should support labeled async loops", async () => {
    await runBoth(
      "const f = async () => { let i = 0; let s = ''; outer: while (i < 3) { i += 1; await Promise.resolve(); if (i === 2) continue outer; s += i; } return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let i = 0; let s = ''; outer: while (i < 3) { i += 1; await Promise.resolve(); if (i === 2) break outer; s += i; } return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = 0; outer: for (const k in {a: 1, b: 2}) { await Promise.resolve(); if (k === 'a') continue outer; s += 1; } return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = 0; outer: for (const k in {a: 1, b: 2}) { await Promise.resolve(); if (k === 'a') break outer; s += 1; } return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = ''; outer: for (const x of [1, 2, 3]) { await Promise.resolve(); if (x === 2) continue outer; s += x; } return s; }; f()",
    );
  });

  it("should support async for with var init, expression init and no update", async () => {
    await runBoth(
      "const f = async () => { let s = 0; for (var i = await Promise.resolve(0); i < 3; i += 1) s += i; return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let i = 0; let s = 0; for (i = await Promise.resolve(0); i < 3; i += 1) { s += i; i += 1; } return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let i = 0; let s = 0; for (i = 0; i < 3;) { s += i; i += 1; } return s; }; f()",
    );
  });

  it("should support async super property reads and calls", async () => {
    await runBoth(
      "class A { get x() { return 5; } } class B extends A { async m() { return super.x; } } new B().m()",
    );
    await runBoth(
      "class A { m() { return 5; } } class B extends A { async m() { return super['m']() + 1; } } new B().m()",
    );
  });

  it("should support async spread, typeof and unary operators", async () => {
    await runBoth(
      "const f = async () => { const g = (a, b, c) => a + b + c; return g(...await Promise.resolve([1, 2, 3])); }; f()",
    );
    await runBoth("const f = async () => typeof notDeclaredAsyncName; f()");
    await runBoth("const f = async () => +(await Promise.resolve('3')); f()");
    await runBoth("const f = async () => -(await Promise.resolve(5)); f()");
    await runBoth("const f = async () => ~(await Promise.resolve(5)); f()");
  });

  it("should support async update and nullish assignment", async () => {
    await runBoth(
      "const f = async () => { let i = await Promise.resolve(1); i++; return i; }; f()",
    );
    await runBoth(
      "const f = async () => { const o = {n: 5}; (await Promise.resolve(o)).n++; return o.n; }; f()",
    );
    await runBoth(
      "const f = async () => { let x = 5; x ??= await Promise.resolve(9); return x; }; f()",
    );
    await runBoth(
      "const f = async () => { let x = null; x ??= await Promise.resolve(9); return x; }; f()",
    );
  });

  it("should support async destructuring with rest", async () => {
    await runBoth(
      "const f = async () => { const [a, ...rest] = await Promise.resolve([1, 2, 3]); return [a, rest]; }; f()",
    );
    await runBoth(
      "const f = async () => { const {a, ...r} = await Promise.resolve({a: 1, b: 2}); return [a, r]; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = 0; for ([a, ...rest] of [[1, 2, 3]]) s += rest.length; return s; }; f()",
    );
  });

  it("should support async object method shorthand", async () => {
    await runBoth(
      "const f = async () => { const o = { x: await Promise.resolve(1), m() { return 2; } }; return o.m() + o.x; }; f()",
    );
  });

  it("should handle async for-in null, var without init and no-update loops", async () => {
    await runBoth(
      "const f = async () => { let s = 0; for (const k in null) s += 1; return s; }; f()",
    );
    await runBoth(
      "const f = async () => { var a; var b = await Promise.resolve(1); return b; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = 0; for (let i = 0; i < 3;) { s += i; i += 1; } return s; }; f()",
    );
  });

  it("should support async super property reads and compound writes", async () => {
    await runBoth(
      "class A { get x() { return 5; } } class B extends A { async m() { return super.x; } } new B().m()",
    );
    await runBoth(
      "class A { constructor() { this._x = 5; } get x() { return this._x; } set x(v) { this._x = v; } } class B extends A { async m() { super.x += 2; return super.x; } } new B().m()",
    );
    await runBoth(
      "class A { m() { return 5; } } class B extends A { async m() { return super['m']() + 1; } } new B().m()",
    );
  });

  it("should rethrow unmatched async labels and support async optional calls", async () => {
    await runBoth(
      "const f = async () => { let s = 0; outer: for (let i = 0; i < 3; i += 1) { for (let j = 0; j < 3; j += 1) { await Promise.resolve(); if (i === 1 && j === 1) continue outer; s += 1; } } return s; }; f()",
    );
    await runBoth(
      "const f = async () => { let s = ''; outer: for (const x of [1, 2, 3]) { await Promise.resolve(); if (x === 2) break outer; s += x; } return s; }; f()",
    );
    await runBoth("const f = async () => { const o = null; return o?.m?.(); }; f()");
  });

  it("should support async spread, typeof, update and delete", async () => {
    await runBoth(
      "const f = async () => { const g = (a, b, c) => a + b + c; return g(...await Promise.resolve([1, 2, 3])); }; f()",
    );
    await runBoth("const f = async () => typeof notDeclaredAsyncName; f()");
    await runBoth(
      "const f = async () => { let i = await Promise.resolve(1); i++; return i; }; f()",
    );
    await runBoth("const f = async () => { const o = null; return delete o?.a.b; }; f()");
    await runBoth("const f = async () => { return delete undeclaredAsyncName; }; f()");
  });

  it("should support async destructuring with rest, elision and computed keys", async () => {
    await runBoth(
      "const f = async () => { const [a, , ...rest] = await Promise.resolve([1, 2, 3, 4]); return [a, rest]; }; f()",
    );
    await runBoth(
      "const f = async () => { const k = await Promise.resolve('a'); const {[k]: v, ...r} = await Promise.resolve({a: 1, b: 2}); return [v, r]; }; f()",
    );
    await expectRejectBoth(
      "const f = async () => { const [a] = await Promise.resolve(null); return a; }; f()",
    );
    await expectRejectBoth(
      "const f = async () => { const {x} = await Promise.resolve(undefined); return x; }; f()",
    );
  });
});

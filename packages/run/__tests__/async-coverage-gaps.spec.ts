import { describe, expect, it } from "vitest";

import { run } from "./golden.js";

/**
 * Evaluate code in Node (indirect `eval`) and return the result.
 *
 * 用 Node（间接 `eval`）求值并返回结果。
 *
 * @param code - Source code / 源码
 * @returns The evaluation result / 求值结果
 */
const nodeRun = (code: string): unknown => (0, eval)(code);

/**
 * Golden async comparison: Node (indirect `eval`) vs the interpreter.
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
 * Assert that both Node and the interpreter reject with a `TypeError`.
 *
 * 断言 Node 与解释器都以 `TypeError` reject。
 *
 * @param code - Source code / 源码
 */
const expectTypeErrorBoth = async (code: string): Promise<void> => {
  await expect(nodeRun(code)).rejects.toBeInstanceOf(TypeError);
  await expect(run(code)).rejects.toBeInstanceOf(TypeError);
};

describe("async function edge coverage", () => {
  it("should box primitive this values for async sloppy functions", async () => {
    await runBoth("async function f() { return typeof this; } f.call(5)");
    await runBoth("async function f() { this.x = 1; return typeof this.x; } f.call(5)");
  });

  it("should support bare returns and uninitialized let declarations", async () => {
    await runBoth("async function f() { return; } f()");
    await runBoth("async function f() { let x; return x; } f()");
  });

  it("should propagate thrown values out of async loop bodies", async () => {
    await expect(run("async function f() { while (true) { throw 1; } } f()")).rejects.toBe(1);
    await expect(run("async function f() { for (;;) { throw 1; } } f()")).rejects.toBe(1);
    await expect(
      run("async function f() { for (const k in { a: 1 }) { throw 1; } } f()"),
    ).rejects.toBe(1);
  });

  it("should handle labeled continue/break in async do-while and for-in loops", async () => {
    await runBoth(
      "async function f() { let i = 0; outer: do { i += 1; if (i === 1) continue outer; break outer; } while (i < 3); return i; } f()",
    );
    await runBoth(
      "async function f() { outer: for (const k in { a: 1, b: 2 }) { if (k === 'a') continue outer; break outer; } return 1; } f()",
    );
  });

  it("should evaluate an async for head without an update expression", async () => {
    await runBoth("async function f() { for (let i = 0; ;) { break; } return 1; } f()");
  });
});

describe("async expression edge coverage", () => {
  it("should keep successful optional chains in async code", async () => {
    await runBoth("async function f(o) { return o?.a; } f({ a: 1 })");
    await runBoth("async function f(o) { return o?.m(); } f({ m: () => 1 })");
    await runBoth("async function f(o) { return o?.a.b(); } f(null)");
    await runBoth("async function f(o) { return o?.a?.b(); } f({ a: null })");
    await runBoth("async function f(o) { return o?.a[await 'b']; } f({ a: { b: 4 } })");
    await runBoth("async function f(o) { return o?.[await 'm'](); } f({ m: () => 5 })");
  });

  it("should support computed super access and assignment in async methods", async () => {
    await runBoth(
      "class A { m() { return 1; } } class B extends A { async m() { return super['m'](); } } new B().m()",
    );
    await runBoth(
      "class A { constructor() { this._x = 1; } get x() { return this._x; } set x(v) { this._x = v; } } class B extends A { async m() { super.x += await Promise.resolve(1); return this.x; } } new B().m()",
    );
    await runBoth(
      "class A { constructor() { this._x = 1; } get x() { return this._x; } set x(v) { this._x = v; } } class B extends A { async m() { super[await 'x'] = 2; return super.x; } } new B().m()",
    );
  });

  it("should evaluate async typeof and delete expressions", async () => {
    await runBoth("async function f() { return typeof missing; } f()");
    await runBoth("async function f() { const a = 1; return typeof a; } f()");
    await runBoth("async function f() { var x = 1; return delete x; } f()");
    await runBoth("async function f() { return delete (1 + 2); } f()");
    await runBoth("async function f(o) { return delete o[await 'a']; } f({ a: 1 })");
    await runBoth("async function f(o) { return delete o.a[await 'b']; } f({ a: { b: 1 } })");
  });

  it("should reject a strict delete of an unqualified name in async code", async () => {
    await expect(
      run("async function f() { return delete x; } f()", { strict: true }),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it("should support async update expressions and computed member assignments", async () => {
    await runBoth("async function f() { let x = 0; x++; ++x; return x; } f()");
    await runBoth("async function f(o) { o[await 'a'] = 1; return o.a; } f({})");
  });

  it("should evaluate async object literals with spread, computed and symbol keys", async () => {
    await runBoth("async function f() { return { ...(await 1), a: 2 }; } f()");
    await runBoth("async function f() { return { [await 'a']: 1 }; } f()");
    await runBoth(
      "async function f() { return typeof { [Symbol.iterator]: function () {}, a: await 1 }[Symbol.iterator]; } f()",
    );
    await runBoth(
      "async function f() { const o = { __proto__: Math.max, a: await 1 }; return typeof Object.getPrototypeOf(o); } f()",
    );
  });

  it("should destructure async values with computed keys and defaults", async () => {
    await expectTypeErrorBoth("async function f() { const [a = await 1] = undefined; } f()");
    await expectTypeErrorBoth("async function f() { const { a = await 1 } = undefined; } f()");
    await runBoth("async function f() { const [a = await 1] = []; return a; } f()");
    await runBoth("async function f() { const { a = await 1 } = {}; return a; } f()");
    await runBoth("async function f(o) { const { [await 'a']: x } = o; return x; } f({ a: 3 })");
  });

  it("should evaluate computed async callees and chain callees", async () => {
    await runBoth("async function f(o) { return o[await 'm'](); } f({ m: () => 2 })");
    await runBoth("async function f(o) { return o?.[await 'm'](); } f({ m: () => 5 })");
  });
});

describe("further async branch coverage", () => {
  it("should evaluate async variable declarations when a sibling initializer awaits", async () => {
    await runBoth("async function f() { let x; const y = await 1; return x; } f()");
  });

  it("should run an async for loop without init, update or bindings", async () => {
    await runBoth("async function f() { for (;;) { break; } return 1; } f()");
  });

  it("should evaluate the right side of async logical-or", async () => {
    await runBoth("async function f() { return (await 0) || (await 2); } f()");
  });

  it("should delete a non-computed member of a computed async member", async () => {
    await runBoth("async function f(o) { return delete o[await 'a'].b; } f({ a: { b: 1 } })");
  });

  it("should throw for super member access with a null super base", async () => {
    await expect(
      run("class A extends null { async m() { super.x = 1; } } Object.create(A.prototype).m()"),
    ).rejects.toBeInstanceOf(ReferenceError);
    await expect(
      run(
        "class A extends null { async m() { return super.m?.(); } } Object.create(A.prototype).m()",
      ),
    ).rejects.toBeInstanceOf(ReferenceError);
    await expect(
      run(
        "class A extends null { async m() { return super.m?.x; } } Object.create(A.prototype).m()",
      ),
    ).rejects.toBeInstanceOf(ReferenceError);
  });

  it("should support optional chains rooted at super inside async methods", async () => {
    await runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { async n() { return super.m?.(); } } new B().n()",
    );
    await runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { async n() { return super.m?.x; } } new B().n()",
    );
    await runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { async n() { return super.m?.().x; } } new B().n()",
    );
  });

  it("should evaluate a computed compound super assignment in async code", async () => {
    await runBoth(
      "class A { constructor() { this._x = 1; } get x() { return this._x; } set x(v) { this._x = v; } } class B extends A { async m() { super[await 'x'] += 2; return this.x; } } new B().m()",
    );
  });
});

describe("async super optional chain coverage", () => {
  it("should evaluate computed optional reads and calls rooted at super", async () => {
    await runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { async n() { return super[await 'm']?.(); } } new B().n()",
    );
    await runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { async n() { return super.m?.[await 'x']; } } new B().n()",
    );
  });

  it("should throw for computed optional super chains with a null super base", async () => {
    await expect(
      run(
        "class A extends null { async n() { return super.m?.[await 'x']; } } Object.create(A.prototype).n()",
      ),
    ).rejects.toBeInstanceOf(ReferenceError);
    await expect(
      run(
        "class A extends null { async n() { super[await 'x'] += 1; } } Object.create(A.prototype).n()",
      ),
    ).rejects.toBeInstanceOf(ReferenceError);
  });

  it("should carry optional chains on async super() calls inside arrows", async () => {
    await runBoth(
      "class A {} class B extends A { constructor() { const f = async () => super()?.[await 'x']; return f(); } } new B()",
    );
  });

  it("should handle a no-init declarator beside an awaited initializer", async () => {
    await runBoth("async function f() { let x, y = await 1; return x; } f()");
  });

  it("should run an async for loop whose test awaits without bindings or update", async () => {
    await runBoth(
      "async function f() { for (; await Promise.resolve(true); ) { break; } return 1; } f()",
    );
  });
});

describe("async computed super coverage", () => {
  it("should read computed async super members", async () => {
    await runBoth(
      "class A { m() { return 1; } } class B extends A { async n() { return typeof super[await 'm']; } } new B().n()",
    );
  });

  it("should use computed keys on async super chain links", async () => {
    await runBoth(
      "class A { m() { return { x: 1 }; } } class B extends A { async n() { return super[await 'm']?.x; } } new B().n()",
    );
  });

  it("should run an async for loop with no bindings or update that completes normally", async () => {
    await runBoth(
      "async function f() { let i = 0; for (; i < 1; ) { i += 1; await 0; } return i; } f()",
    );
  });
});

describe("async catch, assignment and proto coverage", () => {
  it("should support catch clauses without a binding", async () => {
    await runBoth(
      "async function f() { try { await Promise.reject(1); } catch { return 2; } } f()",
    );
  });

  it("should evaluate async logical-and assignment with a truthy old value", async () => {
    await runBoth("async function f() { let x = 1; x &&= await 2; return x; } f()");
  });

  it("should ignore a primitive __proto__ value in async object literals", async () => {
    await runBoth(
      "async function f() { return Object.getPrototypeOf({ __proto__: await 1 }) === Object.prototype; } f()",
    );
  });

  it("should delete a non-member operand in async code", async () => {
    await runBoth("async function f() { return delete (await 1); } f()");
  });
});

describe("async update operator coverage", () => {
  it("should decrement numbers and bigints on computed async members", async () => {
    await runBoth(
      "async function f() { const o = { a: 5 }; const old = o[await 'a']--; return [old, o.a]; } f()",
    );
    await runBoth(
      "async function f() { const o = { a: 5n }; const old = o[await 'a']--; return [old, o.a]; } f()",
    );
    await runBoth("async function f() { const o = { a: 5 }; return [++o[await 'a'], o.a]; } f()");
    await runBoth("async function f() { const o = { a: 5n }; return [++o[await 'a'], o.a]; } f()");
  });
});

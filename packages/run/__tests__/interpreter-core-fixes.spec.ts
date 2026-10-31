import { describe, expect, it } from "vitest";

import { Environment } from "../src/environment.js";
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

describe("global object mirroring", () => {
  it("should not mirror top-level let reassignments onto the sandbox global", () => {
    const runtime = new Runtime();

    expect(runtime.run(parse("let Object = 1; Object = 2; Object"))).toBe(2);
    expect(runtime.globalObject.Object).toBe(Object);
  });

  it("should not mirror top-level class reassignments onto the sandbox global", () => {
    const runtime = new Runtime();

    runtime.run(parse("class Array {} Array = 5;"));
    expect(runtime.globalObject.Array).toBe(Array);
  });

  it("should keep mirroring var and function bindings", () => {
    const runtime = new Runtime();

    runtime.run(
      parse("var mirrored = 1; mirrored = 2; function mirroredFn() { return mirrored; }"),
    );

    expect(runtime.globalObject.mirrored).toBe(2);
    expect(runtime.globalObject.mirroredFn).toBeTypeOf("function");
  });

  it("should only mirror var-like bindings at the Environment level", () => {
    const globalObject = { builtin: 1 } as Record<PropertyKey, unknown>;
    const global = new Environment(null, true, globalObject);

    global.declareLet("lexical");
    global.initialize("lexical", 1);
    expect(global.set("lexical", 2)).toBe(true);
    expect(globalObject.lexical).toBeUndefined();

    global.declareVar("hoisted");
    expect(globalObject.hoisted).toBeUndefined();
    expect(global.set("hoisted", 3)).toBe(true);
    expect(globalObject.hoisted).toBe(3);

    global.declareConst("constant");
    global.initialize("constant", 1);
    expect(() => global.set("constant", 2)).toThrow(TypeError);
    expect(globalObject.constant).toBeUndefined();
  });
});

describe("super property references", () => {
  it("should not recurse when a subclass setter writes through super", () => {
    expect(
      run(
        [
          "class A {",
          "  set x(v) { this._x = v; }",
          "  get x() { return this._x; }",
          "}",
          "class B extends A {",
          "  set x(v) { super.x = v + 1; }",
          "  get x() { return 100; }",
          "}",
          "const b = new B();",
          "b.x = 1;",
          "b._x",
        ].join("\n"),
      ),
    ).toBe(2);
  });

  it("should read super.x from the parent for a postfix update", () => {
    expect(
      run(
        "class A { get x() { return 1; } } class B extends A { get x() { return 2; } m() { return super.x++; } } new B().m()",
      ),
    ).toBe(1);
  });

  it("should read super.x from the parent for a prefix update", () => {
    expect(
      run(
        "class A { get x() { return 1; } } class B extends A { get x() { return 2; } m() { const v = ++super.x; return [v, this.x]; } } new B().m()",
      ),
    ).toStrictEqual([2, 2]);
  });

  it("should read super.x from the parent for a compound assignment", () => {
    expect(
      run(
        "class A { get x() { return 1; } set x(v) { this._x = v; } } class B extends A { get x() { return 2; } m() { super.x += 10; return this._x; } } new B().m()",
      ),
    ).toBe(11);
  });

  it("should run a super getter with the instance as receiver", () => {
    expect(
      run(
        "class A { get m() { return () => this.v; } } class B extends A { constructor() { super(); this.v = 7; } run() { return super.m(); } } new B().run()",
      ),
    ).toBe(7);
  });

  it("should run a super getter with the instance as receiver in async code", async () => {
    await expect(
      run(
        "class A { get m() { return () => this.v; } } class B extends A { constructor() { super(); this.v = 8; } async run() { return super.m(); } } new B().run()",
      ),
    ).resolves.toBe(8);
  });

  it("should silently ignore a failed super write in sloppy mode", () => {
    expect(
      run(
        "class A { get x() { return 1; } } class B extends A { m() { super.x = 2; return this.x; } } new B().m()",
      ),
    ).toBe(1);
  });

  it("should throw for a failed super write in strict mode", () => {
    expect(() =>
      run(
        "class A { get x() { return 1; } } class B extends A { m() { super.x = 2; return this.x; } } new B().m()",
        { strict: true },
      ),
    ).toThrow(TypeError);
  });

  it("should reject super property reads before super()", () => {
    expect(() =>
      run(
        "class A { get x() { return 1; } } class B extends A { constructor() { super.x; super(); } } new B()",
      ),
    ).toThrow(ReferenceError);
  });

  it("should reject super property writes before super()", () => {
    expect(() =>
      run("class A {} class B extends A { constructor() { super.x = 1; super(); } } new B()"),
    ).toThrow(ReferenceError);
  });

  it("should reject super property updates before super()", () => {
    expect(() =>
      run(
        "class A { get x() { return 1; } } class B extends A { constructor() { super.x++; super(); } } new B()",
      ),
    ).toThrow(ReferenceError);
  });

  it("should reject super method calls before super() instead of exposing the sentinel", () => {
    expect(() =>
      run(
        "class A { m() { return typeof this; } } class B extends A { constructor() { super.m(); super(); } } new B()",
      ),
    ).toThrow(ReferenceError);
  });

  it("should reject super property reads before super() in an arrow", () => {
    expect(() =>
      run(
        "class A { get x() { return 1; } } class B extends A { constructor() { const f = () => super.x; f(); super(); } } new B()",
      ),
    ).toThrow(ReferenceError);
  });

  it("should resolve super.x on base classes without extends against Object.prototype and Function.prototype", () => {
    expect(run("class A { m() { return super.toString(); } } new A().m()")).toBe("[object Object]");
    expect(run("class A { static s() { return typeof super.call; } } A.s()")).toBe("function");
  });
});

describe("async arrow this binding and inline async generator stack limits", () => {
  it("should preserve undefined lexical this in async arrows in strict mode", async () => {
    await expect(run("const f = async () => this; f()", { strict: true })).resolves.toBeUndefined();
    await expect(
      run("function outer() { const f = async () => this; return f(); } outer.call(null)", {
        strict: true,
      }),
    ).resolves.toBeNull();
  });

  it("should enforce maxStack for inline arrows containing await", async () => {
    await expect(
      run("async function outer() { const rec = () => (await 0, rec()); return rec(); } outer()", {
        maxStack: 10,
      }),
    ).rejects.toThrow(/Maximum call stack size/u);
  });
});

describe("multi-labeled loops and iterator closing on destructuring / for-of target errors", () => {
  it("should handle continue and break targeting any label on a multi-labeled loop", async () => {
    expect(
      run(
        "let n = 0; a: b: for (let i = 0; i < 3; i += 1) { if (i === 1) continue a; n += 10; } n",
      ),
    ).toBe(20);
    expect(run("let n = 0; a: b: while (n < 5) { n += 1; if (n === 2) break a; } n")).toBe(2);
    expect(run("let n = 0; a: b: { n = 1; break a; n = 2; } n")).toBe(1);
    expect(run("let n = 0; a: { n = 3; } n")).toBe(3);
    await expect(
      run(
        "async function f() { let n = 0; a: b: for (let i = 0; i < 3; i += 1) { await 0; if (i === 1) continue a; n += 10; } return n; } f()",
      ),
    ).resolves.toBe(20);
    await expect(
      run(
        "async function f() { let n = 0; a: b: { await 0; n = 1; break a; n = 2; } return n; } f()",
      ),
    ).resolves.toBe(1);
  });

  it("should close the iterator in array destructuring when incomplete or when assignment throws", async () => {
    expect(
      run(
        [
          "let closed = 0;",
          "const iter = {",
          "  [Symbol.iterator]() {",
          "    let i = 0;",
          "    return {",
          "      next() { return { value: ++i, done: i > 3 }; },",
          "      return() { closed += 1; return { done: true }; },",
          "    };",
          "  },",
          "};",
          "const [a] = iter;",
          "const [, ...rest] = iter;",
          "[a, rest, closed]",
        ].join("\n"),
      ),
    ).toStrictEqual([1, [2, 3], 1]);

    expect(
      run(
        [
          "let closed = 0;",
          "const iter = {",
          "  [Symbol.iterator]() {",
          "    return {",
          "      next() { return { value: 1, done: false }; },",
          "      return() { closed += 1; return { done: true }; },",
          "    };",
          "  },",
          "};",
          "try { [null.x] = iter; } catch {}",
          "closed",
        ].join("\n"),
      ),
    ).toBe(1);

    expect(
      run(
        [
          "let closed = 0;",
          "const emptyIter = {",
          "  [Symbol.iterator]() {",
          "    return {",
          "      next() { return { value: undefined, done: true }; },",
          "      return() { closed += 1; return { done: true }; },",
          "    };",
          "  },",
          "};",
          "try { const [a = (() => { throw new Error('boom'); })()] = emptyIter; } catch {}",
          "closed",
        ].join("\n"),
      ),
    ).toBe(0);

    await expect(
      run(
        [
          "async function f() {",
          "  let closed = 0;",
          "  const iter = {",
          "    [Symbol.iterator]() {",
          "      let i = 0;",
          "      return {",
          "        next() { return { value: ++i, done: i > 3 }; },",
          "        return() { closed += 1; return { done: true }; },",
          "      };",
          "    },",
          "  };",
          "  const [a = await 0] = iter;",
          "  const [, c = await 0, ...rest] = iter;",
          "  try { [(await null).x] = iter; } catch {}",
          "  const emptyIter = {",
          "    [Symbol.iterator]() {",
          "      return {",
          "        next() { return { value: undefined, done: true }; },",
          "        return() { closed += 10; return { done: true }; },",
          "      };",
          "    },",
          "  };",
          "  try { const [b = await Promise.reject(new Error('boom'))] = emptyIter; } catch {}",
          "  return [a, c, rest, closed];",
          "}",
          "f()",
        ].join("\n"),
      ),
    ).resolves.toStrictEqual([1, 2, [3], 2]);
  });

  it("should close the iterator in for...of when assigning to the loop target throws", async () => {
    expect(
      run(
        [
          "let closed = 0;",
          "const iter = {",
          "  [Symbol.iterator]() {",
          "    return {",
          "      next() { return { value: 1, done: false }; },",
          "      return() { closed += 1; return { done: true }; },",
          "    };",
          "  },",
          "};",
          "try { for (null.x of iter) {} } catch {}",
          "closed",
        ].join("\n"),
      ),
    ).toBe(1);

    await expect(
      run(
        [
          "async function f() {",
          "  let closed = 0;",
          "  const iter = {",
          "    [Symbol.iterator]() {",
          "      return {",
          "        next() { return { value: 1, done: false }; },",
          "        return() { closed += 1; return { done: true }; },",
          "      };",
          "    },",
          "  };",
          "  try { for ((await null).x of iter) {} } catch {}",
          "  return closed;",
          "}",
          "f()",
        ].join("\n"),
      ),
    ).resolves.toBe(1);
  });
});

describe("async function toString and /= regex literals", () => {
  it("should include async in Function.prototype.toString for async declarations, expressions and arrows", () => {
    expect(run("async function f() { return 1; } f.toString()")).toBe(
      "async function f() { return 1; }",
    );
    expect(run("const f = async function() { return 1; }; f.toString()")).toBe(
      "async function() { return 1; }",
    );
    expect(run("const f = async (x) => x; f.toString()")).toBe("async (x) => x");
    expect(run("const f = async x => x; f.toString()")).toBe("async x => x");
  });

  it("should parse regex literals starting with /= after await", async () => {
    await expect(
      run("async function f() { const r = await /=a/; return r.test('=a'); } f()"),
    ).resolves.toBe(true);
  });
});

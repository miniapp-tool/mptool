import { describe, expect, it } from "vitest";

import type { RunOptions } from "../src/index.js";
import { Runtime } from "../src/interpreter.js";
import { parse } from "../src/parser.js";
import { getInterpreterMeta } from "../src/value.js";

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

/**
 * Golden comparison: run the same code in Node (indirect `eval`) and in the interpreter, then
 * assert the results are strictly equal. Node is the source of truth — never assert a hardcoded
 * literal.
 *
 * Golden 对照：将同一段代码分别在 Node（间接 `eval`）与本解释器中运行，并断言结果严格相等。Node 是唯一 依据——绝不断言硬编码字面量。
 *
 * @param code - Source code (must avoid top-level `var`/`function` so it does not leak into the
 *   Node global scope) / 源码（顶层避免 `var`/`function`，以免泄漏到 Node 全局作用域）
 */
const runBoth = (code: string): void => {
  const expected = (0, eval)(code);
  const actual = run(code);

  expect(actual).toStrictEqual(expected);
};

/**
 * Assert that BOTH Node (via indirect `eval`) and the interpreter throw.
 *
 * Per design doc §4.6 only "it throws" is asserted for error paths — error types and messages may
 * legitimately differ between Node and the interpreter.
 *
 * 断言 Node 与本解释器**都**抛错（设计文档 §4.6：错误路径只要求"能抛错"，错误类型/消息可合理不同）。
 *
 * @param code - Source code / 源码
 * @param options - Runtime options / 运行时选项
 */
const expectError = (code: string, options?: RunOptions): void => {
  // both Node and the interpreter must throw (types/messages may differ, §4.6)
  // Node 与本解释器都必须抛错（类型/消息可不同，§4.6）
  expect(() => {
    (0, eval)(code);
  }).toThrow(Error);
  expect(() => {
    run(code, options);
  }).toThrow(Error);
};

describe("operator edge cases", () => {
  it("should evaluate >= comparisons", () => {
    runBoth("5 >= 3");
    runBoth("2 >= 2");
    runBoth("1 >= 2");
    runBoth("'b' >= 'a'");
  });

  it("should evaluate prefix and postfix updates", () => {
    runBoth("let i = 0; i++; i");
    runBoth("let i = 0; ++i; i");
    runBoth("let i = 5; i--; i");
    runBoth("let i = 5; --i; i");
    runBoth("const o = {n: 1}; o.n++; o.n");
    runBoth("const o = {n: 1}; ++o.n; o.n");
    runBoth("let i = 0; const a = i++; const b = ++i; [a, b, i]");
  });

  it("should evaluate BigInt updates", () => {
    runBoth("let b = 3n; b++; b");
    runBoth("const o = {n: 3n}; o.n++; o.n");
    runBoth("let i = 5n; --i; i");
  });

  it("should throw on update of invalid targets", () => {
    expectError("++1");
    expectError("let x = 1; x()++");
  });
});

describe("error paths", () => {
  it("should throw on null/undefined property assignment", () => {
    expectError("const o = null; o.x = 1");
    expectError("undefined.x = 1");
    expectError("(null).x = 1");
  });

  it("should throw on destructuring null/undefined", () => {
    expectError("let [a] = null");
    expectError("const {x} = undefined");
    expectError("let {x} = null");
  });

  it("should throw on nested destructuring of null", () => {
    expectError("const {a: {b}} = {a: null}; b");
    expectError("const {a: {b}} = null; b");
  });

  it("should throw on invalid assignment targets", () => {
    expectError("1 = 2");
    expectError("f() = 1");
    expectError("let x = 1; x() += 1");
  });

  it("should throw on for-of over null or non-iterables", () => {
    expectError("let s = 0; for (const x of null) s += x");
    expectError("let s = 0; for (const x of 5) s += x");
    expectError("let s = 0; for (const x of {length: 2}) s += 1; s");
  });

  it("should throw on class misuse", () => {
    expectError("class A {} A()");
    expectError("new (() => 1)()");
    expectError("class A extends 5 {}");
  });

  it("should throw on constructing a class method", () => {
    expectError("class A { m() {} } const a = new A(); new a.m()");
    expectError("class A { static m() {} } new A.m()");
  });

  it("should throw on a class extending itself", () => {
    expectError("class A extends A {}");
  });

  it("should throw on derived constructor misuse", () => {
    expectError("class A {} class B extends A { constructor() {} } new B()");
    expectError("class A {} class B extends A { constructor() { this.x = 1; super(); } } new B()");
    expectError("class A { constructor() { super(); } } new A()");
  });

  it("should handle delete operator edge cases", () => {
    runBoth("const o = null; delete o?.a");
    runBoth("delete undeclaredNameXYZ");
    runBoth("delete 5");
    runBoth("const o = {a: {b: 1}}; delete o?.a.b; o.a.b === undefined");
    // strict-mode delete of an unqualified identifier throws on both sides
    // 严格模式删除未限定标识符：两侧都抛错
    expect(() => {
      (0, eval)('"use strict"; delete x');
    }).toThrow(Error);
    expect(() => {
      run("delete x", { strict: true });
    }).toThrow(Error);
  });
});

describe("statement edge cases", () => {
  it("should evaluate debugger and empty statements", () => {
    runBoth("debugger; 5");
    runBoth("; 7");
  });

  it("should support for loops with expression init and no binding", () => {
    runBoth("let i = 0; for (i = 0; i < 3; i += 1) { i += 1; } i");
    runBoth("let i = 0; let s = 0; for (i = 1; i < 4; i += 1) s += i; s");
  });

  it("should support for-in with let/var/member left", () => {
    runBoth("const o = {a: 1, b: 2}; let s = 0; for (let k in o) s += o[k]; s");
    runBoth("const o = {a: 1, b: 2}; let s = 0; for (var k in o) s += o[k]; s");
    runBoth("const o = {a: 1, b: 2}; const t = {k: '', s: 0}; for (t.k in o) t.s += 1; t.s");
    runBoth(
      "const o = {a: 1, b: 2}; let s = 0; for (const k in o) { if (k === 'b') break; s += 1; } s",
    );
    runBoth("let s = ''; for (const k in 'ab') s += k; s");
  });

  it("should support for-of with var/destructuring left", () => {
    runBoth("let s = 0; for (var x of [1, 2, 3]) s += x; s");
    runBoth("let s = 0; for ([a, b] of [[1, 2], [3, 4]]) s += a + b; s");
    runBoth("let s = 0; for ({x} of [{x: 1}, {x: 2}]) s += x; s");
    runBoth("let s = 0; for ([a = 1] of [[2], [undefined]]) s += a; s");
    runBoth("let s = ''; for (const c of 'ab') s += c; s");
  });

  it("should resolve labels on the immediately labeled loop", () => {
    runBoth("let s = 0; label: { s += 1; break label; s += 2; } s");
    runBoth(
      "let s = 0; outer: for (let i = 0; i < 3; i += 1) { if (i === 1) continue outer; s += i; } s",
    );
    runBoth(
      "let s = 0; outer: for (let i = 0; i < 3; i += 1) { if (i === 1) break outer; s += i; } s",
    );
  });

  it("should throw on continue to a non-loop label", () => {
    expectError("let s = 0; label: { continue label; }");
  });

  it("should handle switch with no match and no default", () => {
    runBoth("const f = (x) => { switch (x) { case 1: return 'a'; } return 'none'; }; f(9)");
    runBoth("const f = (x) => { switch (x) { } return 'empty'; }; f(1)");
    runBoth(
      "const f = (x) => { switch (x) { case 1: case 2: return 'ab'; default: return 'd'; } }; f(2)",
    );
    runBoth("const f = (x) => { switch (x) { default: return 'd'; } }; f(1)");
    runBoth(
      "const f = (x) => { let s = ''; switch (x) { case 1: s += 'a'; break; case 2: s += 'b'; } return s; }; f(1)",
    );
  });

  it("should hoist var declarations in if alternate branches", () => {
    runBoth("const f = function() { if (false) var a = 1; return typeof a; }; f()");
    runBoth("const f = function() { if (true) { } else { var b = 1; } return typeof b; }; f()");
  });

  it("should hoist var declarations in for-in/of heads", () => {
    runBoth("const f = function() { for (var x in {a: 1}) { } return typeof x; }; f()");
    runBoth("const f = function() { for (var x of [1]) { } return typeof x; }; f()");
  });
});

describe("expression edge cases", () => {
  it("should support rest in destructuring patterns", () => {
    runBoth("let [a, ...rest] = [1, 2, 3]; rest");
    runBoth("let {a, ...r} = {a: 1, b: 2}; r");
    runBoth("let [a, [b, ...c], {d}] = [1, [2, 3], {d: 4}]; [a, b, c, d]");
    runBoth("let a, b; [a, ...b] = [1, 2, 3]; [a, b]");
  });

  it("should support defaults inside destructuring patterns", () => {
    runBoth("let [a = 1, b] = []; [a, b]");
    runBoth("let {x = 5} = {}; x");
    runBoth("let [a = 1] = [7]; a");
  });

  it("should support default parameters", () => {
    runBoth("const f = (a = 5) => a; f()");
    runBoth("const f = (a = 5) => a; f(1)");
    runBoth("const f = (a = 5, ...rest) => [a, rest]; f()");
    runBoth("const f = ({a} = {a: 1}) => a; f()");
    runBoth("const f = ({a} = {a: 1}) => a; f({a: 9})");
  });

  it("should map arguments writes back in sloppy mode", () => {
    runBoth("const f = function(a) { arguments[0] = 99; return a; }; f(1)");
    runBoth("const f = function(a, b) { arguments[1] = 7; return [arguments[1], b]; }; f(1, 2)");
    runBoth("const f = function() { arguments[2] = 9; return arguments[2]; }; f(1, 2)");
    runBoth("const f = function() { return typeof arguments.callee; }; f()");
  });

  it("should not map arguments in strict mode", () => {
    // Runtime `strict` option vs Node wrapped in `"use strict"` (the interpreter does not honor
    // in-function `'use strict'` directives — see the divergences section of the report).
    // Runtime `strict` 选项对照 Node 包裹 `"use strict"`（解释器不识别函数内 `'use strict'` 指令，见报告）。
    const expected = (0, eval)('"use strict"; (function(a) { arguments[0] = 99; return a; })(1)');

    expect(
      run("const f = function(a) { arguments[0] = 99; return a; }; f(1)", { strict: true }),
    ).toStrictEqual(expected);

    const expectedLength = (0, eval)(
      '"use strict"; (function() { return arguments.length; })(1, 2)',
    );

    expect(
      run("const f = function() { return arguments.length; }; f(1, 2)", { strict: true }),
    ).toStrictEqual(expectedLength);
  });

  it("should read and write super properties in class methods", () => {
    runBoth(
      "class A { get x() { return 1; } } class B extends A { m() { return super.x; } } new B().m()",
    );
    runBoth(
      "class A { m() { return 5; } } class B extends A { m() { return super['m']() + 1; } } new B().m()",
    );
    runBoth(
      "class A { static s() { return 'A'; } } class B extends A { static s() { return super.s() + 'B'; } } B.s()",
    );
    runBoth(
      "class A { set x(v) { this._x = v; } } class B extends A { m() { super.x = 5; return this._x; } } new B().m()",
    );
    runBoth(
      "class A { set x(v) { this._x = v; } } class B extends A { m() { super['x'] = 7; return this._x; } } new B().m()",
    );
  });

  it("should preserve array elisions", () => {
    runBoth("const a = [1, , 3]; a.length");
    runBoth("const a = [1, , 3]; a[1]");
    runBoth("const a = [1, , 3]; 1 in a");
    runBoth("const a = [, ]; a.length");
  });

  it("should support object setters and __proto__", () => {
    runBoth(
      "const o = { _x: 0, get x() { return this._x; }, set x(v) { this._x = v * 2; } }; o.x = 5; o.x",
    );
    runBoth("const o = { __proto__: { a: 1 } }; o.a");
    runBoth("const o = { __proto__: 5 }; Object.getPrototypeOf(o) === Object.prototype");
  });

  it("should spread into sync calls", () => {
    runBoth("const f = (a, b, c) => a + b + c; f(...[1, 2, 3])");
    runBoth("const f = (a, b, c) => a + b + c; f(1, ...[2], 3)");
    runBoth("Math.max(...[3, 1, 2])");
  });

  it("should evaluate super on a plain object method as undefined", () => {
    runBoth("const o = { m() { return super.x; } }; o.m()");
  });
});

describe("runtime public methods", () => {
  it("should call and construct through the Runtime API", () => {
    const runtime = new Runtime();

    const fn = runtime.run(parse("(function(a, b) { return a + b; })")) as (
      ...args: unknown[]
    ) => unknown;
    const fnMeta = getInterpreterMeta(fn);

    expect(fnMeta).not.toBeNull();
    expect(runtime.callFunction(fnMeta as never, [1, 2], void 0)).toBe(3);

    // a class expression (not a declaration) so the completion value is the constructor
    // 使用类表达式（而非类声明），使完成值为构造器
    const Ctor = runtime.run(parse("(class { constructor(x) { this.x = x; } })"));
    const ctorMeta = getInterpreterMeta(Ctor);

    expect(ctorMeta).not.toBeNull();
    // interpreter class instances have a null prototype, so `instanceof Object` is false
    // 解释器类实例原型为 null，因此 `instanceof Object` 为 false
    const instance = runtime.constructFunction(ctorMeta as never, [42]) as { x: unknown } | null;

    expect(instance).not.toBeNull();
    expect(instance?.x).toBe(42);
  });
});

describe("this edge cases", () => {
  it("should evaluate this at the top level", () => {
    runBoth("this === globalThis");
  });

  it("should construct through an implicit derived constructor", () => {
    runBoth("class A { constructor() { this.v = 1; } } class B extends A {} new B().v");
  });
});

describe("loop label edge cases", () => {
  it("should treat for-in over null/undefined as a no-op", () => {
    runBoth("let s = 0; for (const k in null) s += 1; s");
    runBoth("let s = 0; for (const k in undefined) s += 1; s");
    runBoth("let s = 0; for (var k in null) s += 1; s");
  });

  it("should support labeled while/do-while/for-in/for-of loops", () => {
    runBoth(
      "let i = 0; let s = ''; outer: while (i < 3) { i += 1; if (i === 2) continue outer; s += i; } s",
    );
    runBoth(
      "let i = 0; let s = ''; outer: while (i < 3) { i += 1; if (i === 2) break outer; s += i; } s",
    );
    runBoth(
      "let i = 0; let s = ''; outer: do { i += 1; if (i === 2) continue outer; s += i; } while (i < 3); s",
    );
    runBoth(
      "const o = {a: 1, b: 2}; let s = 0; outer: for (const k in o) { if (k === 'a') continue outer; s += 1; } s",
    );
    runBoth(
      "const o = {a: 1, b: 2}; let s = 0; outer: for (const k in o) { if (k === 'a') break outer; s += 1; } s",
    );
    runBoth(
      "let s = 0; outer: for (const x of [1, 2, 3]) { if (x === 2) continue outer; s += x; } s",
    );
    runBoth("let s = 0; outer: for (const x of [1, 2, 3]) { if (x === 2) break outer; s += x; } s");
  });

  it("should rethrow unmatched labels to the enclosing loop", () => {
    runBoth(
      "let s = 0; outer: for (let i = 0; i < 3; i += 1) { for (let j = 0; j < 3; j += 1) { if (i === 1 && j === 1) continue outer; s += 1; } } s",
    );
    runBoth(
      "let s = 0; outer: for (let i = 0; i < 3; i += 1) { for (let j = 0; j < 3; j += 1) { if (i === 1) break outer; s += 1; } } s",
    );
    runBoth(
      "const o = {a: 1, b: 2}; let s = 0; outer: for (const k in o) { for (const m in {x: 1}) { if (k === 'a') continue outer; s += 1; } } s",
    );
  });
});

describe("delete optional chain edge cases", () => {
  it("should short-circuit delete over optional chains", () => {
    runBoth("const o = null; delete o?.a");
    runBoth("const o = null; delete o?.a.b");
    runBoth("const o = null; delete o?.a.b.c");
    runBoth("const o = {a: {b: 1}}; delete o?.a.b; o.a.b === undefined");
  });

  it("should throw when a non-optional link hits null", () => {
    expectError("const o = null; delete o.a");
    expectError("const o = {a: null}; delete o?.a.b");
  });
});

describe("super edge cases", () => {
  it("should support super property writes via compound assignment", () => {
    runBoth(
      "class A { constructor() { this._x = 5; } get x() { return this._x; } set x(v) { this._x = v; } } class B extends A { m() { super.x += 2; return super.x; } } new B().m()",
    );
  });

  it("should propagate base constructor object returns and throws through super()", () => {
    runBoth(
      "class A { constructor() { return {custom: true}; } } class B extends A {} new B().custom",
    );
    expectError(
      "class A { constructor() { throw new Error('boom'); } } class B extends A {} new B()",
    );
    expectError(
      "class A { constructor() { throw new TypeError('x'); } } class B extends A {} new B()",
    );
  });
});

describe("error propagation edge cases", () => {
  it("should propagate non-signal errors from arrows and functions", () => {
    expectError("const f = () => null.x; f()");
    expectError("(function() { null.x; })()");
    expectError("(function() { throw new Error('x'); })()");
  });

  it("should reject constructing object literal methods", () => {
    expectError("const o = { m() {} }; new o.m()");
    runBoth("const o = { m: function() {} }; new o.m() instanceof o.m");
  });
});

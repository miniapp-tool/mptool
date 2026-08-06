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

/**
 * Golden comparison: run the same code in Node (indirect `eval`) and in the interpreter, then
 * assert the results are strictly equal.
 *
 * Golden 对照：将同一段代码分别在 Node（间接 `eval`）与本解释器中运行，并断言结果严格相等。
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
 * Assert that running the code throws (error paths per design doc §4.6: only "it throws" matters).
 *
 * 断言运行代码会抛错（设计文档 §4.6 错误路径：只要求"能抛错"）。
 *
 * @param code - Source code / 源码
 * @param options - Runtime options / 运行时选项
 */
const expectError = (code: string, options?: RunOptions): void => {
  expect(() => run(code, options)).toThrow(Error);
};

describe("arithmetic and numbers", () => {
  it("should evaluate arithmetic with precedence", () => {
    runBoth("1 + 2 * 3");
    runBoth("(1 + 2) * 3");
    runBoth("10 / 4");
    runBoth("7 % 3");
    runBoth("2 ** 3 ** 2");
    runBoth("(-2) ** 2");
    runBoth("1 + 2 * 3 - 4 / 2");
  });

  it("should handle floating point and special numbers", () => {
    runBoth("0.1 + 0.2");
    runBoth("1 / 0");
    runBoth("-1 / 0");
    runBoth("0 / 0");
    runBoth("NaN + 1");
    runBoth("Infinity - Infinity");
  });

  it("should parse numeric literal formats", () => {
    runBoth("1e3");
    runBoth("0xff");
    runBoth("0b101");
    runBoth("0o17");
    runBoth("3.14e2");
  });

  it("should evaluate unary minus and plus", () => {
    runBoth("-5");
    runBoth("-(3 + 4)");
    runBoth("+'3'");
    runBoth("+true");
    runBoth("!(0)");
    runBoth("!!'a'");
  });
});

describe("strings", () => {
  it("should concatenate strings and coerce", () => {
    runBoth("'a' + 'b'");
    runBoth("'a' + 1");
    runBoth("1 + 'a'");
    runBoth("1 + 1 + 'a'");
    runBoth("'a' + 1 + 1");
  });

  it("should delegate string methods to the host", () => {
    runBoth("'abc'.length");
    runBoth("'abc'.toUpperCase()");
    runBoth("'a,b,c'.split(',')");
    runBoth("'hello'.charAt(1)");
    runBoth("'hello'.indexOf('l')");
    runBoth("'hello'.slice(1, 3)");
    runBoth("'  trim  '.trim()");
    runBoth("'abc'.includes('b')");
  });

  it("should delegate more string methods to the host", () => {
    runBoth("'abc'.startsWith('a')");
    runBoth("'abc'.endsWith('c')");
    runBoth("'a'.repeat(3)");
    runBoth("'ab'.padStart(4, '0')");
    runBoth("'hello'.replace('l', 'L')");
    runBoth("'a-b-c'.split('-').join('+')");
  });
});

describe("comparison and equality", () => {
  it("should evaluate relational operators", () => {
    runBoth("1 < 2");
    runBoth("2 <= 2");
    runBoth("3 > 2");
    runBoth("'a' < 'b'");
    runBoth("'1' < 2");
  });

  it("should evaluate equality (abstract and strict)", () => {
    runBoth("1 == '1'");
    runBoth("1 === '1'");
    runBoth("1 != '1'");
    runBoth("1 !== '1'");
    runBoth("null == undefined");
    runBoth("null === undefined");
    runBoth("NaN === NaN");
    runBoth("[1] == '1'");
  });
});

describe("bitwise and shifts", () => {
  it("should evaluate bitwise operators", () => {
    runBoth("5 & 3");
    runBoth("5 | 3");
    runBoth("5 ^ 3");
    runBoth("~5");
    runBoth("1 << 4");
    runBoth("256 >> 2");
    runBoth("-1 >>> 28");
  });
});

describe("logical and conditional", () => {
  it("should short-circuit && and ||", () => {
    runBoth("0 || 'x'");
    runBoth("'a' || 'b'");
    runBoth("1 && 2");
    runBoth("0 && 2");
  });

  it("should evaluate nullish coalescing", () => {
    runBoth("null ?? 'd'");
    runBoth("undefined ?? 'd'");
    runBoth("0 ?? 'd'");
    runBoth("'' ?? 'd'");
  });

  it("should evaluate ternary", () => {
    runBoth("true ? 1 : 2");
    runBoth("false ? 1 : 2");
  });
});

describe("typeof / void / delete", () => {
  it("should evaluate typeof", () => {
    runBoth("typeof 1");
    runBoth("typeof 'a'");
    runBoth("typeof true");
    runBoth("typeof null");
    runBoth("typeof {}");
    runBoth("typeof []");
    runBoth("typeof (() => 1)");
    runBoth("typeof NaN");
  });

  it("should evaluate typeof for symbols and undefined", () => {
    runBoth("typeof Symbol()");
    runBoth("typeof undefined");
    runBoth("typeof undeclaredName");
  });

  it("should evaluate void and delete", () => {
    runBoth("void 0");
    runBoth("void (1 + 1)");
    runBoth("delete {a: 1}.a");
    runBoth("delete {}.x");
    runBoth("delete [1, 2][0]");
    runBoth("delete 5");
  });
});

describe("bigInt", () => {
  it("should evaluate BigInt arithmetic", () => {
    runBoth("1n + 2n");
    runBoth("5n * 3n");
    runBoth("10n / 3n");
    runBoth("10n % 3n");
    runBoth("2n ** 3n");
    runBoth("-3n");
    runBoth("~0n");
  });

  it("should compare BigInt and report typeof", () => {
    runBoth("typeof 1n");
    runBoth("1n < 2n");
    runBoth("1n === 1n");
    runBoth("1n === 2n");
    runBoth("0n == false");
  });
});

describe("arrays and host callbacks", () => {
  it("should evaluate array literals and basics", () => {
    runBoth("[1, 2, 3].length");
    runBoth("[1, 2, 3].concat([4, 5])");
    runBoth("[3, 1, 2].sort()");
    runBoth("[1, 2, 3].slice(1)");
    runBoth("new Array(3).length");
    runBoth("new Array(1, 2, 3)");
    runBoth("Array.isArray([])");
    runBoth("Array.isArray({})");
  });

  it("should delegate array iteration methods with interpreter callbacks", () => {
    runBoth("[1, 2, 3].map(x => x * 2)");
    runBoth("[1, 2, 3, 4].filter(x => x % 2 === 0)");
    runBoth("[1, 2, 3].reduce((a, b) => a + b, 0)");
    runBoth("[3, 1, 2].sort((a, b) => a - b)");
    runBoth("['a', 'b'].map((x, i) => x + i)");
    runBoth("[1, 2, 3].find(x => x > 1)");
    runBoth("[1, 2, 3].findIndex(x => x > 1)");
    runBoth("[1, 2, 3].includes(2)");
  });

  it("should delegate more array methods to the host", () => {
    runBoth("[1, 2, 3].join('-')");
    runBoth("[1, 2, 3].indexOf(2)");
    runBoth("[1, [2, [3]]].flat(2)");
    runBoth("Array.from('ab')");
    runBoth("Array.of(1, 2)");
    runBoth("[1, 2, 3].fill(0)");
    runBoth("[[1, 2], [3]].flat()");
  });

  it("should support spread in array literals", () => {
    runBoth("[0, ...[1, 2], 3]");
    runBoth("[...'ab']");
    runBoth("[0, ...new Set([1, 1, 2])]");
  });

  it("should run side effects through forEach", () => {
    runBoth("let total = 0; [1, 2, 3].forEach(x => { total += x; }); total");
  });

  it("should pass map thisArg to interpreter methods", () => {
    runBoth("const o = {v: 3, f: function(x) { return this.v * x; }}; [1, 2].map(o.f, o)");
  });

  it("should use plain functions as host callbacks", () => {
    runBoth("[1, 2, 3].map(function(x) { return x * 2; })");
    runBoth("['a', 'b'].filter(function(x) { return x === 'a'; })");
  });
});

describe("objects", () => {
  it("should evaluate object literals and member access", () => {
    runBoth("({a: 1}).a");
    runBoth("({a: 1, b: 2}).b");
    runBoth("({a: 1})['a']");
    runBoth("const k = 'b'; ({a: 1, b: 2})[k]");
    runBoth("const o = {}; o.x = 1; o.x");
    runBoth("({a: 1, b: 2}).hasOwnProperty('a')");
  });

  it("should evaluate object spread and methods", () => {
    runBoth("({a: 1, ...{b: 2}})");
    runBoth("({a: 1, get b() { return this.a + 1; }}).b");
    runBoth("({m() { return 42; }}).m()");
  });

  it("should delegate Object/JSON to the host", () => {
    runBoth("Object.keys({x: 1, y: 2})");
    runBoth("Object.values({x: 1, y: 2})");
    runBoth("Object.entries({x: 1})");
    runBoth("Object.assign({}, {a: 1}, {b: 2})");
    runBoth("JSON.parse('{\"a\": 1}')");
    runBoth("JSON.stringify({a: 1, b: [1, 2]})");
  });
});

describe("this and call/apply/bind", () => {
  it("should bind this in method calls", () => {
    runBoth("const o = {x: 5, m: function() { return this.x; }}; o.m()");
    runBoth("const o = {v: 9, f: function() { return this.v; }}; o.f()");
  });

  it("should support call/apply/bind", () => {
    runBoth("const f = function() { return this.x; }; f.call({x: 10})");
    runBoth("const f = function(a, b) { return this.x + a + b; }; f.apply({x: 1}, [2, 3])");
    runBoth("const f = function() { return this.x; }; const g = f.bind({x: 7}); g()");
    runBoth("const f = function(a) { return this.x + a; }; f.call({x: 5}, 3)");
  });

  it("should give arrows lexical this", () => {
    runBoth("const o = {x: 5, m: function() { return () => this.x; }}; o.m()()");
    runBoth("const f = function() { const g = () => this; return g() === this; }; f()");
  });

  it("should box this to the sandbox global in sloppy mode", () => {
    const runtime = new Runtime();

    expect(runtime.run(parse("(function() { return this; })()"))).toBe(
      runtime.run(parse("globalThis")),
    );
  });

  it("should keep this undefined in strict mode", () => {
    expect(run("(function() { return this; })()", { strict: true })).toBeUndefined();
  });
});

describe("new and prototype chains", () => {
  it("should construct with new", () => {
    runBoth(
      "const Point = function(x, y) { this.x = x; this.y = y; }; const p = new Point(1, 2); [p.x, p.y]",
    );
    runBoth("const A = function() { this.v = 1; }; const a = new A(); a instanceof A");
  });

  it("should support prototype methods and instanceof", () => {
    runBoth("const A = function() {}; A.prototype.m = function() { return 42; }; new A().m()");
    runBoth(
      "const A = function(v) { this.v = v; }; const B = function(v) { A.call(this, v * 2); }; B.prototype = Object.create(A.prototype); B.prototype.constructor = B; const b = new B(3); b.v",
    );
    runBoth("const C = function() {}; C.prototype.x = 1; Object.getPrototypeOf(new C()).x");
    runBoth("const a = new (function() { this.n = 5; })(); a.n");
  });
});

describe("scoping and closures", () => {
  it("should support closures", () => {
    runBoth(
      "const counter = function() { let n = 0; return function() { n += 1; return n; }; }; const c = counter(); [c(), c(), c()]",
    );
    runBoth("const fib = function(n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }; fib(10)");
    runBoth("const f = function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }; f(5)");
  });

  it("should support block scoping", () => {
    runBoth("let x = 1; { let x = 2; } x");
    runBoth("(function() { let a = 1; { let a = 2; return a; } })()");
    runBoth("(function() { { let a = 2; } return typeof a; })()");
  });

  it("should support string indexing and number constants", () => {
    runBoth("'abc'[1]");
    runBoth("Number.MAX_SAFE_INTEGER + 1");
  });

  it("should read inherited properties through the prototype chain", () => {
    runBoth("const A = function() {}; A.prototype.x = 1; const a = new A(); a.x");
    runBoth(
      "const A = function() {}; A.prototype.x = 1; A.prototype.y = 2; const a = new A(); a.x + a.y",
    );
  });

  it("should hoist function declarations and var", () => {
    runBoth("(function() { return typeof g; function g() { return 1; } })()");
    runBoth("(function() { return x; var x = 5; })()");
    runBoth("(function() { { var a = 2; } return a; })()");
  });

  it("should capture per-iteration let bindings", () => {
    runBoth("const fns = []; for (let i = 0; i < 3; i += 1) fns.push(() => i); fns.map(f => f())");
    runBoth(
      "(function() { const fns = []; for (var i = 0; i < 3; i += 1) fns.push(() => i); return fns.map(f => f()); })()",
    );
    runBoth("const fns = []; for (const x of [10, 20, 30]) fns.push(() => x); fns.map(f => f())");
  });
});

describe("destructuring", () => {
  it("should destructure arrays", () => {
    runBoth("const [a, b] = [1, 2]; a + b");
    runBoth("const [a, ...rest] = [1, 2, 3, 4]; rest");
    runBoth("const [a, [b, c]] = [1, [2, 3]]; [a, b, c]");
    runBoth("const [a, , c] = [1, 2, 3]; [a, c]");
  });

  it("should destructure objects", () => {
    runBoth("const {x, y} = {x: 1, y: 2}; x + y");
    runBoth("const {x: a, y: b} = {x: 1, y: 2}; [a, b]");
    runBoth("const {a, ...rest} = {a: 1, b: 2, c: 3}; rest");
    runBoth("const {a, b: {c}} = {a: 1, b: {c: 2}}; [a, c]");
  });

  it("should apply defaults and swap", () => {
    runBoth("const [a = 5] = []; a");
    runBoth("const {x = 7} = {}; x");
    runBoth("const [a = 1, b = 2] = [undefined, 3]; [a, b]");
    runBoth("let a = 1, b = 2; [a, b] = [b, a]; [a, b]");
    runBoth("const o = {}; [o.a, o.b] = [1, 2]; [o.a, o.b]");
  });

  it("should destructure function parameters", () => {
    runBoth("const f = ({a}) => a; f({a: 1})");
    runBoth("const f = ({a, b}) => a + b; f({a: 1, b: 2})");
    runBoth("const f = ([x, y]) => x * y; f([3, 4])");
    runBoth("const f = ({a = 10}) => a; f({})");
    runBoth("const f = ({a: {b}}) => b; f({a: {b: 7}})");
  });

  it("should support rest parameters", () => {
    runBoth("const f = (...args) => args.length; f(1, 2, 3)");
    runBoth("const f = (...args) => args; f(1, 2, 3)");
    runBoth("const f = (a, ...rest) => [a, rest]; f(1, 2, 3)");
    runBoth("const f = (...args) => args[0] + args[1]; f(5, 6)");
    runBoth("const f = ([a, ...rest]) => rest; f([1, 2, 3])");
  });
});

describe("class", () => {
  it("should support basic classes", () => {
    runBoth(
      "class A { constructor(x) { this.x = x; } getX() { return this.x; } } const a = new A(42); a.getX()",
    );
    runBoth("class A {} new A() instanceof A");
    runBoth("class A { m() { return 1; } } new A().m()");
  });

  it("should support extends and super", () => {
    runBoth(
      "class A { constructor(x) { this.x = x; } m() { return this.x * 2; } } class B extends A { constructor(x) { super(x); this.y = this.x + 1; } m2() { return this.y; } } const b = new B(5); [b.x, b.y, b.m()]",
    );
    runBoth(
      "class A { m() { return 'A'; } } class B extends A { m() { return super.m() + 'B'; } } new B().m()",
    );
    runBoth(
      "class A { constructor() { this.v = 1; } } class B extends A {} const b = new B(); b.v",
    );
    runBoth("class A {} class B extends A {} class C extends B {} new C() instanceof A");
    runBoth(
      "class A { constructor() { this.deep = 3; } } class B extends A {} class C extends B {} new C().deep",
    );
  });

  it("should support static members and super in statics", () => {
    runBoth("class A { static s() { return 1; } } A.s()");
    runBoth(
      "class A { static base() { return 'base'; } } class B extends A { static base() { return super.base() + '!'; } } B.base()",
    );
    runBoth("class A { static create() { return new A(); } } A.create() instanceof A");
    runBoth("class A { static s() { return 1; } } class B extends A {} B.s()");
    runBoth(
      "class A { static s() { return 'static'; } } class B extends A {} class C extends B {} C.s()",
    );
  });

  it("should support getters/setters and computed keys", () => {
    runBoth(
      "class A { get x() { return this._x; } set x(v) { this._x = v * 2; } } const a = new A(); a.x = 5; a.x",
    );
    runBoth("const k = 'm'; class A { [k]() { return 1; } } new A().m()");
  });

  it("should support class expressions and names", () => {
    runBoth("const C = class { m() { return 3; } }; new C().m()");
    runBoth("const C = class Named { static m() { return Named === C; } }; C.m()");
    runBoth("class A { constructor() { return {custom: true}; } } new A().custom");
  });

  it("should support extends null", () => {
    runBoth("class A extends null {} Object.getPrototypeOf(A.prototype)");
    runBoth("class A extends null {} typeof A");
  });

  it("should support extending a host class", () => {
    runBoth(
      "class A extends Array { getFirst() { return this[0]; } } const a = new A(1, 2, 3); [a.length, a.getFirst()]",
    );
  });
});

describe("loops", () => {
  it("should evaluate for loops", () => {
    runBoth("let s = 0; for (let i = 0; i < 5; i += 1) s += i; s");
    runBoth(
      "let s = 0; for (let i = 0; i < 10; i += 1) { if (i % 2) continue; if (i > 5) break; s += i; } s",
    );
  });

  it("should evaluate while and do-while", () => {
    runBoth("let s = 0; let i = 0; while (i < 5) { s += i; i += 1; } s");
    runBoth("let i = 0; do { i += 1; } while (i < 3); i");
  });

  it("should evaluate for...of", () => {
    runBoth("let s = 0; for (const x of [1, 2, 3]) s += x; s");
    runBoth("let s = ''; for (const x of 'abc') s += x; s");
    runBoth("let s = 0; for (const x of [1, 2, 3, 4, 5]) { if (x === 4) break; s += x; } s");
  });

  it("should evaluate for...in", () => {
    runBoth("const o = {a: 1, b: 2}; let s = 0; for (const k in o) s += o[k]; s");
    runBoth("let count = 0; for (const k in {x: 1, y: 2, z: 3}) count += 1; count");
  });

  it("should support labeled break/continue", () => {
    runBoth(
      "let s = 0; outer: for (let i = 0; i < 3; i += 1) { for (let j = 0; j < 3; j += 1) { if (i === 1 && j === 1) continue outer; s += 1; } } s",
    );
    runBoth(
      "let s = 0; outer: for (let i = 0; i < 3; i += 1) { for (let j = 0; j < 3; j += 1) { if (i === 1) break outer; s += 1; } } s",
    );
  });
});

describe("switch", () => {
  it("should select cases and fall through", () => {
    runBoth(
      "const f = (x) => { switch (x) { case 1: return 'one'; case 2: return 'two'; default: return 'other'; } }; [f(1), f(2), f(3)]",
    );
    runBoth(
      "const f = (x) => { let r = ''; switch (x) { case 1: r += 'a'; case 2: r += 'b'; break; case 3: r += 'c'; } return r; }; [f(1), f(2), f(3)]",
    );
    runBoth(
      "const f = (x) => { let r = ''; switch (x) { case 1: r += 'a'; break; default: r += 'd'; case 2: r += 'b'; } return r; }; [f(1), f(2), f(3)]",
    );
  });
});

describe("try/catch/finally", () => {
  it("should run catch and finally", () => {
    runBoth("const f = () => { try { throw 42; } catch (e) { return e; } }; f()");
    runBoth(
      "const f = () => { try { throw new Error('x'); } catch (e) { return e.message; } }; f()",
    );
    runBoth(
      "const f = () => { let s = ''; try { throw 'a'; } catch (e) { s += e; } finally { s += 'f'; } return s; }; f()",
    );
  });

  it("should let finally override return and propagate throws", () => {
    runBoth("const f = () => { try { return 1; } finally { return 2; } }; f()");
    runBoth("const f = () => { try { return 1; } finally { } }; f()");
    runBoth("const f = () => { try { throw 'x'; } finally { return 'fin'; } }; f()");
    runBoth(
      "const f = () => { let s = ''; try { try { throw 'a'; } finally { s += 'f1'; } } catch (e) { s += e; } return s; }; f()",
    );
  });

  it("should support catch without binding", () => {
    runBoth("const f = () => { try { throw 5; } catch { return 1; } }; f()");
  });
});

describe("templates", () => {
  it("should interpolate expressions", () => {
    runBoth("`a${1 + 1}b`");
    runBoth("`sum: ${1 + 2 * 3}`");
    runBoth("`${'a'}${'b'}${'c'}`");
    runBoth("`no interp`");
  });

  it("should support nested templates", () => {
    runBoth("`x${`y${'z'}`}w`");
    runBoth("`${[1, 2].length}`");
  });
});

describe("optional chaining and nullish", () => {
  it("should short-circuit optional member access", () => {
    runBoth("({a: 1})?.a");
    runBoth("null?.a");
    runBoth("(undefined)?.a");
    runBoth("({a: {b: 2}})?.a?.b");
    runBoth("({})?.a?.b");
  });

  it("should short-circuit optional calls", () => {
    runBoth("const f = null; f?.()");
    runBoth("const f = () => 5; f?.()");
    runBoth("const o = {m: () => 7}; o.m?.()");
    runBoth("const o = null; o?.m?.()");
  });
});

describe("assignment operators", () => {
  it("should evaluate compound assignments", () => {
    runBoth("let x = 5; x += 3; x");
    runBoth("let x = 10; x -= 2; x");
    runBoth("let x = 2; x *= 3; x");
    runBoth("let x = 8; x /= 4; x");
    runBoth("let x = 7; x %= 4; x");
    runBoth("let x = 2; x **= 3; x");
    runBoth("let x = 1; x <<= 2; x");
  });

  it("should evaluate bitwise and logical assignments", () => {
    runBoth("let x = 8; x &= 6; x");
    runBoth("let x = 8; x |= 1; x");
    runBoth("let x = 8; x ^= 3; x");
    runBoth("let x = 0; x ||= 5; x");
    runBoth("let x = 1; x &&= 2; x");
    runBoth("let x = null; x ??= 3; x");
    runBoth("let x = 1; x ||= 9; x");
    runBoth("let x = 0; let calls = 0; x &&= (calls += 1, 5); [x, calls]");
    runBoth("let x = 2; let calls = 0; x &&= (calls += 1, 5); [x, calls]");
    runBoth("let x = 0; let calls = 0; x ||= (calls += 1, 9); [x, calls]");
    runBoth("let x = 3; let calls = 0; x ||= (calls += 1, 9); [x, calls]");
    runBoth("let x = 1; let calls = 0; x ??= (calls += 1, 3); [x, calls]");
    runBoth("let x = null; let calls = 0; x ??= (calls += 1, 3); [x, calls]");
  });

  it("should evaluate assignment to members and sequences", () => {
    runBoth("const o = {n: 5}; o.n += 3; o.n");
    runBoth("let a = 0; (a = 1, a + 1)");
    runBoth("(1, 2, 3)");
  });
});

describe("arguments", () => {
  it("should provide arguments object", () => {
    runBoth("const f = function() { return arguments.length; }; f(1, 2, 3)");
    runBoth("const f = function(a) { return arguments[0]; }; f(42)");
    runBoth("const f = function() { return arguments[1]; }; f(1, 2, 3)");
    runBoth("const f = function(a, b) { return arguments.length + a + b; }; f(1, 2)");
  });

  it("should map arguments to parameters in sloppy mode", () => {
    runBoth("const f = function(a) { a = 99; return arguments[0]; }; f(1)");
    runBoth("const f = function() { return arguments.callee === f; }; f()");
  });
});

describe("in and instanceof", () => {
  it("should evaluate in and instanceof", () => {
    runBoth("'a' in {a: 1}");
    runBoth("'b' in {a: 1}");
    runBoth("'length' in [1, 2]");
    runBoth("[] instanceof Array");
    runBoth("({}) instanceof Object");
  });
});

describe("builtins", () => {
  it("should expose global functions", () => {
    runBoth("parseInt('42px')");
    runBoth("parseFloat('3.14x')");
    runBoth("isNaN(NaN)");
    runBoth("isNaN('x')");
    runBoth("isFinite(5)");
    runBoth("isFinite(Infinity)");
  });

  it("should expose Number and Math", () => {
    runBoth("Number('123')");
    runBoth("Number.isInteger(5.5)");
    runBoth("Number.isNaN('x')");
    runBoth("Math.max(1, 5, 3)");
    runBoth("Math.abs(-3)");
    runBoth("Math.floor(3.7)");
    runBoth("Math.sqrt(16)");
    runBoth("Math.trunc(-3.7)");
  });

  it("should expose Map and Set", () => {
    runBoth("const m = new Map(); m.set('a', 1); m.get('a')");
    runBoth("const s = new Set([1, 2, 2, 3]); s.size");
    runBoth("const m = new Map([['a', 1], ['b', 2]]); m.has('b')");
    runBoth("new Set([1, 2, 3]).has(2)");
  });

  it("should expose Symbol", () => {
    runBoth("typeof Symbol()");
    runBoth("Symbol.for('a') === Symbol.for('a')");
    runBoth("Symbol('a') === Symbol('a')");
    runBoth("const s = Symbol.for('k'); Symbol.keyFor(s)");
    runBoth("const s = Symbol('x'); ({[s]: 1})[s]");
  });

  it("should expose Date and regexp", () => {
    runBoth("typeof new Date()");
    runBoth("typeof Date.now()");
    runBoth("new Date().getTime() > 0");
    runBoth("/ab+c/.test('abbbc')");
    runBoth("/(a+)/.exec('aaab')[1]");
  });
});

describe("runtime API", () => {
  it("should expose globalThis and boxed this", () => {
    expect(run("globalThis")).toBeDefined();
    expect(run("globalThis === globalThis")).toBe(true);
    expect(run("var gv = 42; this.gv")).toBe(42);
  });

  it("should support getGlobal/setGlobal", () => {
    const runtime = new Runtime();

    runtime.setGlobal("answer", 42);
    expect(runtime.getGlobal("answer")).toBe(42);
    expect(runtime.run(parse("answer * 2"))).toBe(84);
  });

  it("should inject globals", () => {
    const runtime = new Runtime({ globals: { wx: { request: (): number => 1 } } });

    expect(runtime.run(parse("wx.request()"))).toBe(1);
  });

  it("should not expose host Function or eval", () => {
    expectError("Function");
    expectError("eval('1')");
  });
});

describe("error paths", () => {
  it("should throw on undefined variables and non-function calls", () => {
    expectError("undeclaredVar");
    expectError("1()");
    expectError("const x = 5; x()");
    expectError("null.x");
    expectError("undefined.x");
    expectError("new 5()");
  });

  it("should throw on TDZ and const assignment", () => {
    expectError("(function() { return x; let x = 1; })()");
    expectError("(function() { return c; const c = 1; })()");
    expectError("let x = x");
    expectError("const y = 5; y = 6");
  });

  it("should throw on type errors", () => {
    expectError("1n + 1");
    expectError("+1n");
    expectError("[1, 2, 3].map(null)");
    expectError("(() => { throw new Error('boom'); })()");
  });

  it("should unwrap thrown values at boundaries", () => {
    // a `throw` statement throws the user's value, not an internal signal wrapper
    // `throw` 语句抛出用户的值，而非内部信号包装
    expect(() => run("throw new Error('boom')")).toThrow("boom");
    expect(() => run("throw 'oops'")).toThrow("oops");
    expect(() => run("throw 42")).toThrow(42);
    expect(() => run("const f = () => { throw 99; }; f()")).toThrow(99);
  });

  it("should throw on async code (not implemented yet)", () => {
    expectError("async function f() {} f()");
    expectError("(async () => { await 1; })()");
  });

  it("should abort on exceeding maxSteps", () => {
    expectError("while (true) {}", { maxSteps: 1000 });
    expectError("for (;;) {}", { maxSteps: 100 });
  });

  it("should abort on exceeding maxStack", () => {
    expectError("(function f() { return f(); })()", { maxStack: 20 });
    expectError("(function f(n) { return n <= 0 ? 0 : f(n - 1) + 1; })(1000)", {
      maxStack: 50,
    });
  });
});

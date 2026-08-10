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
 * Golden comparison against Node (indirect `eval`).
 *
 * 与 Node（间接 `eval`）的黄金对照。
 *
 * @param code - Source code (top-level `let`/`const` only) / 源码（顶层仅用 `let`/`const`）
 */
const runBoth = (code: string): void => {
  const expected = (0, eval)(code);
  const actual = run(code);

  expect(actual).toStrictEqual(expected);
};

describe("object builtins", () => {
  it("should delegate Object statics", () => {
    runBoth("Object.keys({a: 1, b: 2})");
    runBoth("Object.values({a: 1, b: 2})");
    runBoth("Object.entries({a: 1})");
    runBoth("Object.assign({}, {a: 1}, {b: 2})");
    runBoth("Object.getOwnPropertyNames({a: 1})");
    runBoth("Object.getOwnPropertyDescriptor({a: 1}, 'a').value");
    runBoth("Object.is(0, -0)");
    runBoth("Object.is(NaN, NaN)");
  });

  it("should delegate Object create/prototype/descriptor APIs", () => {
    runBoth("Object.getPrototypeOf({}) === Object.prototype");
    runBoth("const p = {m() { return 1; }}; const o = Object.create(p); o.m()");
    runBoth("const o = {}; Object.setPrototypeOf(o, {x: 1}); o.x");
    runBoth("Object.defineProperty({}, 'a', {value: 1, enumerable: true}).a");
    runBoth("const o = {}; Object.defineProperties(o, {a: {value: 1}, b: {value: 2}}); [o.a, o.b]");
    runBoth("Object.fromEntries([['a', 1], ['b', 2]])");
    runBoth("Object.seal({a: 1}); true");
    runBoth("Object.isFrozen(Object.freeze({}))");
  });
});

describe("array builtins", () => {
  it("should delegate ES5 array methods", () => {
    runBoth("[1, 2, 3].map((x) => x * 2)");
    runBoth("[1, 2, 3, 4].filter((x) => x % 2 === 0)");
    runBoth("[1, 2, 3].reduce((a, b) => a + b, 0)");
    runBoth("[1, 2, 3].forEach((x) => {}) || 'ok'");
    runBoth("[1, 2, 3].some((x) => x > 2)");
    runBoth("[1, 2, 3].every((x) => x > 0)");
    runBoth("[1, 2, 3, 2].indexOf(2)");
    runBoth("[1, 2, 3, 2].lastIndexOf(2)");
  });

  it("should delegate more ES5 array methods", () => {
    runBoth("[1, 2, 3].slice(1)");
    runBoth("[1, 2, 3, 4].splice(1, 2)");
    runBoth("[1, 2].concat([3, 4])");
    runBoth("[3, 1, 2].sort()");
    runBoth("[1, 2, 3].join('-')");
    runBoth("[3, 2, 1].reverse()");
    runBoth("const a = [1]; a.push(2); a");
    runBoth("const a = [1, 2]; a.pop()");
    runBoth("Array.isArray([])");
  });

  it("should delegate ES6 array methods", () => {
    runBoth("[1, 2, 3].find((x) => x > 1)");
    runBoth("[1, 2, 3].findIndex((x) => x > 2)");
    runBoth("[1, 2, 3].includes(2)");
    runBoth("[1, 2].fill(9)");
    runBoth("Array.from('abc')");
    runBoth("Array.of(1, 2, 3)");
    runBoth("[1, [2, [3]]].flat(2)");
    runBoth("[1, 2].flatMap((x) => [x, x * 10])");
  });

  it("should let host methods call interpreter callbacks", () => {
    runBoth("[1, 2, 3].map((x) => x * x)");
    runBoth("[1, 2, 3, 4].reduce((a, b) => a + b, 0)");
    runBoth("['a', 'b'].find((x) => x === 'b')");
    runBoth("[3, 1, 2].sort((a, b) => a - b)");
  });
});

describe("string builtins", () => {
  it("should delegate string methods", () => {
    runBoth("'hello'.charAt(1)");
    runBoth("'hello'.charCodeAt(0)");
    runBoth("'hello'.indexOf('l')");
    runBoth("'hello'.lastIndexOf('l')");
    runBoth("'hello'.slice(1, 3)");
    runBoth("'hello'.substring(1, 3)");
    runBoth("'hello'.split('')");
    runBoth("'  hi  '.trim()");
  });

  it("should delegate ES6 string methods", () => {
    runBoth("'abc'.includes('b')");
    runBoth("'abc'.startsWith('a')");
    runBoth("'abc'.endsWith('c')");
    runBoth("'ab'.repeat(3)");
    runBoth("'ab'.padStart(5, '0')");
    runBoth("'ab'.padEnd(5, '0')");
    runBoth("String.fromCodePoint(65, 66)");
    runBoth("'💩'.codePointAt(0) > 0xffff");
    runBoth("'a-b'.replaceAll('-', '+')");
  });

  it("should delegate regexp string methods", () => {
    runBoth("'hello'.replace('l', 'L')");
    runBoth("'hello world'.match(/o/g)");
    runBoth("'hello'.search(/l/)");
    runBoth("'a1b2'.replace(/[0-9]/g, '#')");
  });
});

describe("number and Math", () => {
  it("should delegate Number statics and constants", () => {
    runBoth("Number.isNaN(NaN)");
    runBoth("Number.isFinite(5)");
    runBoth("Number.isInteger(5.5)");
    runBoth("Number.isSafeInteger(2 ** 53)");
    runBoth("Number.parseInt('42px')");
    runBoth("Number.parseFloat('3.14x')");
    runBoth("Number.MAX_SAFE_INTEGER > 0");
    runBoth("Number.EPSILON > 0");
  });

  it("should delegate Math methods and constants", () => {
    runBoth("Math.max(1, 5, 3)");
    runBoth("Math.min(1, 5, 3)");
    runBoth("Math.abs(-3)");
    runBoth("Math.floor(3.7)");
    runBoth("Math.ceil(3.2)");
    runBoth("Math.round(3.5)");
    runBoth("Math.sqrt(16)");
    runBoth("Math.pow(2, 10)");
  });

  it("should delegate more Math methods", () => {
    runBoth("Math.trunc(-3.7)");
    runBoth("Math.sign(-5)");
    runBoth("Math.cbrt(27)");
    runBoth("Math.hypot(3, 4)");
    runBoth("Math.log2(8)");
    runBoth("Math.log10(1000)");
    runBoth("Math.imul(3, 4)");
    runBoth("Math.PI > 3");
  });
});

describe("jSON, Date, RegExp", () => {
  it("should delegate JSON", () => {
    runBoth("JSON.stringify({a: 1, b: [1, 2]})");
    runBoth("JSON.parse('{\"a\":1}').a");
    runBoth("JSON.stringify(null)");
    runBoth("JSON.stringify([1, 'x', true])");
  });

  it("should delegate Date", () => {
    runBoth("typeof Date.now()");
    runBoth("new Date(0).getTime()");
    runBoth("new Date(2020, 0, 2).getMonth()");
    runBoth("new Date(0).toISOString()");
    runBoth("new Date(0).getUTCFullYear()");
    runBoth("Date.parse('1970-01-01T00:00:00Z')");
  });

  it("should delegate RegExp", () => {
    runBoth("/ab+c/.test('abbbc')");
    runBoth("/(a+)/.exec('aaab')[1]");
    runBoth("/x/gi.flags");
    runBoth("new RegExp('a+', 'g').source");
    runBoth("'a1b2'.replace(/[0-9]/g, '#')");
  });
});

describe("map / Set / WeakMap / WeakSet", () => {
  it("should delegate Map", () => {
    runBoth("const m = new Map(); m.set('a', 1); m.get('a')");
    runBoth("const m = new Map([['a', 1], ['b', 2]]); m.has('b')");
    runBoth("const m = new Map(); m.set('a', 1).set('b', 2); m.size");
    runBoth("const m = new Map([['a', 1]]); m.delete('a'); m.size");
    runBoth("const m = new Map([['a', 1]]); m.clear(); m.size");
    runBoth("const m = new Map([['a', 1], ['b', 2]]); [...m.keys()]");
    runBoth("const m = new Map([['a', 1]]); [...m.entries()]");
  });

  it("should delegate Set and Weak collections", () => {
    runBoth("const s = new Set([1, 2, 2, 3]); s.size");
    runBoth("const s = new Set(); s.add(1).add(2); s.has(2)");
    runBoth("const s = new Set([1, 2]); s.delete(1); s.size");
    runBoth("const s = new Set([3, 1, 2]); [...s]");
    runBoth("const w = new WeakMap(); const o = {}; w.set(o, 5); w.get(o)");
    runBoth("const w = new WeakSet(); const o = {}; w.add(o); w.has(o)");
  });

  it("should iterate Map/Set with for...of", () => {
    runBoth("let s = 0; for (const [k, v] of new Map([['a', 1], ['b', 2]])) s += v; s");
    runBoth("let s = 0; for (const x of new Set([1, 2, 3])) s += x; s");
  });
});

describe("symbol, BigInt, TypedArray, Reflect", () => {
  it("should delegate Symbol", () => {
    runBoth("typeof Symbol()");
    runBoth("Symbol.for('a') === Symbol.for('a')");
    runBoth("Symbol('a') === Symbol('a')");
    runBoth("const s = Symbol.for('k'); Symbol.keyFor(s)");
    runBoth("const s = Symbol('x'); ({[s]: 1})[s]");
  });

  it("should delegate BigInt", () => {
    runBoth("123n + 456n");
    runBoth("10n * 10n");
    runBoth("2n ** 10n");
    runBoth("10n > 9n");
    runBoth("typeof 5n");
    runBoth("BigInt('42')");
    runBoth("(-7n).toString()");
  });

  it("should delegate TypedArray / ArrayBuffer / DataView", () => {
    runBoth("const a = new Int32Array([1, 2, 3]); a.length");
    runBoth("const a = new Uint8Array(4); a[0] = 255; a[0]");
    runBoth("new Float64Array([1.5])[0]");
    runBoth("const b = new ArrayBuffer(8); b.byteLength");
    runBoth(
      "const b = new ArrayBuffer(4); const v = new DataView(b); v.setInt32(0, 42); v.getInt32(0)",
    );
    runBoth("new Uint8ClampedArray([300])[0]");
    runBoth("Int16Array.BYTES_PER_ELEMENT");
  });

  it("should delegate Reflect", () => {
    runBoth("Reflect.get({a: 1}, 'a')");
    runBoth("Reflect.has({a: 1}, 'a')");
    runBoth("Reflect.set({}, 'a', 1)");
    runBoth("Reflect.ownKeys({a: 1, b: 2})");
    runBoth("Reflect.apply(Math.max, null, [1, 5, 3])");
    runBoth("const o = {}; Reflect.defineProperty(o, 'x', {value: 1}); o.x");
    runBoth("Reflect.getPrototypeOf([]) === Array.prototype");
  });
});

describe("globals and error types", () => {
  it("should expose URI helpers and escape/unescape", () => {
    runBoth("encodeURI('http://a b')");
    runBoth("decodeURI('http://a%20b')");
    runBoth("encodeURIComponent('a b&c')");
    runBoth("decodeURIComponent('a%20b')");
    runBoth("escape('a b')");
    runBoth("unescape('a%20b')");
    runBoth("typeof globalThis");
    runBoth("globalThis === globalThis");
  });

  it("should expose the Error family", () => {
    runBoth("new Error('x') instanceof Error");
    runBoth("new TypeError('x') instanceof Error");
    runBoth("new RangeError('x') instanceof RangeError");
    runBoth("new SyntaxError('x').name");
    runBoth("new ReferenceError('x').message");
    runBoth("new URIError('x') instanceof Error");
    runBoth("new EvalError('x') instanceof Error");
  });

  it("should support Function.prototype call/apply/bind", () => {
    runBoth("const f = function(a, b) { return a + b; }; f.call(null, 1, 2)");
    runBoth("const f = function(a, b) { return a + b; }; f.apply(null, [1, 2])");
    runBoth("const f = function(a) { return a; }; f.bind(null, 5)(2)");
    runBoth("const o = {v: 3, get() { return this.v; }}; o.get.call({v: 9})");
    runBoth("Math.max.apply(null, [1, 5, 3])");
    runBoth("(function() { return this === globalThis; }).call(undefined)");
  });

  it("should support instanceof across host and interpreter", () => {
    runBoth("[] instanceof Array");
    runBoth("new Map() instanceof Map");
    runBoth("new Date() instanceof Date");
    runBoth("({}) instanceof Object");
    runBoth("class A {} new A() instanceof A");
    runBoth("class A {} class B extends A {} new B() instanceof A");
  });
});

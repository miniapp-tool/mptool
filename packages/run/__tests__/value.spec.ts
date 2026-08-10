import { describe, expect, it } from "vitest";

import {
  getInterpreterMeta,
  isInterpreterFunction,
  makeInterpreterFunction,
  toBoolean,
  toNumber,
  toPropertyKey,
  toString,
  typeOf,
} from "../src/value.js";

describe("value coercion helpers", () => {
  it("should coerce to boolean", () => {
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean(0)).toBe(false);
    expect(toBoolean("")).toBe(false);
    expect(toBoolean("x")).toBe(true);
    expect(toBoolean(null)).toBe(false);
    expect(toBoolean(undefined)).toBe(false);
    expect(toBoolean(Number.NaN)).toBe(false);
  });

  it("should coerce to number and reject bigint", () => {
    expect(toNumber("42")).toBe(42);
    expect(toNumber(true)).toBe(1);
    expect(toNumber(null)).toBe(0);
    expect(toNumber("3.14")).toBe(3.14);
    expect(() => toNumber(1n)).toThrow(TypeError);
  });

  it("should coerce to string", () => {
    expect(toString(42)).toBe("42");
    expect(toString(null)).toBe("null");
    expect(toString(undefined)).toBe("undefined");
    expect(toString(true)).toBe("true");
  });

  it("should convert to property keys", () => {
    const sym = Symbol("s");

    expect(toPropertyKey(sym)).toBe(sym);
    expect(toPropertyKey(42)).toBe("42");
    expect(toPropertyKey(true)).toBe("true");
    expect(toPropertyKey(null)).toBe("null");
  });

  it("should report typeof", () => {
    expect(typeOf(42)).toBe("number");
    expect(typeOf("a")).toBe("string");
    expect(typeOf(null)).toBe("object");
    expect(typeOf(undefined)).toBe("undefined");
    expect(typeOf(Symbol("s"))).toBe("symbol");
    expect(typeOf(1n)).toBe("bigint");
  });
});

describe("interpreter function wrappers", () => {
  it("should build a host-callable wrapper that routes to invoke", () => {
    let called = false;
    let received: unknown[] | null = null;
    let receivedThis: unknown = null;

    const meta = {
      name: "test",
      params: [],
      body: { type: "block", body: [], start: 0, end: 0 },
      closure: {} as never,
      thisMode: "sloppy",
      isAsync: false,
      containsAwait: false,
      isClassConstructor: false,
      constructable: true,
      prototype: null,
      superClass: null,
      superBase: null,
      hasArguments: false,
      simpleParamNames: [],
      implicitDerived: false,
      lexicalThis: null,
      lexicalSuperBase: null,
      lexicalSuperClass: null,
      callee: null,
    } as Parameters<typeof makeInterpreterFunction>[0];

    const wrapper = makeInterpreterFunction(meta, (_m, args, thisArg) => {
      called = true;
      received = args;
      receivedThis = thisArg;

      return 7;
    });

    expect(isInterpreterFunction(wrapper)).toBe(true);
    expect(getInterpreterMeta(wrapper)).toBe(meta);
    expect(getInterpreterMeta({})).toBeNull();
    expect(typeOf(wrapper)).toBe("function");
    expect(wrapper(1, 2, 3)).toBe(7);
    expect(called).toBe(true);
    expect(received).toStrictEqual([1, 2, 3]);
    expect(receivedThis).toBeUndefined();
  });

  it("should forward host this and construction", () => {
    let thisArg: unknown = null;
    let constructed = false;
    const meta = {
      name: "ctor",
      params: [],
      body: { type: "block", body: [], start: 0, end: 0 },
      closure: {} as never,
      thisMode: "sloppy",
      isAsync: false,
      containsAwait: false,
      isClassConstructor: false,
      constructable: true,
      prototype: { marker: true },
      superClass: null,
      superBase: null,
      hasArguments: false,
      simpleParamNames: [],
      implicitDerived: false,
      lexicalThis: null,
      lexicalSuperBase: null,
      lexicalSuperClass: null,
      callee: null,
    } as Parameters<typeof makeInterpreterFunction>[0];

    const wrapper = makeInterpreterFunction(meta, (_m, _a, thisArg2, constructed2) => {
      thisArg = thisArg2;
      constructed = constructed2;

      // return the instance so host `new` keeps the wrapper prototype
      return thisArg2;
    });

    const receiver = { x: 1 };

    wrapper.call(receiver);
    expect(thisArg).toBe(receiver);
    expect(constructed).toBe(false);

    // host `new` on a constructable wrapper
    const Ctor = wrapper as unknown as new (...args: unknown[]) => object;
    const instance = new Ctor();
    expect(constructed).toBe(true);
    expect(Object.getPrototypeOf(instance)).toBe(meta.prototype);
  });
});

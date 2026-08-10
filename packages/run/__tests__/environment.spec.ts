import { describe, expect, it } from "vitest";

import { Environment } from "../src/environment.js";

describe(Environment, () => {
  it("should chain lookups through parents and throw on missing", () => {
    const global = new Environment(null, true, {});
    const fn = new Environment(global, true);
    const block = new Environment(fn, false);

    global.define("a", 1);
    expect(block.get("a")).toBe(1);
    expect(block.has("a")).toBe(true);
    expect(block.has("missing")).toBe(false);
    expect(() => block.get("missing")).toThrow(ReferenceError);
  });

  it("should consult the sandbox global object", () => {
    const go = { builtin: 42 } as Record<PropertyKey, unknown>;
    const global = new Environment(null, true, go);

    expect(global.hasOwn("builtin")).toBe(true);
    expect(global.get("builtin")).toBe(42);
    expect(global.has("builtin")).toBe(true);

    // set on a global-object binding writes through to the object
    expect(global.set("builtin", 99)).toBe(true);
    expect(go.builtin).toBe(99);

    // define mirrors onto the object
    global.define("d", 1);
    expect(go.d).toBe(1);

    // var hoisting from a child mirrors onto the global object
    const fn = new Environment(global, true);

    fn.declareVar("v");
    expect(go.v).toBeUndefined();

    // setOwn on the global environment mirrors onto the object
    global.setOwn("w", 5);
    expect(go.w).toBe(5);
  });

  it("should enforce TDZ on read and write, then initialize", () => {
    const global = new Environment(null, true, {});

    global.declareLet("x");
    expect(() => global.get("x")).toThrow(ReferenceError);
    expect(() => global.set("x", 1)).toThrow(ReferenceError);

    global.initialize("x", 1);
    expect(global.get("x")).toBe(1);
  });

  it("should reject reassignment of const bindings", () => {
    const global = new Environment(null, true, {});

    global.declareConst("c");
    global.initialize("c", 1);
    expect(() => global.set("c", 2)).toThrow(TypeError);
    expect(global.get("c")).toBe(1);
  });

  it("should return false from set for undeclared names", () => {
    const global = new Environment(null, true, {});

    expect(global.set("nope", 1)).toBe(false);
  });

  it("should write a binding in its declaring scope", () => {
    const global = new Environment(null, true, {});
    const fn = new Environment(global, true);
    const block = new Environment(fn, false);

    fn.define("a", 1);
    expect(block.set("a", 2)).toBe(true);
    expect(fn.get("a")).toBe(2);
  });

  it("should hoist var declarations to the function scope", () => {
    const global = new Environment(null, true, {});
    const fn = new Environment(global, true);
    const block = new Environment(fn, false);

    block.declareVar("v");
    expect(fn.hasOwn("v")).toBe(true);
    expect(block.hasOwn("v")).toBe(false);
    expect(block.get("v")).toBeUndefined();

    // re-declaring is a no-op
    block.declareVar("v");
    expect(fn.hasOwn("v")).toBe(true);
  });

  it("should resolve the nearest function scope", () => {
    const global = new Environment(null, true, {});
    const fn = new Environment(global, true);
    const block = new Environment(fn, false);

    expect(global.functionScope).toBe(global);
    expect(fn.functionScope).toBe(fn);
    expect(block.functionScope).toBe(fn);
  });

  it("should delete bindings from the declaring scope", () => {
    const go = { g: 1 } as Record<PropertyKey, unknown>;
    const global = new Environment(null, true, go);
    const fn = new Environment(global, true);
    const block = new Environment(fn, false);

    fn.define("a", 1);
    expect(block.delete("a")).toBe(true);
    expect(fn.has("a")).toBe(false);

    // a binding defined on the global env lives in its records AND mirrors onto the object
    global.define("d", 2);
    expect(go.d).toBe(2);
    expect(global.delete("d")).toBe(true);
    expect(go.d).toBeUndefined();

    expect(global.delete("g")).toBe(true);

    fn.define("b", 2);
    expect(fn.delete("b")).toBe(true);

    expect(fn.delete("missing")).toBe(false);
  });

  it("should copy own bindings with their mutability", () => {
    const a = new Environment(null, true, {});
    const b = new Environment(null, true, {});

    a.define("x", 1);
    a.declareConst("c");
    a.initialize("c", 2);
    a.copyTo(b);

    expect(b.get("x")).toBe(1);
    expect(b.get("c")).toBe(2);
    expect(() => b.set("c", 9)).toThrow(TypeError);
  });

  it("should throw when initializing a missing binding", () => {
    const a = new Environment(null, true, {});

    expect(() => a.initialize("nope", 1)).toThrow(ReferenceError);
  });

  it("should keep mutability when re-defining an existing binding", () => {
    const a = new Environment(null, true, {});

    a.declareConst("c");
    a.initialize("c", 1);
    a.define("c", 2);
    expect(() => a.set("c", 3)).toThrow(TypeError);
    expect(a.get("c")).toBe(2);
  });
});

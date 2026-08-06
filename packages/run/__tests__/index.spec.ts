import { describe, expect, it } from "vitest";

import { createFunction, createSandbox, run, runSync } from "../src/index.js";

describe(run, () => {
  it("should run code and return the completion value", () => {
    expect(run("1 + 2")).toBe(3);
    expect(run("const x = 5; x * 2")).toBe(10);
    expect(run("let s = 0; for (let i = 0; i < 3; i += 1) s += i; s")).toBe(3);
    expect(run("'ab' + 'cd'")).toBe("abcd");
  });

  it("should support object and class code", () => {
    expect(run("({a: 1, b: 2})")).toStrictEqual({ a: 1, b: 2 });
    expect(run("class A { m() { return 7; } } new A().m()")).toBe(7);
  });

  it("should inject globals", () => {
    expect(run("wx.request()", { globals: { wx: { request: (): number => 1 } } })).toBe(1);
    expect(run("answer * 2", { globals: { answer: 21 } })).toBe(42);
  });

  it("should enforce maxSteps", () => {
    expect(() => run("while (true) {}", { maxSteps: 100 })).toThrow(Error);
  });

  it("should enforce strict mode", () => {
    // sloppy: assigning an undeclared name creates a global; strict: throws
    expect(run("undeclared = 1; undeclared")).toBe(1);
    expect(() => run("undeclared = 1; undeclared", { strict: true })).toThrow(Error);
  });
});

describe(runSync, () => {
  it("should run synchronously", () => {
    expect(runSync("1 + 2")).toBe(3);
    expect(runSync("const f = (a) => a * 3; f(4)")).toBe(12);
  });
});

describe(createSandbox, () => {
  it("should share state across runs", () => {
    const sandbox = createSandbox();

    expect(sandbox.run("let counter = 0; counter")).toBe(0);
    expect(sandbox.run("counter += 1; counter")).toBe(1);
    expect(sandbox.run("counter += 1; counter")).toBe(2);
  });

  it("should support getGlobal and setGlobal", () => {
    const sandbox = createSandbox();

    sandbox.setGlobal("answer", 42);
    expect(sandbox.getGlobal("answer")).toBe(42);
    expect(sandbox.run("answer * 2")).toBe(84);
  });

  it("should inject globals at creation", () => {
    const sandbox = createSandbox({ globals: { wx: { version: "3.8.2" } } });

    expect(sandbox.run("wx.version")).toBe("3.8.2");
  });
});

describe(createFunction, () => {
  it("should create a callable function", () => {
    const fn = createFunction(["a", "b"], "return a + b;");

    expect(fn(1, 2)).toBe(3);
    expect(fn("x", "y")).toBe("xy");
  });

  it("should capture the body as a closure over the sandbox", () => {
    const fn = createFunction(["x"], "return x * 2;");

    expect(fn(21)).toBe(42);
  });

  it("should support class and object syntax in the body", () => {
    const fn = createFunction(["v"], "return { value: v, doubled: v * 2 };");

    expect(fn(3)).toStrictEqual({ value: 3, doubled: 6 });
  });

  it("should share globals defined via options", () => {
    const fn = createFunction(["x"], "return x + base;", { globals: { base: 100 } });

    expect(fn(1)).toBe(101);
  });

  it("should allow no-arg functions", () => {
    const fn = createFunction([], "return 'hi';");

    expect(fn()).toBe("hi");
  });
});

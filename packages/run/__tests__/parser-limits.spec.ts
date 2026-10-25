import { describe, expect, it } from "vitest";

import { createFunction, createSandbox, run, runSync } from "../src/index.js";
import { parse, ParseError } from "../src/parser.js";

describe("parser budgets", () => {
  it("should enforce maxSourceLength", () => {
    expect(() => parse("42", undefined, { maxSourceLength: 1 })).toThrow(ParseError);
    expect(() => run("1 + 1", { maxSourceLength: 2 })).toThrow(ParseError);
    expect(run("1 + 1", { maxSourceLength: 5 })).toBe(2);
  });

  it("should enforce maxParseDepth for nested expressions and statements", () => {
    const deepExpression = `${"(".repeat(120)}1${")".repeat(120)}`;

    expect(() => parse(deepExpression, undefined, { maxParseDepth: 20 })).toThrow(ParseError);
    expect(() => run(deepExpression, { maxParseDepth: 20 })).toThrow(ParseError);
    expect(run("1 + 1", { maxParseDepth: 20 })).toBe(2);

    const deepStatements = `${"{".repeat(120)}${"}".repeat(120)}`;

    expect(() => run(deepStatements, { maxParseDepth: 20 })).toThrow(ParseError);
  });

  it("should enforce the backtracking budget", () => {
    const nested = `async(${"async(".repeat(20)}1${")".repeat(20)})`;

    expect(() => run(nested, { maxBacktracks: 100 })).toThrow(ParseError);
    expect(() => run("async (a) => a", { maxBacktracks: 100 })).not.toThrow();
  });

  it("should pass parser budgets through every public API", () => {
    expect(() => runSync("1 + 1", { maxSourceLength: 2 })).toThrow(ParseError);

    const sandbox = createSandbox({ maxSourceLength: 2 });

    expect(() => sandbox.run("1 + 1")).toThrow(ParseError);

    expect(() => createFunction([], "return 1", { maxSourceLength: 20 })).toThrow(ParseError);
    expect(createFunction([], "return 1", { maxSourceLength: 100 })()).toBe(1);
  });
});

import { describe, expect, it } from "vitest";

import { run as publicRun } from "../src/index.js";
import { ParseError } from "../src/parser.js";
import { run, runBoth } from "./golden.js";

describe("strict-mode early errors", () => {
  it("should reject duplicate parameters", () => {
    // simple parameter lists may duplicate in sloppy mode only
    // 简单参数列表仅在 sloppy 模式允许重复
    runBoth("(function (a, a) { return a; })(1, 2)");
    expect(() => publicRun("(function (a, a) {})", { strict: true })).toThrow(ParseError);
    // non-simple lists always reject duplicates
    // 非简单参数列表始终拒绝重复
    expect(() => publicRun("(function (a = 1, a) {})")).toThrow(ParseError);
    expect(() => publicRun("(function ([a], a) {})")).toThrow(ParseError);
  });

  it("should reject legacy octal literals and escapes", () => {
    expect(publicRun("0123")).toBe(83);
    expect(() => publicRun("0123", { strict: true })).toThrow(ParseError);
    expect(() => publicRun("08", { strict: true })).not.toThrow();

    expect(publicRun(String.raw`"\1"`)).toBe("\u0001");
    expect(() => publicRun(String.raw`"\1"`, { strict: true })).toThrow(ParseError);
  });

  it("should reject assignment to eval/arguments", () => {
    expect(() => publicRun("eval = 1", { strict: true })).toThrow(SyntaxError);
    expect(publicRun("eval = 1; eval")).toBe(1);

    expect(() => publicRun("(function () { arguments = 1; })()", { strict: true })).toThrow(
      SyntaxError,
    );
    expect(() => publicRun("(function () { arguments = 1; })()")).not.toThrow();
  });

  it("should keep non-strict scripts working", () => {
    expect(run("(function (a, a) { return a; })(1, 2)")).toBe(2);
  });
});

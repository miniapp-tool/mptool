import { describe, expect, it } from "vitest";

import { run as publicRun } from "../src/index.js";
import { parse, ParseError } from "../src/parser.js";
import { runBoth } from "./golden.js";

/**
 * Assert that parsing rejects the given program.
 *
 * 断言给定程序会被解析器拒绝。
 *
 * @param code - Source code / 源码
 */
const expectParseError = (code: string): void => {
  expect(() => parse(code)).toThrow(ParseError);
};

describe("quoted property names", () => {
  it("should use the unquoted name for object literals", () => {
    runBoth("({'a': 1}).a");
    runBoth("({'a-b': 2})['a-b']");
    runBoth("({'1': 3})[1]");
    runBoth("const o = {'a': 1, b: 2}; [o.a, o.b]");
  });

  it("should use the unquoted name for getters, setters and methods", () => {
    runBoth("({get 'a'(){ return 1 }}).a");
    runBoth("({set 'a'(v){ this._a = v }, get 'a'(){ return this._a }}).a");
    runBoth("({async 'm'(){ return 1 }}).m()");
    runBoth("({'m': function () { return 1 }}).m()");
  });

  it("should use the unquoted name in class methods", () => {
    runBoth("class A { 'm'() { return 1 } } new A().m()");
    runBoth("class A { 'constructor'() { this.x = 2 } } new A().x");
    runBoth("class A { static 's'() { return 3 } } A.s()");
  });

  it("should use the unquoted name in destructuring patterns", () => {
    runBoth("const {'a': x} = {a: 1}; x");
    runBoth("const {['a']: x} = {a: 2}; x");
  });
});

describe("shorthand property keys", () => {
  it("should reject string, number, BigInt and reserved-word shorthand properties", () => {
    expectParseError('({ "a" })');
    expectParseError("({ 123 })");
    expectParseError("({ 1n })");
    expectParseError("({ if })");
    expectParseError("({ true })");
  });

  it("should reject string, number and reserved-word shorthand bindings", () => {
    expectParseError('const { "a" } = { a: 1 };');
    expectParseError("const { 123 } = { 123: 1 };");
    expectParseError("const { if } = { if: 1 };");
  });

  it("should keep explicit `: target` for non-identifier keys", () => {
    runBoth('const { "a": a, 123: b, if: c } = { a: 1, 123: 2, if: 3 }; [a, b, c]');
  });

  it("should keep contextual keywords as shorthands in sloppy mode", () => {
    expect(() => parse("({ let })")).not.toThrow();
    expect(() => parse("({ static })")).not.toThrow();
    expect(() => parse("({ yield })")).not.toThrow();

    // strict mode reserves them
    expect(() => publicRun("({ let })", { strict: true })).toThrow(ParseError);
  });
});

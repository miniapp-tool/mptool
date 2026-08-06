import { describe, expect, it } from "vitest";

import { LexerError } from "../src/lexer.js";
import { parse, ParseError, Parser } from "../src/parser.js";

/**
 * Feature flags used by the feature-toggle tests.
 *
 * 特性开关测试使用的特性配置。
 */
const ALL_FEATURES = { class: true, forOf: true, async: true, bigint: true };

/**
 * Recursively strip `start`/`end` source offsets for compact AST assertions.
 *
 * 递归去除 `start`/`end` 源码偏移，以便紧凑断言 AST。
 *
 * @param node - Node to strip / 待处理的节点
 * @returns Node without positions / 去除位置后的节点
 */
const stripPosition = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map((item) => stripPosition(item));

  if (node != null && typeof node === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(node))
      if (key !== "start" && key !== "end") result[key] = stripPosition(value);

    return result;
  }

  return node;
};

/**
 * Parse and strip the whole program.
 *
 * 解析并去除整个 program 的位置。
 *
 * @param source - Source code / 源码
 * @returns The stripped program / 去除位置后的 program
 */
const programOf = (source: string): unknown => stripPosition(parse(source));

/**
 * Get the single top-level statement with positions stripped.
 *
 * 获取唯一一条顶层语句（去除位置）。
 *
 * @param source - Source code / 源码
 * @returns The stripped statement / 去除位置后的语句
 */
const stmtOf = (source: string): unknown => {
  const program = parse(source);
  const [statement] = program.body;

  expect(program.body).toHaveLength(1);

  return stripPosition(statement);
};

/**
 * Get the expression of the single expression statement, positions stripped.
 *
 * 获取唯一表达式语句中的表达式（去除位置）。
 *
 * @param source - Source code / 源码
 * @returns The stripped expression / 去除位置后的表达式
 */
const exprOf = (source: string): unknown => {
  const program = parse(source);
  const [statement] = program.body;

  expect(program.body).toHaveLength(1);

  if (statement?.type !== "expression") throw new Error("expected an expression statement");

  return stripPosition(statement.expression);
};

/**
 * Assert that parsing throws.
 *
 * 断言解析会抛错。
 *
 * @param source - Source code / 源码
 * @param features - Feature toggles / 特性开关
 */
const expectError = (
  source: string,
  features?: { class: boolean; forOf: boolean; async: boolean; bigint: boolean },
): void => {
  expect(() => parse(source, features)).toThrow(SyntaxError);
};

describe("literals", () => {
  it("should parse number literals", () => {
    expect(exprOf("42")).toStrictEqual({ type: "literal", value: 42 });
    expect(exprOf("3.14")).toStrictEqual({ type: "literal", value: 3.14 });
    expect(exprOf("0x1F")).toStrictEqual({ type: "literal", value: 31 });
    expect(exprOf("0b101")).toStrictEqual({ type: "literal", value: 5 });
    expect(exprOf("0o17")).toStrictEqual({ type: "literal", value: 15 });
    expect(exprOf("1e3")).toStrictEqual({ type: "literal", value: 1000 });
  });

  it("should parse string literals with escapes", () => {
    expect(exprOf('"hello"')).toStrictEqual({ type: "literal", value: "hello" });
    expect(exprOf(String.raw`'it\'s'`)).toStrictEqual({ type: "literal", value: "it's" });
    expect(exprOf(String.raw`"a\nb"`)).toStrictEqual({ type: "literal", value: "a\nb" });
  });

  it("should parse bigint literals", () => {
    expect(exprOf("123n")).toStrictEqual({ type: "literal", value: 123n });
    expect(exprOf("0x1Fn")).toStrictEqual({ type: "literal", value: 31n });
  });

  it("should parse boolean and null literals", () => {
    expect(exprOf("true")).toStrictEqual({ type: "literal", value: true });
    expect(exprOf("false")).toStrictEqual({ type: "literal", value: false });
    expect(exprOf("null")).toStrictEqual({ type: "literal", value: null });
  });

  it("should parse regexp literals", () => {
    expect(exprOf("/ab+c/gi")).toStrictEqual({ type: "regexp", pattern: "ab+c", flags: "gi" });
    expect(exprOf(String.raw`/a\/b/`)).toStrictEqual({
      type: "regexp",
      pattern: "a\\/b",
      flags: "",
    });
  });
});

describe("binary expressions", () => {
  it("should respect multiplication over addition", () => {
    expect(exprOf("1 + 2 * 3")).toStrictEqual({
      type: "binary",
      op: "+",
      left: { type: "literal", value: 1 },
      right: {
        type: "binary",
        op: "*",
        left: { type: "literal", value: 2 },
        right: { type: "literal", value: 3 },
      },
    });
  });

  it("should be left-associative for arithmetic", () => {
    expect(exprOf("a - b - c")).toStrictEqual({
      type: "binary",
      op: "-",
      left: {
        type: "binary",
        op: "-",
        left: { type: "identifier", name: "a" },
        right: { type: "identifier", name: "b" },
      },
      right: { type: "identifier", name: "c" },
    });
  });

  it("should be right-associative for exponentiation", () => {
    expect(exprOf("2 ** 3 ** 2")).toStrictEqual({
      type: "binary",
      op: "**",
      left: { type: "literal", value: 2 },
      right: {
        type: "binary",
        op: "**",
        left: { type: "literal", value: 3 },
        right: { type: "literal", value: 2 },
      },
    });
  });

  it("should parse comparison and equality with correct precedence", () => {
    expect(exprOf("a < b == c")).toStrictEqual({
      type: "binary",
      op: "==",
      left: {
        type: "binary",
        op: "<",
        left: { type: "identifier", name: "a" },
        right: { type: "identifier", name: "b" },
      },
      right: { type: "identifier", name: "c" },
    });
  });

  it("should parse bitwise operators by precedence", () => {
    expect(exprOf("a | b ^ c & d")).toStrictEqual({
      type: "binary",
      op: "|",
      left: { type: "identifier", name: "a" },
      right: {
        type: "binary",
        op: "^",
        left: { type: "identifier", name: "b" },
        right: {
          type: "binary",
          op: "&",
          left: { type: "identifier", name: "c" },
          right: { type: "identifier", name: "d" },
        },
      },
    });
  });

  it("should parse in and instanceof", () => {
    expect(exprOf("'x' in obj")).toStrictEqual({
      type: "binary",
      op: "in",
      left: { type: "literal", value: "x" },
      right: { type: "identifier", name: "obj" },
    });
    expect(exprOf("a instanceof B")).toStrictEqual({
      type: "binary",
      op: "instanceof",
      left: { type: "identifier", name: "a" },
      right: { type: "identifier", name: "B" },
    });
  });

  it("should parse shifts", () => {
    expect(exprOf("a << b >> c")).toStrictEqual({
      type: "binary",
      op: ">>",
      left: {
        type: "binary",
        op: "<<",
        left: { type: "identifier", name: "a" },
        right: { type: "identifier", name: "b" },
      },
      right: { type: "identifier", name: "c" },
    });
  });
});

describe("logical and coalesce expressions", () => {
  it("should parse logical and/or with precedence", () => {
    expect(exprOf("a && b || c")).toStrictEqual({
      type: "logical",
      op: "||",
      left: {
        type: "logical",
        op: "&&",
        left: { type: "identifier", name: "a" },
        right: { type: "identifier", name: "b" },
      },
      right: { type: "identifier", name: "c" },
    });
  });

  it("should parse coalesce alone", () => {
    expect(exprOf("a ?? b")).toStrictEqual({
      type: "logical",
      op: "??",
      left: { type: "identifier", name: "a" },
      right: { type: "identifier", name: "b" },
    });
  });

  it("should reject mixing ?? with ||", () => {
    expectError("a ?? b || c");
    expectError("a || b ?? c");
  });

  it("should reject mixing ?? with &&", () => {
    expectError("a ?? b && c");
    expectError("a && b ?? c");
  });

  it("should allow mixing when parenthesized", () => {
    expect(exprOf("(a ?? b) || c")).toStrictEqual({
      type: "logical",
      op: "||",
      left: {
        type: "logical",
        op: "??",
        left: { type: "identifier", name: "a" },
        right: { type: "identifier", name: "b" },
      },
      right: { type: "identifier", name: "c" },
    });
  });
});

describe("unary and update expressions", () => {
  it("should parse unary operators", () => {
    expect(exprOf("-a")).toStrictEqual({
      type: "unary",
      op: "-",
      argument: { type: "identifier", name: "a" },
    });
    expect(exprOf("typeof a")).toStrictEqual({
      type: "unary",
      op: "typeof",
      argument: { type: "identifier", name: "a" },
    });
    expect(exprOf("!a")).toStrictEqual({
      type: "unary",
      op: "!",
      argument: { type: "identifier", name: "a" },
    });
    expect(exprOf("delete a.b")).toStrictEqual({
      type: "unary",
      op: "delete",
      argument: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: false,
      },
    });
    expect(exprOf("void 0")).toStrictEqual({
      type: "unary",
      op: "void",
      argument: { type: "literal", value: 0 },
    });
  });

  it("should parse prefix and postfix updates", () => {
    expect(exprOf("++a")).toStrictEqual({
      type: "update",
      op: "++",
      prefix: true,
      argument: { type: "identifier", name: "a" },
    });
    expect(exprOf("a--")).toStrictEqual({
      type: "update",
      op: "--",
      prefix: false,
      argument: { type: "identifier", name: "a" },
    });
  });
});

describe("conditional, sequence and assignment", () => {
  it("should parse conditional", () => {
    expect(exprOf("a ? b : c")).toStrictEqual({
      type: "conditional",
      test: { type: "identifier", name: "a" },
      consequent: { type: "identifier", name: "b" },
      alternate: { type: "identifier", name: "c" },
    });
  });

  it("should parse sequence", () => {
    expect(exprOf("(a, b, c)")).toStrictEqual({
      type: "sequence",
      expressions: [
        { type: "identifier", name: "a" },
        { type: "identifier", name: "b" },
        { type: "identifier", name: "c" },
      ],
    });
  });

  it("should parse assignment with compound operators", () => {
    expect(exprOf("a += 1")).toStrictEqual({
      type: "assignment",
      op: "+=",
      target: { type: "identifier", name: "a" },
      value: { type: "literal", value: 1 },
    });
    expect(exprOf("a ??= b")).toStrictEqual({
      type: "assignment",
      op: "??=",
      target: { type: "identifier", name: "a" },
      value: { type: "identifier", name: "b" },
    });
  });

  it("should parse assignment to member targets", () => {
    expect(exprOf("a.b = 1")).toStrictEqual({
      type: "assignment",
      op: "=",
      target: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: false,
      },
      value: { type: "literal", value: 1 },
    });
  });
});

describe("member access and calls", () => {
  it("should parse member access", () => {
    expect(exprOf("a.b")).toStrictEqual({
      type: "member",
      object: { type: "identifier", name: "a" },
      property: "b",
      computed: false,
      optional: false,
    });
    expect(exprOf("a[b]")).toStrictEqual({
      type: "member",
      object: { type: "identifier", name: "a" },
      property: { type: "identifier", name: "b" },
      computed: true,
      optional: false,
    });
    expect(exprOf("a.b.c")).toStrictEqual({
      type: "member",
      object: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: false,
      },
      property: "c",
      computed: false,
      optional: false,
    });
  });

  it("should parse calls", () => {
    expect(exprOf("f()")).toStrictEqual({
      type: "call",
      callee: { type: "identifier", name: "f" },
      args: [],
      optional: false,
    });
    expect(exprOf("f(a, b)")).toStrictEqual({
      type: "call",
      callee: { type: "identifier", name: "f" },
      args: [
        { type: "identifier", name: "a" },
        { type: "identifier", name: "b" },
      ],
      optional: false,
    });
    expect(exprOf("a.b()")).toStrictEqual({
      type: "call",
      callee: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: false,
      },
      args: [],
      optional: false,
    });
  });

  it("should parse spread in calls", () => {
    expect(exprOf("f(...args)")).toStrictEqual({
      type: "call",
      callee: { type: "identifier", name: "f" },
      args: [{ type: "spread", argument: { type: "identifier", name: "args" } }],
      optional: false,
    });
  });

  it("should parse optional chaining", () => {
    expect(exprOf("a?.b")).toStrictEqual({
      type: "member",
      object: { type: "identifier", name: "a" },
      property: "b",
      computed: false,
      optional: true,
    });
    expect(exprOf("a?.[b]")).toStrictEqual({
      type: "member",
      object: { type: "identifier", name: "a" },
      property: { type: "identifier", name: "b" },
      computed: true,
      optional: true,
    });
    expect(exprOf("a?.()")).toStrictEqual({
      type: "call",
      callee: { type: "identifier", name: "a" },
      args: [],
      optional: true,
    });
    expect(exprOf("a?.b.c")).toStrictEqual({
      type: "member",
      object: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: true,
      },
      property: "c",
      computed: false,
      optional: false,
    });
    expect(exprOf("a?.b()")).toStrictEqual({
      type: "call",
      callee: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: true,
      },
      args: [],
      optional: false,
    });
    expect(exprOf("a?.b?.[c]")).toStrictEqual({
      type: "member",
      object: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: true,
      },
      property: { type: "identifier", name: "c" },
      computed: true,
      optional: true,
    });
  });
});

describe("new expressions", () => {
  it("should parse new with and without arguments", () => {
    expect(exprOf("new Foo()")).toStrictEqual({
      type: "new",
      callee: { type: "identifier", name: "Foo" },
      args: [],
    });
    expect(exprOf("new Foo(1, 2)")).toStrictEqual({
      type: "new",
      callee: { type: "identifier", name: "Foo" },
      args: [
        { type: "literal", value: 1 },
        { type: "literal", value: 2 },
      ],
    });
    expect(exprOf("new Foo")).toStrictEqual({
      type: "new",
      callee: { type: "identifier", name: "Foo" },
      args: [],
    });
    expect(exprOf("new F(...args)")).toStrictEqual({
      type: "new",
      callee: { type: "identifier", name: "F" },
      args: [{ type: "spread", argument: { type: "identifier", name: "args" } }],
    });
  });

  it("should parse new with member callee and trailing chain", () => {
    expect(exprOf("new a.b()")).toStrictEqual({
      type: "new",
      callee: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: false,
      },
      args: [],
    });
    expect(exprOf("new Foo().bar")).toStrictEqual({
      type: "member",
      object: { type: "new", callee: { type: "identifier", name: "Foo" }, args: [] },
      property: "bar",
      computed: false,
      optional: false,
    });
  });

  it("should parse nested new", () => {
    expect(exprOf("new new Foo()()")).toStrictEqual({
      type: "new",
      callee: { type: "new", callee: { type: "identifier", name: "Foo" }, args: [] },
      args: [],
    });
  });

  it("should reject new.target", () => {
    expectError("new.target");
  });
});

describe("array literals", () => {
  it("should parse elements", () => {
    expect(exprOf("[1, 2, 3]")).toStrictEqual({
      type: "array",
      elements: [
        { type: "literal", value: 1 },
        { type: "literal", value: 2 },
        { type: "literal", value: 3 },
      ],
    });
  });

  it("should parse elisions", () => {
    expect(exprOf("[1, , 3]")).toStrictEqual({
      type: "array",
      elements: [{ type: "literal", value: 1 }, null, { type: "literal", value: 3 }],
    });
    expect(exprOf("[,]")).toStrictEqual({ type: "array", elements: [null] });
  });

  it("should parse spread and empty arrays", () => {
    expect(exprOf("[...a]")).toStrictEqual({
      type: "array",
      elements: [{ type: "spread", argument: { type: "identifier", name: "a" } }],
    });
    expect(exprOf("[]")).toStrictEqual({ type: "array", elements: [] });
  });
});

describe("object literals", () => {
  it("should parse properties", () => {
    expect(exprOf("({ a: 1, b: 'x' })")).toStrictEqual({
      type: "object",
      props: [
        {
          type: "property",
          kind: "init",
          key: "a",
          computed: false,
          value: { type: "literal", value: 1 },
          shorthand: false,
        },
        {
          type: "property",
          kind: "init",
          key: "b",
          computed: false,
          value: { type: "literal", value: "x" },
          shorthand: false,
        },
      ],
    });
  });

  it("should parse shorthand properties", () => {
    expect(exprOf("({ a })")).toStrictEqual({
      type: "object",
      props: [
        {
          type: "property",
          kind: "init",
          key: "a",
          computed: false,
          value: { type: "identifier", name: "a" },
          shorthand: true,
        },
      ],
    });
  });

  it("should parse computed keys", () => {
    expect(exprOf("({ [k]: v })")).toStrictEqual({
      type: "object",
      props: [
        {
          type: "property",
          kind: "init",
          key: { type: "identifier", name: "k" },
          computed: true,
          value: { type: "identifier", name: "v" },
          shorthand: false,
        },
      ],
    });
  });

  it("should parse method shorthand", () => {
    expect(exprOf("({ foo() {} })")).toStrictEqual({
      type: "object",
      props: [
        {
          type: "property",
          kind: "init",
          key: "foo",
          computed: false,
          value: {
            type: "functionExpr",
            name: null,
            params: [],
            body: { type: "block", body: [] },
            isAsync: false,
          },
          shorthand: false,
        },
      ],
    });
  });

  it("should parse async methods", () => {
    expect(exprOf("({ async foo() {} })")).toStrictEqual({
      type: "object",
      props: [
        {
          type: "property",
          kind: "init",
          key: "foo",
          computed: false,
          value: {
            type: "functionExpr",
            name: null,
            params: [],
            body: { type: "block", body: [] },
            isAsync: true,
          },
          shorthand: false,
        },
      ],
    });
  });

  it("should parse getters and setters", () => {
    expect(exprOf("({ get x() { return 1 }, set x(v) {} })")).toStrictEqual({
      type: "object",
      props: [
        {
          type: "property",
          kind: "get",
          key: "x",
          computed: false,
          value: {
            type: "functionExpr",
            name: null,
            params: [],
            body: {
              type: "block",
              body: [{ type: "return", argument: { type: "literal", value: 1 } }],
            },
            isAsync: false,
          },
          shorthand: false,
        },
        {
          type: "property",
          kind: "set",
          key: "x",
          computed: false,
          value: {
            type: "functionExpr",
            name: null,
            params: [{ type: "identifier", name: "v" }],
            body: { type: "block", body: [] },
            isAsync: false,
          },
          shorthand: false,
        },
      ],
    });
  });

  it("should parse spread properties", () => {
    expect(exprOf("({ ...rest })")).toStrictEqual({
      type: "object",
      props: [{ type: "spreadProperty", argument: { type: "identifier", name: "rest" } }],
    });
  });

  it("should treat __proto__ as a normal key", () => {
    expect(exprOf("({ __proto__: null })")).toStrictEqual({
      type: "object",
      props: [
        {
          type: "property",
          kind: "init",
          key: "__proto__",
          computed: false,
          value: { type: "literal", value: null },
          shorthand: false,
        },
      ],
    });
  });
});

describe("arrow functions", () => {
  it("should parse arrows with no, single and multiple params", () => {
    expect(exprOf("() => 1")).toStrictEqual({
      type: "arrow",
      params: [],
      body: { type: "literal", value: 1 },
      isAsync: false,
    });
    expect(exprOf("x => x")).toStrictEqual({
      type: "arrow",
      params: [{ type: "identifier", name: "x" }],
      body: { type: "identifier", name: "x" },
      isAsync: false,
    });
    expect(exprOf("(a, b) => a + b")).toStrictEqual({
      type: "arrow",
      params: [
        { type: "identifier", name: "a" },
        { type: "identifier", name: "b" },
      ],
      body: {
        type: "binary",
        op: "+",
        left: { type: "identifier", name: "a" },
        right: { type: "identifier", name: "b" },
      },
      isAsync: false,
    });
  });

  it("should parse default values and rest params", () => {
    expect(exprOf("(a = 1) => a")).toStrictEqual({
      type: "arrow",
      params: [
        {
          type: "assignmentPattern",
          left: { type: "identifier", name: "a" },
          right: { type: "literal", value: 1 },
        },
      ],
      body: { type: "identifier", name: "a" },
      isAsync: false,
    });
    expect(exprOf("(...rest) => rest")).toStrictEqual({
      type: "arrow",
      params: [{ type: "rest", argument: { type: "identifier", name: "rest" } }],
      body: { type: "identifier", name: "rest" },
      isAsync: false,
    });
  });

  it("should parse destructuring params", () => {
    expect(exprOf("({ a }) => a")).toStrictEqual({
      type: "arrow",
      params: [
        {
          type: "objectPattern",
          props: [
            {
              key: "a",
              computed: false,
              value: { type: "identifier", name: "a" },
              shorthand: true,
            },
          ],
          rest: null,
        },
      ],
      body: { type: "identifier", name: "a" },
      isAsync: false,
    });
    expect(exprOf("([a, b]) => a")).toStrictEqual({
      type: "arrow",
      params: [
        {
          type: "arrayPattern",
          elements: [
            { type: "identifier", name: "a" },
            { type: "identifier", name: "b" },
          ],
        },
      ],
      body: { type: "identifier", name: "a" },
      isAsync: false,
    });
  });

  it("should parse expression and block bodies", () => {
    expect(exprOf("x => x + 1")).toStrictEqual({
      type: "arrow",
      params: [{ type: "identifier", name: "x" }],
      body: {
        type: "binary",
        op: "+",
        left: { type: "identifier", name: "x" },
        right: { type: "literal", value: 1 },
      },
      isAsync: false,
    });
    expect(exprOf("x => { return x }")).toStrictEqual({
      type: "arrow",
      params: [{ type: "identifier", name: "x" }],
      body: {
        type: "block",
        body: [{ type: "return", argument: { type: "identifier", name: "x" } }],
      },
      isAsync: false,
    });
  });

  it("should parse async arrows", () => {
    expect(exprOf("async () => 1")).toStrictEqual({
      type: "arrow",
      params: [],
      body: { type: "literal", value: 1 },
      isAsync: true,
    });
    expect(exprOf("async x => x")).toStrictEqual({
      type: "arrow",
      params: [{ type: "identifier", name: "x" }],
      body: { type: "identifier", name: "x" },
      isAsync: true,
    });
    expect(exprOf("async (a) => a")).toStrictEqual({
      type: "arrow",
      params: [{ type: "identifier", name: "a" }],
      body: { type: "identifier", name: "a" },
      isAsync: true,
    });
  });

  it("should disambiguate () between parens and arrows", () => {
    expect(exprOf("(a, b)")).toStrictEqual({
      type: "sequence",
      expressions: [
        { type: "identifier", name: "a" },
        { type: "identifier", name: "b" },
      ],
    });
    expect(exprOf("(a, b) => c")).toStrictEqual({
      type: "arrow",
      params: [
        { type: "identifier", name: "a" },
        { type: "identifier", name: "b" },
      ],
      body: { type: "identifier", name: "c" },
      isAsync: false,
    });
  });

  it("should parse async(x) as a call, not an arrow", () => {
    expect(exprOf("async(x)")).toStrictEqual({
      type: "call",
      callee: { type: "identifier", name: "async" },
      args: [{ type: "identifier", name: "x" }],
      optional: false,
    });
  });
});

describe("function expressions", () => {
  it("should parse anonymous and named functions", () => {
    expect(exprOf("(function () {})")).toStrictEqual({
      type: "functionExpr",
      name: null,
      params: [],
      body: { type: "block", body: [] },
      isAsync: false,
    });
    expect(exprOf("(function named(a) { return a })")).toStrictEqual({
      type: "functionExpr",
      name: "named",
      params: [{ type: "identifier", name: "a" }],
      body: {
        type: "block",
        body: [{ type: "return", argument: { type: "identifier", name: "a" } }],
      },
      isAsync: false,
    });
  });

  it("should parse async function expressions", () => {
    expect(exprOf("(async function () { await x })")).toStrictEqual({
      type: "functionExpr",
      name: null,
      params: [],
      body: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: { type: "await", argument: { type: "identifier", name: "x" } },
          },
        ],
      },
      isAsync: true,
    });
  });
});

describe("class", () => {
  it("should parse class expressions", () => {
    expect(exprOf("(class A {})")).toStrictEqual({
      type: "classExpr",
      name: "A",
      superClass: null,
      body: { type: "classBody", methods: [] },
    });
    expect(exprOf("(class {})")).toStrictEqual({
      type: "classExpr",
      name: null,
      superClass: null,
      body: { type: "classBody", methods: [] },
    });
  });

  it("should parse extends and super", () => {
    expect(
      stmtOf("class A extends B { constructor() { super() } method() { return super.x } }"),
    ).toStrictEqual({
      type: "classDeclaration",
      name: "A",
      superClass: { type: "identifier", name: "B" },
      body: {
        type: "classBody",
        methods: [
          {
            type: "classMethod",
            kind: "constructor",
            key: "constructor",
            computed: false,
            params: [],
            body: {
              type: "block",
              body: [
                {
                  type: "expression",
                  expression: {
                    type: "call",
                    callee: { type: "super" },
                    args: [],
                    optional: false,
                  },
                },
              ],
            },
            isAsync: false,
          },
          {
            type: "classMethod",
            kind: "method",
            key: "method",
            computed: false,
            params: [],
            body: {
              type: "block",
              body: [
                {
                  type: "return",
                  argument: {
                    type: "member",
                    object: { type: "super" },
                    property: "x",
                    computed: false,
                    optional: false,
                  },
                },
              ],
            },
            isAsync: false,
          },
        ],
      },
    });
  });

  it("should parse static methods", () => {
    expect(stmtOf("class A { static foo() {} }")).toStrictEqual({
      type: "classDeclaration",
      name: "A",
      superClass: null,
      body: {
        type: "classBody",
        methods: [
          {
            type: "classMethod",
            kind: "static",
            key: "foo",
            computed: false,
            params: [],
            body: { type: "block", body: [] },
            isAsync: false,
          },
        ],
      },
    });
  });

  it("should parse getters and setters", () => {
    expect(stmtOf("class A { get x() { return 1 } set x(v) {} }")).toStrictEqual({
      type: "classDeclaration",
      name: "A",
      superClass: null,
      body: {
        type: "classBody",
        methods: [
          {
            type: "classMethod",
            kind: "get",
            key: "x",
            computed: false,
            params: [],
            body: {
              type: "block",
              body: [{ type: "return", argument: { type: "literal", value: 1 } }],
            },
            isAsync: false,
          },
          {
            type: "classMethod",
            kind: "set",
            key: "x",
            computed: false,
            params: [{ type: "identifier", name: "v" }],
            body: { type: "block", body: [] },
            isAsync: false,
          },
        ],
      },
    });
  });

  it("should parse computed keys", () => {
    expect(stmtOf("class A { [key]() {} }")).toStrictEqual({
      type: "classDeclaration",
      name: "A",
      superClass: null,
      body: {
        type: "classBody",
        methods: [
          {
            type: "classMethod",
            kind: "method",
            key: { type: "identifier", name: "key" },
            computed: true,
            params: [],
            body: { type: "block", body: [] },
            isAsync: false,
          },
        ],
      },
    });
  });

  it("should parse method named static/get as plain methods", () => {
    expect(stmtOf("class A { static() {} get() {} }")).toStrictEqual({
      type: "classDeclaration",
      name: "A",
      superClass: null,
      body: {
        type: "classBody",
        methods: [
          {
            type: "classMethod",
            kind: "method",
            key: "static",
            computed: false,
            params: [],
            body: { type: "block", body: [] },
            isAsync: false,
          },
          {
            type: "classMethod",
            kind: "method",
            key: "get",
            computed: false,
            params: [],
            body: { type: "block", body: [] },
            isAsync: false,
          },
        ],
      },
    });
  });
});

describe("template literals", () => {
  it("should parse template without substitution", () => {
    expect(exprOf("`abc`")).toStrictEqual({
      type: "template",
      quasis: [{ raw: "abc", cooked: "abc" }],
      expressions: [],
    });
  });

  it("should parse single substitution", () => {
    expect(exprOf("`a${x}b`")).toStrictEqual({
      type: "template",
      quasis: [
        { raw: "a", cooked: "a" },
        { raw: "b", cooked: "b" },
      ],
      expressions: [{ type: "identifier", name: "x" }],
    });
  });

  it("should parse multiple substitutions", () => {
    expect(exprOf("`a${x}b${y}c`")).toStrictEqual({
      type: "template",
      quasis: [
        { raw: "a", cooked: "a" },
        { raw: "b", cooked: "b" },
        { raw: "c", cooked: "c" },
      ],
      expressions: [
        { type: "identifier", name: "x" },
        { type: "identifier", name: "y" },
      ],
    });
  });

  it("should parse nested templates", () => {
    expect(exprOf("`a${`b${c}d`}e`")).toStrictEqual({
      type: "template",
      quasis: [
        { raw: "a", cooked: "a" },
        { raw: "e", cooked: "e" },
      ],
      expressions: [
        {
          type: "template",
          quasis: [
            { raw: "b", cooked: "b" },
            { raw: "d", cooked: "d" },
          ],
          expressions: [{ type: "identifier", name: "c" }],
        },
      ],
    });
  });

  it("should handle object/string/regexp in substitutions", () => {
    expect(exprOf("`${ {a: 1} }`")).toStrictEqual({
      type: "template",
      quasis: [
        { raw: "", cooked: "" },
        { raw: "", cooked: "" },
      ],
      expressions: [
        {
          type: "object",
          props: [
            {
              type: "property",
              kind: "init",
              key: "a",
              computed: false,
              value: { type: "literal", value: 1 },
              shorthand: false,
            },
          ],
        },
      ],
    });
    expect(exprOf("`${'str'}`")).toStrictEqual({
      type: "template",
      quasis: [
        { raw: "", cooked: "" },
        { raw: "", cooked: "" },
      ],
      expressions: [{ type: "literal", value: "str" }],
    });
    expect(exprOf("`${/re/}`")).toStrictEqual({
      type: "template",
      quasis: [
        { raw: "", cooked: "" },
        { raw: "", cooked: "" },
      ],
      expressions: [{ type: "regexp", pattern: "re", flags: "" }],
    });
  });

  it("should handle escapes in template", () => {
    expect(exprOf("`a\\nb`")).toStrictEqual({
      type: "template",
      quasis: [{ raw: "a\\nb", cooked: "a\nb" }],
      expressions: [],
    });
  });
});

describe("statements", () => {
  it("should parse variable declarations", () => {
    expect(stmtOf("var a = 1, b = 2")).toStrictEqual({
      type: "variable",
      kind: "var",
      declarations: [
        { id: { type: "identifier", name: "a" }, init: { type: "literal", value: 1 } },
        { id: { type: "identifier", name: "b" }, init: { type: "literal", value: 2 } },
      ],
    });
    expect(stmtOf("let a")).toStrictEqual({
      type: "variable",
      kind: "let",
      declarations: [{ id: { type: "identifier", name: "a" }, init: null }],
    });
  });

  it("should parse destructuring declarations", () => {
    expect(stmtOf("let { a, b: c = 3 } = obj")).toStrictEqual({
      type: "variable",
      kind: "let",
      declarations: [
        {
          id: {
            type: "objectPattern",
            props: [
              {
                key: "a",
                computed: false,
                value: { type: "identifier", name: "a" },
                shorthand: true,
              },
              {
                key: "b",
                computed: false,
                value: {
                  type: "assignmentPattern",
                  left: { type: "identifier", name: "c" },
                  right: { type: "literal", value: 3 },
                },
                shorthand: false,
              },
            ],
            rest: null,
          },
          init: { type: "identifier", name: "obj" },
        },
      ],
    });
    expect(stmtOf("const [x, ...rest] = arr")).toStrictEqual({
      type: "variable",
      kind: "const",
      declarations: [
        {
          id: {
            type: "arrayPattern",
            elements: [
              { type: "identifier", name: "x" },
              { type: "rest", argument: { type: "identifier", name: "rest" } },
            ],
          },
          init: { type: "identifier", name: "arr" },
        },
      ],
    });
  });

  it("should parse if/else", () => {
    expect(stmtOf("if (a) b(); else c();")).toStrictEqual({
      type: "if",
      test: { type: "identifier", name: "a" },
      consequent: {
        type: "expression",
        expression: {
          type: "call",
          callee: { type: "identifier", name: "b" },
          args: [],
          optional: false,
        },
      },
      alternate: {
        type: "expression",
        expression: {
          type: "call",
          callee: { type: "identifier", name: "c" },
          args: [],
          optional: false,
        },
      },
    });
  });

  it("should parse for statements", () => {
    expect(stmtOf("for (let i = 0; i < 10; i++) {}")).toStrictEqual({
      type: "for",
      init: {
        type: "variable",
        kind: "let",
        declarations: [
          { id: { type: "identifier", name: "i" }, init: { type: "literal", value: 0 } },
        ],
      },
      test: {
        type: "binary",
        op: "<",
        left: { type: "identifier", name: "i" },
        right: { type: "literal", value: 10 },
      },
      update: {
        type: "update",
        op: "++",
        prefix: false,
        argument: { type: "identifier", name: "i" },
      },
      body: { type: "block", body: [] },
    });
    expect(stmtOf("for (;;) {}")).toStrictEqual({
      type: "for",
      init: null,
      test: null,
      update: null,
      body: { type: "block", body: [] },
    });
  });

  it("should parse for-in and for-of", () => {
    expect(stmtOf("for (const k in obj) {}")).toStrictEqual({
      type: "forIn",
      left: {
        type: "variable",
        kind: "const",
        declarations: [{ id: { type: "identifier", name: "k" }, init: null }],
      },
      right: { type: "identifier", name: "obj" },
      body: { type: "block", body: [] },
    });
    expect(stmtOf("for (const x of list) {}")).toStrictEqual({
      type: "forOf",
      left: {
        type: "variable",
        kind: "const",
        declarations: [{ id: { type: "identifier", name: "x" }, init: null }],
      },
      right: { type: "identifier", name: "list" },
      body: { type: "block", body: [] },
    });
    expect(stmtOf("for (x of list) {}")).toStrictEqual({
      type: "forOf",
      left: { type: "identifier", name: "x" },
      right: { type: "identifier", name: "list" },
      body: { type: "block", body: [] },
    });
  });

  it("should parse while and do-while", () => {
    expect(stmtOf("while (x) { x-- }")).toStrictEqual({
      type: "while",
      test: { type: "identifier", name: "x" },
      body: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: {
              type: "update",
              op: "--",
              prefix: false,
              argument: { type: "identifier", name: "x" },
            },
          },
        ],
      },
    });
    expect(stmtOf("do { x++ } while (x < 10)")).toStrictEqual({
      type: "doWhile",
      test: {
        type: "binary",
        op: "<",
        left: { type: "identifier", name: "x" },
        right: { type: "literal", value: 10 },
      },
      body: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: {
              type: "update",
              op: "++",
              prefix: false,
              argument: { type: "identifier", name: "x" },
            },
          },
        ],
      },
    });
  });

  it("should parse switch", () => {
    expect(stmtOf("switch (x) { case 1: a(); break; default: b() }")).toStrictEqual({
      type: "switch",
      discriminant: { type: "identifier", name: "x" },
      cases: [
        {
          test: { type: "literal", value: 1 },
          body: [
            {
              type: "expression",
              expression: {
                type: "call",
                callee: { type: "identifier", name: "a" },
                args: [],
                optional: false,
              },
            },
            { type: "break", label: null },
          ],
        },
        {
          test: null,
          body: [
            {
              type: "expression",
              expression: {
                type: "call",
                callee: { type: "identifier", name: "b" },
                args: [],
                optional: false,
              },
            },
          ],
        },
      ],
    });
  });

  it("should parse try/catch/finally", () => {
    expect(stmtOf("try { a() } catch (e) { b() } finally { c() }")).toStrictEqual({
      type: "try",
      block: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: {
              type: "call",
              callee: { type: "identifier", name: "a" },
              args: [],
              optional: false,
            },
          },
        ],
      },
      handler: {
        param: { type: "identifier", name: "e" },
        body: {
          type: "block",
          body: [
            {
              type: "expression",
              expression: {
                type: "call",
                callee: { type: "identifier", name: "b" },
                args: [],
                optional: false,
              },
            },
          ],
        },
      },
      finalizer: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: {
              type: "call",
              callee: { type: "identifier", name: "c" },
              args: [],
              optional: false,
            },
          },
        ],
      },
    });
  });

  it("should parse throw and return", () => {
    expect(stmtOf("throw new Error('x')")).toStrictEqual({
      type: "throw",
      argument: {
        type: "new",
        callee: { type: "identifier", name: "Error" },
        args: [{ type: "literal", value: "x" }],
      },
    });
    expect(stmtOf("return a + b")).toStrictEqual({
      type: "return",
      argument: {
        type: "binary",
        op: "+",
        left: { type: "identifier", name: "a" },
        right: { type: "identifier", name: "b" },
      },
    });
  });

  it("should parse labeled statements and labeled break/continue", () => {
    expect(stmtOf("outer: for (;;) { break outer }")).toStrictEqual({
      type: "labeled",
      label: "outer",
      body: {
        type: "for",
        init: null,
        test: null,
        update: null,
        body: { type: "block", body: [{ type: "break", label: "outer" }] },
      },
    });
    expect(stmtOf("outer: for (;;) { continue outer }")).toStrictEqual({
      type: "labeled",
      label: "outer",
      body: {
        type: "for",
        init: null,
        test: null,
        update: null,
        body: { type: "block", body: [{ type: "continue", label: "outer" }] },
      },
    });
  });

  it("should parse function declarations", () => {
    expect(stmtOf("function add(a, b) { return a + b }")).toStrictEqual({
      type: "functionDeclaration",
      name: "add",
      params: [
        { type: "identifier", name: "a" },
        { type: "identifier", name: "b" },
      ],
      body: {
        type: "block",
        body: [
          {
            type: "return",
            argument: {
              type: "binary",
              op: "+",
              left: { type: "identifier", name: "a" },
              right: { type: "identifier", name: "b" },
            },
          },
        ],
      },
      isAsync: false,
    });
  });

  it("should parse block, empty, debugger and expression statements", () => {
    expect(programOf("{} ; debugger; a()")).toStrictEqual({
      type: "program",
      body: [
        { type: "block", body: [] },
        { type: "empty" },
        { type: "debugger" },
        {
          type: "expression",
          expression: {
            type: "call",
            callee: { type: "identifier", name: "a" },
            args: [],
            optional: false,
          },
        },
      ],
    });
  });

  it("should parse this and arguments", () => {
    expect(exprOf("this")).toStrictEqual({ type: "this" });
    expect(exprOf("arguments.length")).toStrictEqual({
      type: "member",
      object: { type: "identifier", name: "arguments" },
      property: "length",
      computed: false,
      optional: false,
    });
  });
});

describe("destructuring assignment", () => {
  it("should parse array destructuring", () => {
    expect(exprOf("[a, b] = [b, a]")).toStrictEqual({
      type: "assignment",
      op: "=",
      target: {
        type: "arrayPattern",
        elements: [
          { type: "identifier", name: "a" },
          { type: "identifier", name: "b" },
        ],
      },
      value: {
        type: "array",
        elements: [
          { type: "identifier", name: "b" },
          { type: "identifier", name: "a" },
        ],
      },
    });
  });

  it("should parse nested, default and rest patterns", () => {
    expect(exprOf("[a, , [b] = c, ...rest] = x")).toStrictEqual({
      type: "assignment",
      op: "=",
      target: {
        type: "arrayPattern",
        elements: [
          { type: "identifier", name: "a" },
          null,
          {
            type: "assignmentPattern",
            left: { type: "arrayPattern", elements: [{ type: "identifier", name: "b" }] },
            right: { type: "identifier", name: "c" },
          },
          { type: "rest", argument: { type: "identifier", name: "rest" } },
        ],
      },
      value: { type: "identifier", name: "x" },
    });
  });

  it("should parse object destructuring", () => {
    expect(exprOf("({ a, b: c, d = 1, ...rest } = obj)")).toStrictEqual({
      type: "assignment",
      op: "=",
      target: {
        type: "objectPattern",
        props: [
          { key: "a", computed: false, value: { type: "identifier", name: "a" }, shorthand: true },
          { key: "b", computed: false, value: { type: "identifier", name: "c" }, shorthand: false },
          {
            key: "d",
            computed: false,
            value: {
              type: "assignmentPattern",
              left: { type: "identifier", name: "d" },
              right: { type: "literal", value: 1 },
            },
            shorthand: true,
          },
        ],
        rest: { type: "rest", argument: { type: "identifier", name: "rest" } },
      },
      value: { type: "identifier", name: "obj" },
    });
  });

  it("should parse destructuring in for-of", () => {
    expect(stmtOf("for (const [a, b] of pairs) {}")).toStrictEqual({
      type: "forOf",
      left: {
        type: "variable",
        kind: "const",
        declarations: [
          {
            id: {
              type: "arrayPattern",
              elements: [
                { type: "identifier", name: "a" },
                { type: "identifier", name: "b" },
              ],
            },
            init: null,
          },
        ],
      },
      right: { type: "identifier", name: "pairs" },
      body: { type: "block", body: [] },
    });
  });

  it("should allow member expressions as destructuring targets", () => {
    expect(exprOf("[a.b, c] = x")).toStrictEqual({
      type: "assignment",
      op: "=",
      target: {
        type: "arrayPattern",
        elements: [
          {
            type: "member",
            object: { type: "identifier", name: "a" },
            property: "b",
            computed: false,
            optional: false,
          },
          { type: "identifier", name: "c" },
        ],
      },
      value: { type: "identifier", name: "x" },
    });

    expect(exprOf("({ a: b.c } = obj)")).toStrictEqual({
      type: "assignment",
      op: "=",
      target: {
        type: "objectPattern",
        props: [
          {
            key: "a",
            computed: false,
            value: {
              type: "member",
              object: { type: "identifier", name: "b" },
              property: "c",
              computed: false,
              optional: false,
            },
            shorthand: false,
          },
        ],
        rest: null,
      },
      value: { type: "identifier", name: "obj" },
    });

    expect(exprOf("[[a.b]] = x")).toStrictEqual({
      type: "assignment",
      op: "=",
      target: {
        type: "arrayPattern",
        elements: [
          {
            type: "arrayPattern",
            elements: [
              {
                type: "member",
                object: { type: "identifier", name: "a" },
                property: "b",
                computed: false,
                optional: false,
              },
            ],
          },
        ],
      },
      value: { type: "identifier", name: "x" },
    });
  });
});

describe("async/await", () => {
  it("should parse async function declarations", () => {
    expect(stmtOf("async function f() { await g() }")).toStrictEqual({
      type: "functionDeclaration",
      name: "f",
      params: [],
      body: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: {
              type: "await",
              argument: {
                type: "call",
                callee: { type: "identifier", name: "g" },
                args: [],
                optional: false,
              },
            },
          },
        ],
      },
      isAsync: true,
    });
  });

  it("should parse await inside expressions", () => {
    expect(stmtOf("async function f() { const x = foo() + await p + bar() }")).toStrictEqual({
      type: "functionDeclaration",
      name: "f",
      params: [],
      body: {
        type: "block",
        body: [
          {
            type: "variable",
            kind: "const",
            declarations: [
              {
                id: { type: "identifier", name: "x" },
                init: {
                  type: "binary",
                  op: "+",
                  left: {
                    type: "binary",
                    op: "+",
                    left: {
                      type: "call",
                      callee: { type: "identifier", name: "foo" },
                      args: [],
                      optional: false,
                    },
                    right: { type: "await", argument: { type: "identifier", name: "p" } },
                  },
                  right: {
                    type: "call",
                    callee: { type: "identifier", name: "bar" },
                    args: [],
                    optional: false,
                  },
                },
              },
            ],
          },
        ],
      },
      isAsync: true,
    });
  });

  it("should reject await outside async context", () => {
    expectError("await x");
    expectError("async function f() { function g() { await x } }");
  });

  it("should parse async arrows with await in body", () => {
    expect(exprOf("async () => await x")).toStrictEqual({
      type: "arrow",
      params: [],
      body: { type: "await", argument: { type: "identifier", name: "x" } },
      isAsync: true,
    });

    expect(exprOf("async (a) => await a")).toStrictEqual({
      type: "arrow",
      params: [{ type: "identifier", name: "a" }],
      body: { type: "await", argument: { type: "identifier", name: "a" } },
      isAsync: true,
    });

    expect(exprOf("async () => async () => await x")).toStrictEqual({
      type: "arrow",
      params: [],
      body: {
        type: "arrow",
        params: [],
        body: { type: "await", argument: { type: "identifier", name: "x" } },
        isAsync: true,
      },
      isAsync: true,
    });
  });
});

describe("features", () => {
  it("should disable class", () => {
    expectError("class A {}", { ...ALL_FEATURES, class: false });
    expectError("const C = class {}", { ...ALL_FEATURES, class: false });
  });

  it("should disable for-of", () => {
    expectError("for (const x of y) {}", { ...ALL_FEATURES, forOf: false });
  });

  it("should disable async", () => {
    expectError("async function f() {}", { ...ALL_FEATURES, async: false });
    expectError("async () => 1", { ...ALL_FEATURES, async: false });
    expectError("({ async foo() {} })", { ...ALL_FEATURES, async: false });
    expectError("class A { async foo() {} }", { ...ALL_FEATURES, async: false });
  });

  it("should disable bigint", () => {
    expectError("123n", { ...ALL_FEATURES, bigint: false });
  });
});

describe("for-in / for-of assignment targets", () => {
  it("should allow member expressions as for-in/for-of left", () => {
    expect(stmtOf("for (a.b in obj) {}")).toStrictEqual({
      type: "forIn",
      left: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: false,
      },
      right: { type: "identifier", name: "obj" },
      body: { type: "block", body: [] },
    });

    expect(stmtOf("for (a.b of arr) {}")).toStrictEqual({
      type: "forOf",
      left: {
        type: "member",
        object: { type: "identifier", name: "a" },
        property: "b",
        computed: false,
        optional: false,
      },
      right: { type: "identifier", name: "arr" },
      body: { type: "block", body: [] },
    });
  });
});

describe("noIn contexts in for-init", () => {
  it("should allow `in` inside nested ternary/object/array in for-init", () => {
    expect(stmtOf("for (x ? a in b : c; ;) {}")).toMatchObject({
      type: "for",
      init: {
        type: "conditional",
        consequent: {
          type: "binary",
          op: "in",
          left: { type: "identifier", name: "a" },
          right: { type: "identifier", name: "b" },
        },
      },
    });

    expect(stmtOf("for (var o = {a: 1 in b};;) {}")).toMatchObject({
      type: "for",
      init: {
        type: "variable",
        declarations: [
          { init: { type: "object", props: [{ value: { type: "binary", op: "in" } }] } },
        ],
      },
    });

    expect(stmtOf("for (var a = [1 in b];;) {}")).toMatchObject({
      type: "for",
      init: {
        type: "variable",
        declarations: [{ init: { type: "array", elements: [{ type: "binary", op: "in" }] } }],
      },
    });
  });
});

describe("invalid assignment targets", () => {
  it("should reject invalid for-in/of left-hand sides", () => {
    expectError("for (a + b in obj) {}");
    expectError("for (1 in obj) {}");
    expectError("for (++x in obj) {}");
    expectError("for (x = 1 in obj) {}");
    expectError("for (new X() in obj) {}");
    expectError("for (new X() of arr) {}");
  });

  it("should reject invalid assignment targets", () => {
    expectError("1 = x");
    expectError("a + b = x");
    expectError("++x = x");
    expectError("(a ? b : c) = x");
    expectError("[a, b] += x");
  });
});

describe("error paths", () => {
  it("should throw on unterminated constructs", () => {
    expectError("(1 + 2");
    expectError("if (x)");
    expectError("var");
    expectError("a +");
    expectError("f(");
    expect(() => parse("`abc")).toThrow(LexerError);
  });

  it("should throw ParseError on invalid syntax", () => {
    expect(() => parse("1 +")).toThrow(ParseError);
    expect(() => parse("if (")).toThrow(ParseError);
    expect(() => parse("a ?? b || c")).toThrow(ParseError);
  });

  it("should reject unsupported constructs", () => {
    expectError("with (x) {}");
    expectError("function* f() {}");
    expectError("yield 1");
    expectError("import x from 'y'");
    expectError("new.target");
  });

  it("should parse empty input as an empty program", () => {
    expect(programOf("")).toStrictEqual({ type: "program", body: [] });
  });
});

describe("positions", () => {
  it("should record source offsets", () => {
    const program = parse("a + b");
    const [statement] = program.body;

    expect(statement).toMatchObject({
      type: "expression",
      start: 0,
      end: 5,
      expression: { start: 0, end: 5 },
    });
  });

  it("should record positions of literals", () => {
    const program = parse("123");
    const [statement] = program.body;

    expect(statement).toMatchObject({
      type: "expression",
      expression: { type: "literal", value: 123, start: 0, end: 3 },
    });
  });
});

describe("parser class", () => {
  it("should expose a public Parser class", () => {
    const parser = new Parser("a + b");

    expect(parser.parseProgram()).toMatchObject({
      type: "program",
      body: [{ type: "expression" }],
    });
  });
});

import { describe, expect, it } from "vitest";

import { Lexer, LexerError } from "../src/lexer.js";
import type { Token } from "../src/lexer.js";

/**
 * Tokenize a full source, mimicking the parser's template flow: after a `}` that closes a `${...}`
 * interpolation, call `resumeTemplate()` instead of `next()`.
 *
 * 完整切分源码，模拟 Parser 的模板流程：遇到闭合 `${...}` 的 `}` 后调用 `resumeTemplate()` 而非 `next()`。
 *
 * @param source - Source to tokenize / 待切分的源码
 * @returns Token list / token 列表
 */
const tokenize = (source: string): Token[] => {
  const lexer = new Lexer(source);
  const tokens: Token[] = [];
  const stack: ("block" | "template")[] = [];
  let resumeNext = false;

  for (;;) {
    const token = resumeNext ? lexer.resumeTemplate() : lexer.next();

    resumeNext = false;

    if (token.type === "eof") {
      tokens.push(token);

      return tokens;
    }

    tokens.push(token);

    if (token.type === "templateHead" || token.type === "templateMiddle") {
      stack.push("template");
    } else if (token.type === "punct" && token.value === "{") {
      if (stack.length > 0) stack.push("block");
    } else if (token.type === "punct" && token.value === "}") {
      if (stack[stack.length - 1] === "block") {
        stack.pop();
      } else if (stack[stack.length - 1] === "template") {
        stack.pop();
        resumeNext = true;
      }
    }
  }
};

/**
 * Map tokens to `[type, value]` pairs for compact assertions.
 *
 * 将 token 映射为 `[type, value]` 以便紧凑断言。
 *
 * @param source - Source to tokenize / 待切分的源码
 * @returns `[type, value]` pairs / `[type, value]` 对列表
 */
const lex = (source: string): [Token["type"], string | undefined][] =>
  tokenize(source).map((token) =>
    token.type === "eof" ? [token.type, undefined] : [token.type, token.value],
  );

/**
 * Get the cooked value of the first token (assumed to be a string/template).
 *
 * 获取第一个 token（假定为字符串/模板）的 cooked 值。
 *
 * @param source - Source to tokenize / 待切分的源码
 * @returns The cooked value / cooked 值
 */
const cookedOf = (source: string): string => {
  const [token] = tokenize(source);

  expect(token.type).not.toBe("eof");

  return "cooked" in token ? token.cooked : "";
};

const expectError = (source: string): void => {
  expect(() => tokenize(source)).toThrow(LexerError);
};

describe("identifier and keyword", () => {
  it("should tokenize identifiers", () => {
    expect(lex("hello _foo $bar foo123")).toStrictEqual([
      ["identifier", "hello"],
      ["identifier", "_foo"],
      ["identifier", "$bar"],
      ["identifier", "foo123"],
      ["eof", undefined],
    ]);
  });

  it("should reject non-ASCII identifier characters", () => {
    // Only strict ASCII identifiers are supported; non-ASCII chars are not
    // valid identifier starts and surface as unexpected characters.
    expectError("变量");
    expectError("foo变量");
  });

  it("should tokenize keywords", () => {
    expect(lex("if else for while return function class const let static")).toStrictEqual([
      ["keyword", "if"],
      ["keyword", "else"],
      ["keyword", "for"],
      ["keyword", "while"],
      ["keyword", "return"],
      ["keyword", "function"],
      ["keyword", "class"],
      ["keyword", "const"],
      ["keyword", "let"],
      ["keyword", "static"],
      ["eof", undefined],
    ]);
  });

  it("should treat contextual keywords as identifiers", () => {
    expect(lex("async await of get set as from")).toStrictEqual([
      ["identifier", "async"],
      ["identifier", "await"],
      ["identifier", "of"],
      ["identifier", "get"],
      ["identifier", "set"],
      ["identifier", "as"],
      ["identifier", "from"],
      ["eof", undefined],
    ]);
  });

  it("should distinguish keywords from identifiers", () => {
    expect(lex("typeof type of if")).toStrictEqual([
      ["keyword", "typeof"],
      ["identifier", "type"],
      ["identifier", "of"],
      ["keyword", "if"],
      ["eof", undefined],
    ]);
  });
});

describe("number", () => {
  it("should tokenize decimal numbers", () => {
    expect(lex("0 42 3.14 1. .5 1e3 1.5e-3 1E+2")).toStrictEqual([
      ["number", "0"],
      ["number", "42"],
      ["number", "3.14"],
      ["number", "1."],
      ["number", ".5"],
      ["number", "1e3"],
      ["number", "1.5e-3"],
      ["number", "1E+2"],
      ["eof", undefined],
    ]);
  });

  it("should tokenize hex/octal/binary/legacy octal numbers", () => {
    expect(lex("0x1f 0XFF 0o17 0O17 0b101 0B11 0123 00")).toStrictEqual([
      ["number", "0x1f"],
      ["number", "0XFF"],
      ["number", "0o17"],
      ["number", "0O17"],
      ["number", "0b101"],
      ["number", "0B11"],
      ["number", "0123"],
      ["number", "00"],
      ["eof", undefined],
    ]);
  });

  it("should throw on invalid numbers", () => {
    expectError("0x");
    expectError("1e");
    expectError("0b2");
    expectError("0o8");
    expectError("0x1g");
    expectError("123abc");
  });

  it("should treat non-octal decimal literals as decimal in sloppy mode", () => {
    expect(lex("08 09 018 08.5")).toStrictEqual([
      ["number", "08"],
      ["number", "09"],
      ["number", "018"],
      ["number", "08.5"],
      ["eof", undefined],
    ]);
  });
});

describe("bigint", () => {
  it("should tokenize bigint literals", () => {
    expect(lex("0n 123n 0x1Fn 0o17n 0b101n")).toStrictEqual([
      ["bigint", "0"],
      ["bigint", "123"],
      ["bigint", "0x1F"],
      ["bigint", "0o17"],
      ["bigint", "0b101"],
      ["eof", undefined],
    ]);
  });

  it("should throw on invalid bigint literals", () => {
    expectError("1.5n");
    expectError("1e3n");
    expectError("0123n");
    expectError("08n");
    expectError("09n");
    expectError("018n");
    expectError("0008n");

    // `1n2n` is lexed as two adjacent BigInt literals — the syntax error is a
    // parse-level concern, not a lexical one.
    // `1n2n` 在词法层是两个相邻 BigInt 字面量，语法错误属解析层。
    expect(lex("1n2n")).toStrictEqual([
      ["bigint", "1"],
      ["bigint", "2"],
      ["eof", undefined],
    ]);
  });
});

describe("string", () => {
  it("should keep raw value and cooked value", () => {
    const tokens = tokenize(`"hi" 'world'`);

    expect(tokens[0]).toMatchObject({ type: "string", value: `"hi"`, cooked: "hi" });
    expect(tokens[1]).toMatchObject({ type: "string", value: `'world'`, cooked: "world" });
  });

  it("should handle escape sequences", () => {
    expect([
      cookedOf(String.raw`"\n"`),
      cookedOf(String.raw`"\t"`),
      cookedOf(String.raw`"\r"`),
      cookedOf(String.raw`"\b"`),
      cookedOf(String.raw`"\f"`),
      cookedOf(String.raw`"\v"`),
      cookedOf(String.raw`"\\"`),
      cookedOf(String.raw`"\'"`),
    ]).toStrictEqual(["\n", "\t", "\r", "\b", "\f", "\v", "\\", "'"]);
  });

  it("should handle quote, null and non-escape characters", () => {
    expect([
      cookedOf('"\\\""'),
      cookedOf(String.raw`"\0"`),
      cookedOf(String.raw`"\a"`),
      cookedOf(String.raw`"\q"`),
    ]).toStrictEqual(['"', "\0", "a", "q"]);
  });

  it("should handle hex and unicode escapes", () => {
    expect([
      cookedOf(String.raw`"\x41"`),
      cookedOf(String.raw`"\u0041"`),
      cookedOf(String.raw`"\u{1F600}"`),
    ]).toStrictEqual(["A", "A", "😀"]);
  });

  it("should handle legacy octal escapes", () => {
    expect([
      cookedOf(String.raw`"\1"`),
      cookedOf(String.raw`"\01"`),
      cookedOf(String.raw`"\012"`),
      cookedOf(String.raw`"\08"`),
      cookedOf(String.raw`"\400"`),
      cookedOf(String.raw`"\700"`),
      cookedOf(String.raw`"\777"`),
      cookedOf(String.raw`"\40"`),
      cookedOf(String.raw`"\77"`),
      cookedOf(String.raw`"\8"`),
      cookedOf(String.raw`"\9"`),
    ]).toStrictEqual(["\u0001", "\u0001", "\n", "\u00008", " 0", "80", "?7", " ", "?", "8", "9"]);
  });

  it("should handle line continuation", () => {
    expect(cookedOf('"a\\\nb"')).toBe("ab");
    expect(cookedOf('"a\\\r\nb"')).toBe("ab");
  });

  it("should throw on unterminated strings and raw newlines", () => {
    expectError('"abc');
    expectError("'abc");
    expectError('"a\nb"');
  });

  it("should throw on malformed escapes", () => {
    expectError(String.raw`"\x"`);
    expectError(String.raw`"\x4"`);
    expectError(String.raw`"\u123"`);
    expectError(String.raw`"\u{110000}"`);
    expectError(String.raw`"\u{}"`);
  });
});

describe("template", () => {
  it("should tokenize template without substitution", () => {
    const tokens = tokenize("`hello`");

    expect(tokens[0]).toMatchObject({
      type: "templateNoSubstitution",
      value: "hello",
      cooked: "hello",
    });
  });

  it("should handle escapes in template", () => {
    const tokens = tokenize("`a\\n\\`b\\${c}`");

    expect(tokens[0]).toMatchObject({
      type: "templateNoSubstitution",
      cooked: "a\n`b${c}",
    });
  });

  it("should tokenize single interpolation", () => {
    expect(lex("`a${b}c`")).toStrictEqual([
      ["templateHead", "a"],
      ["identifier", "b"],
      ["punct", "}"],
      ["templateTail", "c"],
      ["eof", undefined],
    ]);
  });

  it("should tokenize multiple interpolations", () => {
    expect(lex("`a${b}${c}d`")).toStrictEqual([
      ["templateHead", "a"],
      ["identifier", "b"],
      ["punct", "}"],
      ["templateMiddle", ""],
      ["identifier", "c"],
      ["punct", "}"],
      ["templateTail", "d"],
      ["eof", undefined],
    ]);
  });

  it("should handle nested templates", () => {
    expect(lex("`a${`b${c}`}d`")).toStrictEqual([
      ["templateHead", "a"],
      ["templateHead", "b"],
      ["identifier", "c"],
      ["punct", "}"],
      ["templateTail", ""],
      ["punct", "}"],
      ["templateTail", "d"],
      ["eof", undefined],
    ]);
  });

  it("should handle object literal inside interpolation", () => {
    expect(lex("`${ {a:1} }`")).toStrictEqual([
      ["templateHead", ""],
      ["punct", "{"],
      ["identifier", "a"],
      ["punct", ":"],
      ["number", "1"],
      ["punct", "}"],
      ["punct", "}"],
      ["templateTail", ""],
      ["eof", undefined],
    ]);
  });

  it("should handle string containing brace inside interpolation", () => {
    expect(lex('`${"}"}`')).toStrictEqual([
      ["templateHead", ""],
      ["string", '"}"'],
      ["punct", "}"],
      ["templateTail", ""],
      ["eof", undefined],
    ]);
  });

  it("should handle regex inside interpolation", () => {
    expect(lex("`${/re/}`")).toStrictEqual([
      ["templateHead", ""],
      ["regexp", "/re/"],
      ["punct", "}"],
      ["templateTail", ""],
      ["eof", undefined],
    ]);
  });

  it("should support the parser-driven flow via public API", () => {
    const lexer = new Lexer("`a${x}c`");

    expect(lexer.next()).toMatchObject({ type: "templateHead", value: "a", cooked: "a" });
    expect(lexer.next()).toMatchObject({ type: "identifier", value: "x" });
    expect(lexer.next()).toMatchObject({ type: "punct", value: "}" });
    expect(lexer.resumeTemplate()).toMatchObject({
      type: "templateTail",
      value: "c",
      cooked: "c",
    });
    expect(lexer.next()).toMatchObject({ type: "eof" });
  });

  it("should throw on unterminated template", () => {
    expectError("`abc");
  });

  it("should throw when resumeTemplate reaches EOF", () => {
    const lexer = new Lexer("`a${b}c");

    expect(lexer.next().type).toBe("templateHead");
    expect(lexer.next().type).toBe("identifier");
    expect(lexer.next().type).toBe("punct");
    expect(() => lexer.resumeTemplate()).toThrow(LexerError);
  });
});

describe("regexp vs division", () => {
  it("should treat / as division after expressions", () => {
    expect(lex("a / b")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "/"],
      ["identifier", "b"],
      ["eof", undefined],
    ]);
    expect(lex("a/b/c")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "/"],
      ["identifier", "b"],
      ["punct", "/"],
      ["identifier", "c"],
      ["eof", undefined],
    ]);
    expect(lex("x = 1 / 2 / 3")).toStrictEqual([
      ["identifier", "x"],
      ["punct", "="],
      ["number", "1"],
      ["punct", "/"],
      ["number", "2"],
      ["punct", "/"],
      ["number", "3"],
      ["eof", undefined],
    ]);
  });

  it("should treat / as regexp after non-expression tokens", () => {
    expect(lex("const r = /ab+c/gi")).toStrictEqual([
      ["keyword", "const"],
      ["identifier", "r"],
      ["punct", "="],
      ["regexp", "/ab+c/gi"],
      ["eof", undefined],
    ]);
    expect(lex("return /re/")).toStrictEqual([
      ["keyword", "return"],
      ["regexp", "/re/"],
      ["eof", undefined],
    ]);
    expect(lex("f() / g()")).toStrictEqual([
      ["identifier", "f"],
      ["punct", "("],
      ["punct", ")"],
      ["punct", "/"],
      ["identifier", "g"],
      ["punct", "("],
      ["punct", ")"],
      ["eof", undefined],
    ]);
  });

  it("should extract pattern and flags", () => {
    const [token] = tokenize("/ab+c/gi");

    expect(token).toMatchObject({
      type: "regexp",
      value: "/ab+c/gi",
      pattern: "ab+c",
      flags: "gi",
    });
  });

  it("should handle character class and escaped slash", () => {
    expect(lex("/[/]/")).toStrictEqual([
      ["regexp", "/[/]/"],
      ["eof", undefined],
    ]);
    expect(lex(String.raw`/a\/b/`)).toStrictEqual([
      ["regexp", String.raw`/a\/b/`],
      ["eof", undefined],
    ]);
    expect(lex("/[]/")).toStrictEqual([
      ["regexp", "/[]/"],
      ["eof", undefined],
    ]);
  });

  it("should treat / as regexp after `this`/`null`/`(`", () => {
    expect(lex("this / 2")).toStrictEqual([
      ["keyword", "this"],
      ["punct", "/"],
      ["number", "2"],
      ["eof", undefined],
    ]);
    expect(lex("null / 2")).toStrictEqual([
      ["keyword", "null"],
      ["punct", "/"],
      ["number", "2"],
      ["eof", undefined],
    ]);
    expect(lex("( /re/ )")).toStrictEqual([
      ["punct", "("],
      ["regexp", "/re/"],
      ["punct", ")"],
      ["eof", undefined],
    ]);
  });

  it("should throw on unterminated regexp and invalid flags", () => {
    expectError("/abc");
    expectError("/x/gg");
    expectError("/x/z");
  });
});

describe("punct", () => {
  it("should match longest operators", () => {
    expect(lex("a === b")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "==="],
      ["identifier", "b"],
      ["eof", undefined],
    ]);
    expect(lex("a >>> b")).toStrictEqual([
      ["identifier", "a"],
      ["punct", ">>>"],
      ["identifier", "b"],
      ["eof", undefined],
    ]);
    expect(lex("a **= b")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "**="],
      ["identifier", "b"],
      ["eof", undefined],
    ]);
    expect(lex("a ??= b")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "??="],
      ["identifier", "b"],
      ["eof", undefined],
    ]);
  });

  it("should match arrow, optional chain and other puncts", () => {
    expect(lex("a => b")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "=>"],
      ["identifier", "b"],
      ["eof", undefined],
    ]);
    expect(lex("a?.b")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "?."],
      ["identifier", "b"],
      ["eof", undefined],
    ]);
    expect(lex("...a")).toStrictEqual([
      ["punct", "..."],
      ["identifier", "a"],
      ["eof", undefined],
    ]);
  });

  it("should treat `?.` followed by a digit as `?` + number", () => {
    expect(lex("a ? .5 : 1")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "?"],
      ["number", ".5"],
      ["punct", ":"],
      ["number", "1"],
      ["eof", undefined],
    ]);
  });

  it("should tokenize basic puncts", () => {
    expect(lex("{ } ( ) [ ] ; , : ~")).toStrictEqual([
      ["punct", "{"],
      ["punct", "}"],
      ["punct", "("],
      ["punct", ")"],
      ["punct", "["],
      ["punct", "]"],
      ["punct", ";"],
      ["punct", ","],
      ["punct", ":"],
      ["punct", "~"],
      ["eof", undefined],
    ]);
  });
});

describe("comments and whitespace", () => {
  it("should skip whitespace", () => {
    expect(lex("  \t\n\r\f 42 ")).toStrictEqual([
      ["number", "42"],
      ["eof", undefined],
    ]);
  });

  it("should skip line comments", () => {
    expect(lex("// comment\n42")).toStrictEqual([
      ["number", "42"],
      ["eof", undefined],
    ]);
    expect(lex("42 // trailing")).toStrictEqual([
      ["number", "42"],
      ["eof", undefined],
    ]);
  });

  it("should skip block comments", () => {
    expect(lex("/* block */42")).toStrictEqual([
      ["number", "42"],
      ["eof", undefined],
    ]);
    expect(lex("/* multi\nline */42")).toStrictEqual([
      ["number", "42"],
      ["eof", undefined],
    ]);
  });

  it("should skip BOM and unicode whitespace", () => {
    expect(lex("\uFEFF42")).toStrictEqual([
      ["number", "42"],
      ["eof", undefined],
    ]);
    expect(lex("\u00A0\u2028\u2029\u3000 42")).toStrictEqual([
      ["number", "42"],
      ["eof", undefined],
    ]);
  });

  it("should throw on unterminated comment", () => {
    expectError("/*/");
    expectError("/* unterminated");
  });
});

describe("eof and peek", () => {
  it("should return eof repeatedly and for empty source", () => {
    const lexer = new Lexer("42");

    expect(lexer.next()).toMatchObject({ type: "number", value: "42" });
    expect(lexer.next()).toMatchObject({ type: "eof" });
    expect(lexer.next()).toMatchObject({ type: "eof" });
    expect(new Lexer("").next()).toMatchObject({ type: "eof" });
  });

  it("should peek without consuming", () => {
    const lexer = new Lexer("a b");

    expect(lexer.peek()).toMatchObject({ type: "identifier", value: "a" });
    expect(lexer.peek()).toMatchObject({ type: "identifier", value: "a" });
    expect(lexer.next()).toMatchObject({ type: "identifier", value: "a" });
    expect(lexer.next()).toMatchObject({ type: "identifier", value: "b" });
  });
});

describe("positions", () => {
  it("should report token positions", () => {
    const tokens = tokenize("const x = 42");

    expect(tokens[0]).toMatchObject({ type: "keyword", value: "const", start: 0, end: 5 });
    expect(tokens[1]).toMatchObject({ type: "identifier", value: "x", start: 6, end: 7 });
    expect(tokens[2]).toMatchObject({ type: "punct", value: "=", start: 8, end: 9 });
    expect(tokens[3]).toMatchObject({ type: "number", value: "42", start: 10, end: 12 });
    expect(tokens[4]).toMatchObject({ type: "eof", start: 12, end: 12 });
  });

  it("should include positions in errors", () => {
    let caught: LexerError | undefined;

    try {
      tokenize("let x = 0x");
    } catch (err) {
      caught = err as LexerError;
    }

    expect(caught).toBeInstanceOf(LexerError);
    expect(caught?.start).toBe(8);
    expect(caught?.end).toBe(10);
    expect(caught?.line).toBe(1);
    expect(caught?.column).toBe(9);
  });

  it("should report positions across lines", () => {
    let caught: LexerError | undefined;

    try {
      tokenize('a\nb\n"unterminated');
    } catch (err) {
      caught = err as LexerError;
    }

    expect(caught).toBeInstanceOf(LexerError);
    expect(caught?.start).toBe(4);
    expect(caught?.line).toBe(3);
    expect(caught?.column).toBe(1);
  });
});

describe("number edge cases", () => {
  it("should reject a bigint literal followed by identifier characters", () => {
    expectError("123na");
    expectError("0x1Fnx");
    expectError("0b101nfoo");
  });
});

describe("string escape edge cases", () => {
  it("should throw on a trailing backslash at the end of input", () => {
    expectError('"abc\\');
    expectError("'a\\");
  });

  it("should throw on an unterminated unicode code point escape", () => {
    expectError(String.raw`"\u{41`);
    expectError(String.raw`"\u{`);
  });

  it("should throw on a non-hex character inside a unicode code point escape", () => {
    expectError(String.raw`"\u{4z}"`);
    expectError(String.raw`"\u{zz}"`);
  });

  it("should handle a bare carriage-return line continuation", () => {
    expect(cookedOf('"a\\\rb"')).toBe("ab");
  });
});

describe("punct edge cases", () => {
  it("should split `?.` before a digit into `?` and a number", () => {
    expect(lex("a?.5 : b")).toStrictEqual([
      ["identifier", "a"],
      ["punct", "?"],
      ["number", ".5"],
      ["punct", ":"],
      ["identifier", "b"],
      ["eof", undefined],
    ]);
  });

  it("should throw on characters that cannot start a token", () => {
    expectError("@");
    expectError("#");
    expectError("a + @");
  });
});

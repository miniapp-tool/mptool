/**
 * Lexer for the `@mptool/run` interpreter.
 *
 * `@mptool/run` 解释器的词法分析器。
 *
 * The lexer splits a source string into a stream of `Token`s. It supports ES5 plus the planned ES6
 * subset (template strings, BigInt literals, optional chaining, exponentiation, logical assignment,
 * etc.).
 *
 * 词法分析器将源码字符串切分为 Token 流，支持 ES5 全量 + 计划内的 ES6 子集 （模板字符串、BigInt 字面量、可选链、幂运算、逻辑赋值等）。
 */

/**
 * A lexical token.
 *
 * 词法单元。
 *
 * - `value` is the raw source text (for `string`, quotes are included; for `template*`, the quasi
 *   text between delimiters).
 * - `string`/`template*` also carry `cooked`, the processed (unescaped) value.
 * - `value` 一般是原始文本（`string` 含引号；`template*` 为分隔符之间的文本）。
 * - `string`/`template*` 额外提供 `cooked`（转义处理后的字符串值）。
 */
export type Token =
  | { type: "identifier"; value: string; start: number; end: number }
  | { type: "keyword"; value: string; start: number; end: number }
  | { type: "number"; value: string; start: number; end: number }
  | { type: "bigint"; value: string; start: number; end: number } // value 不含 'n' 后缀
  | { type: "string"; value: string; cooked: string; start: number; end: number }
  | {
      type: "regexp";
      value: string;
      pattern: string;
      flags: string;
      start: number;
      end: number;
    }
  | {
      type: "templateNoSubstitution";
      value: string;
      cooked: string;
      start: number;
      end: number;
    } // `...`
  | { type: "templateHead"; value: string; cooked: string; start: number; end: number } // `...${
  | {
      type: "templateMiddle";
      value: string;
      cooked: string;
      start: number;
      end: number;
    } // }...${
  | { type: "templateTail"; value: string; cooked: string; start: number; end: number } // }...`
  | { type: "punct"; value: string; start: number; end: number }
  | { type: "eof"; start: number; end: number };

const getLineColumn = (source: string, offset: number): { line: number; column: number } => {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset; i += 1) {
    if (source[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
};

/**
 * Error thrown by the `Lexer` on illegal input, carrying source positions.
 *
 * 词法分析器在遇到非法输入时抛出的错误，包含源码位置信息。
 */
export class LexerError extends Error {
  /** Start offset of the offending range / 出错范围的起始偏移 */
  readonly start: number;

  /** End offset of the offending range / 出错范围的结束偏移 */
  readonly end: number;

  /** 1-based line number / 从 1 开始的行号 */
  readonly line: number;

  /** 1-based column number / 从 1 开始的列号 */
  readonly column: number;

  /**
   * @param message - Error message / 错误信息
   * @param source - Full source string / 完整源码
   * @param start - Start offset / 起始偏移
   * @param end - End offset / 结束偏移
   */
  constructor(message: string, source: string, start: number, end: number) {
    const { line, column } = getLineColumn(source, start);

    super(`${message} (line ${line}, column ${column})`);

    this.name = "LexerError";
    this.start = start;
    this.end = end;
    this.line = line;
    this.column = column;
  }
}

const KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "let",
  "static",
]);

/**
 * Punctuators, sorted by length in descending order for longest-match.
 *
 * 标点/运算符表，按长度降序排列以实现最长匹配。
 */
const PUNCTS = [
  ">>>=",
  "...",
  "===",
  "!==",
  "**=",
  "<<=",
  ">>=",
  ">>>",
  "&&=",
  "||=",
  "??=",
  "==",
  "!=",
  "<=",
  ">=",
  "++",
  "--",
  "<<",
  ">>",
  "**",
  "&&",
  "||",
  "??",
  "=>",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "?.",
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ";",
  ",",
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "%",
  "&",
  "|",
  "^",
  "!",
  "~",
  "?",
  ":",
  "=",
  ".",
] as const;

const REGEXP_FLAGS = new Set(["g", "i", "m", "s", "u", "y"]);

const IDENTIFIER_START_REGEX = /[$_\p{ID_Start}]/u;
const IDENTIFIER_PART_REGEX = /[$_\u200C\u200D\p{ID_Continue}]/u;
const HEX_STRING_REGEX = /^[0-9a-fA-F]+$/u;

const isIdentifierStart = (ch: string | undefined): boolean =>
  typeof ch === "string" && IDENTIFIER_START_REGEX.test(ch);
const isIdentifierPart = (ch: string | undefined): boolean =>
  typeof ch === "string" && IDENTIFIER_PART_REGEX.test(ch);
const isDigit = (ch: string): boolean => ch >= "0" && ch <= "9";
const isOctalDigit = (ch: string): boolean => ch >= "0" && ch <= "7";
const isBinaryDigit = (ch: string): boolean => ch === "0" || ch === "1";
const isHexDigit = (ch: string): boolean =>
  (ch >= "0" && ch <= "9") || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
const isHexString = (str: string): boolean => HEX_STRING_REGEX.test(str);
const isWhitespace = (ch: string): boolean =>
  ch === " " ||
  ch === "\t" ||
  ch === "\n" ||
  ch === "\r" ||
  ch === "\v" ||
  ch === "\f" ||
  ch === "\u00A0" ||
  ch === "\uFEFF" ||
  ch === "\u2028" ||
  ch === "\u2029" ||
  ch === "\u1680" ||
  (ch >= "\u2000" && ch <= "\u200A") ||
  ch === "\u202F" ||
  ch === "\u205F" ||
  ch === "\u3000";

/**
 * Whether a token can be the end of a complete expression, used to decide whether a following `/`
 * is division or a regular expression literal.
 *
 * 判断 token 是否可结束一个完整表达式，用于决定其后的 `/` 是除号还是正则字面量。
 *
 * `templateHead`/`templateMiddle` are intentionally excluded: they open an interpolation, so a `/`
 * right after them always starts a regex (e.g. `` `${/re/}` ``). A completed template
 * (`templateNoSubstitution`/ `templateTail`) does end an expression.
 *
 * `templateHead`/`templateMiddle` 被有意排除：它们开启插值表达式，紧随其后的 `/` 必为正则开始（如 `` `${/re/}`
 * ``）；而完整的模板（`templateNoSubstitution`/ `templateTail`）才结束表达式。
 *
 * @param token - Token to check / 待判断的 token
 * @returns Whether the token ends an expression / 该 token 是否结束表达式
 */
const canEndExpression = (token: Token): boolean => {
  switch (token.type) {
    case "identifier":
    case "number":
    case "bigint":
    case "string":
    case "regexp":
    case "templateNoSubstitution":
    case "templateTail": {
      return true;
    }
    case "keyword": {
      return (
        token.value === "this" ||
        token.value === "super" ||
        token.value === "true" ||
        token.value === "false" ||
        token.value === "null"
      );
    }
    case "punct": {
      return (
        token.value === ")" ||
        token.value === "]" ||
        token.value === "}" ||
        token.value === "++" ||
        token.value === "--"
      );
    }
    default: {
      return false;
    }
  }
};

/**
 * Lexer that turns a source string into a stream of tokens.
 *
 * 将源码字符串切分为 Token 流的词法分析器。
 *
 * Template handling contract (the parser coordinates with it): - `next()` on a backtick scans
 * template text until `` `${`` or `` ` `` and returns `templateNoSubstitution` or `templateHead`. -
 * After `templateHead`/`templateMiddle`, the parser keeps calling `next()` in code mode to parse
 * the interpolation expression; nested templates are handled recursively by the parser. - After the
 * interpolation closes, the parser calls `resumeTemplate()`, which scans from the current position
 * and returns `templateMiddle` or `templateTail`.
 *
 * 模板处理约定（由 Parser 配合）： - `next()` 遇到反引号时扫描模板文本，返回 `templateNoSubstitution` 或 `templateHead`。 - 拿到
 * `templateHead`/`templateMiddle` 后，Parser 用 `next()` 在代码模式 下解析插值表达式，嵌套模板由 Parser 递归处理。 -
 * 插值表达式结束后，Parser 调用 `resumeTemplate()`，从当前位置继续扫描并 返回 `templateMiddle` 或 `templateTail`。
 */
export class Lexer {
  private pos = 0;
  private lastToken: Token | null = null;

  /** @param source - Source code to lex / 待分析的源码 */
  constructor(private readonly source: string) {}

  /**
   * Whether the next `/` should start a regular expression literal.
   *
   * 下一个 `/` 是否应作为正则字面量的开始。
   */
  private get regexAllowed(): boolean {
    return this.lastToken == null || !canEndExpression(this.lastToken);
  }

  /**
   * Get the next token in code mode.
   *
   * 在代码模式下取下一个 token。
   *
   * @returns The next token / 下一个 token
   */
  next(): Token {
    this.skipTrivia();

    const start = this.pos;
    const { source } = this;

    if (this.pos >= source.length) {
      const token: Token = { type: "eof", start, end: start };

      this.lastToken = token;

      return token;
    }

    const ch = source[this.pos];

    if (isIdentifierStart(ch)) return this.readIdentifier(start);
    if (isDigit(ch) || (ch === "." && isDigit(source[this.pos + 1]))) return this.readNumber(start);

    if (ch === '"' || ch === "'") return this.readString(start);
    if (ch === "`") return this.readTemplateStart(start);
    if (ch === "/") return this.regexAllowed ? this.readRegexp(start) : this.readPunct(start);

    return this.readPunct(start);
  }

  /**
   * Peek the next token without consuming it.
   *
   * 预读下一个 token 但不消费。
   *
   * @returns The next token / 下一个 token
   */
  peek(): Token {
    const { pos } = this;
    const { lastToken } = this;
    const token = this.next();

    this.pos = pos;
    this.lastToken = lastToken;

    return token;
  }

  /**
   * Resume scanning template text after an interpolation expression.
   *
   * 在插值表达式结束后继续扫描模板文本。
   *
   * The parser calls this after consuming `templateHead`/`templateMiddle` and parsing the `${...}`
   * expression. The current position must be right after the closing `}` of the interpolation.
   *
   * Parser 在消费 `templateHead`/`templateMiddle` 并解析完 `${...}` 表达式后 调用本方法，当前位置须已越过插值结束的 `}`。
   *
   * @returns `templateMiddle` or `templateTail` / `templateMiddle` 或 `templateTail`
   */
  resumeTemplate(): Token {
    const start = this.pos;
    const quasi = this.scanTemplateQuasi(start, this.pos);
    const token: Token = quasi.hasInterpolation
      ? { type: "templateMiddle", value: quasi.value, cooked: quasi.cooked, start, end: quasi.next }
      : { type: "templateTail", value: quasi.value, cooked: quasi.cooked, start, end: quasi.next };

    this.pos = quasi.next;
    this.lastToken = token;

    return token;
  }

  /**
   * Create a `LexerError` pointing into the current source.
   *
   * 创建指向当前源码的错误。
   *
   * @param message - Error message / 错误信息
   * @param start - Start offset / 起始偏移
   * @param end - End offset / 结束偏移
   * @returns The created error / 创建的错误
   */
  private error(message: string, start: number, end: number): LexerError {
    return new LexerError(message, this.source, start, end);
  }

  /**
   * Skip whitespace, line comments and block comments.
   *
   * 跳过空白、行注释与块注释。
   */
  private skipTrivia(): void {
    const { source } = this;

    while (this.pos < source.length) {
      const ch = source[this.pos];

      if (isWhitespace(ch)) {
        this.pos += 1;
        continue;
      }
      if (ch === "/" && source[this.pos + 1] === "/") {
        while (this.pos < source.length && source[this.pos] !== "\n" && source[this.pos] !== "\r")
          this.pos += 1;

        continue;
      }
      if (ch === "/" && source[this.pos + 1] === "*") {
        const commentStart = this.pos;
        const end = source.indexOf("*/", this.pos + 2);

        if (end === -1) throw this.error("Unterminated comment", commentStart, source.length);

        this.pos = end + 2;
        continue;
      }

      break;
    }
  }

  private readIdentifier(start: number): Token {
    const { source } = this;
    let pos = this.pos + 1;

    while (isIdentifierPart(source[pos])) pos += 1;

    const value = source.slice(start, pos);
    const token: Token = KEYWORDS.has(value)
      ? { type: "keyword", value, start, end: pos }
      : { type: "identifier", value, start, end: pos };

    this.pos = pos;
    this.lastToken = token;

    return token;
  }

  /**
   * Read a numeric literal (decimal, hex, octal, binary or legacy octal), optionally with an `n`
   * suffix for BigInt.
   *
   * 读取数字字面量（十进制、十六进制、八进制、二进制或旧式八进制）， 可带 BigInt 的 `n` 后缀。
   *
   * Note: `08`/`09` are decimal in sloppy mode (NonOctalDecimalIntegerLiteral), and `123abc`-style
   * identifier continuations are rejected.
   *
   * 说明：sloppy 模式下 `08`/`09` 为合法十进制；`123abc` 这类紧跟标识符的数字报错。
   *
   * @param start - Start offset of the literal / 字面量起始偏移
   * @returns The number or bigint token / 数字或 bigint token
   */
  private readNumber(start: number): Token {
    const { source } = this;
    let { pos } = this;
    let radix = 10;
    let legacyOctal = false;
    let hasNonOctal = false;
    let hasFraction = false;
    let hasExponent = false;

    if (source[pos] === "0") {
      const marker = source[pos + 1];

      if (marker === "x" || marker === "X") {
        radix = 16;
        pos += 2;
        if (!isHexDigit(source[pos])) throw this.error("Invalid hexadecimal literal", start, pos);
        while (isHexDigit(source[pos])) pos += 1;
      } else if (marker === "o" || marker === "O") {
        radix = 8;
        pos += 2;
        if (!isOctalDigit(source[pos])) throw this.error("Invalid octal literal", start, pos);
        while (isOctalDigit(source[pos])) pos += 1;
      } else if (marker === "b" || marker === "B") {
        radix = 2;
        pos += 2;
        if (!isBinaryDigit(source[pos])) throw this.error("Invalid binary literal", start, pos);
        while (isBinaryDigit(source[pos])) pos += 1;
      } else if (isDigit(marker)) {
        // A digit run following `0`: legacy octal when every digit is 0-7,
        // otherwise a NonOctalDecimalIntegerLiteral which is decimal in sloppy
        // mode (e.g. `08`, `018`).
        // `0` 后跟数字：全为 0-7 时是旧式八进制，否则为 sloppy 模式合法的十进制。
        let scan = pos + 1;

        while (isDigit(source[scan])) {
          if (source[scan] === "8" || source[scan] === "9") hasNonOctal = true;
          scan += 1;
        }

        if (hasNonOctal) {
          // Keep `pos` at the leading `0`, the decimal path below consumes the
          // whole run (including fraction and exponent).
          // 保持 pos 在开头的 0 处，由下方十进制路径整体消费。
        } else {
          pos = scan;
          legacyOctal = true;
        }
      } else {
        pos += 1;
      }
    }

    if (!legacyOctal && radix === 10) {
      while (isDigit(source[pos])) pos += 1;

      if (source[pos] === ".") {
        hasFraction = true;
        pos += 1;
        while (isDigit(source[pos])) pos += 1;
      }

      if (source[pos] === "e" || source[pos] === "E") {
        let exponentPos = pos + 1;

        if (source[exponentPos] === "+" || source[exponentPos] === "-") exponentPos += 1;
        if (!isDigit(source[exponentPos])) throw this.error("Invalid exponent", start, exponentPos);

        hasExponent = true;
        pos = exponentPos;
        while (isDigit(source[pos])) pos += 1;
      }
    }

    const raw = source.slice(start, pos);

    if (source[pos] === "n") {
      if (legacyOctal || hasNonOctal || (radix === 10 && (hasFraction || hasExponent)))
        throw this.error("Invalid BigInt literal", start, pos + 1);

      pos += 1;
      if (isIdentifierStart(source[pos])) throw this.error("Invalid number literal", start, pos);

      const token: Token = { type: "bigint", value: raw, start, end: pos };

      this.pos = pos;
      this.lastToken = token;

      return token;
    }

    if (isIdentifierStart(source[pos])) throw this.error("Invalid number literal", start, pos);

    const token: Token = { type: "number", value: raw, start, end: pos };

    this.pos = pos;
    this.lastToken = token;

    return token;
  }

  /**
   * Read a single/double quoted string literal.
   *
   * 读取单引号/双引号字符串字面量。
   *
   * @param start - Start offset of the literal / 字面量起始偏移
   * @returns The string token / 字符串 token
   */
  private readString(start: number): Token {
    const { source } = this;
    const quote = source[this.pos];
    let pos = this.pos + 1;
    let cooked = "";

    while (pos < source.length) {
      const ch = source[pos];

      if (ch === quote) {
        pos += 1;
        const token: Token = {
          type: "string",
          value: source.slice(start, pos),
          cooked,
          start,
          end: pos,
        };

        this.pos = pos;
        this.lastToken = token;

        return token;
      }

      if (ch === "\\") {
        const escape = this.readEscape(pos);

        cooked += escape.value;
        pos = escape.next;

        continue;
      }

      if (ch === "\n" || ch === "\r") throw this.error("Unterminated string literal", start, pos);

      cooked += ch;
      pos += 1;
    }

    throw this.error("Unterminated string literal", start, pos);
  }

  /**
   * Read an escape sequence starting at the backslash.
   *
   * 读取从反斜杠开始的转义序列。
   *
   * Supports `\n \t \r \b \f \v \\ \' \" \0 \xHH \uHHHH \u{...}` and line continuation. Unknown
   * escapes keep the character as-is (sloppy mode `NonEscapeCharacter` behavior).
   *
   * 支持 `\n \t \r \b \f \v \\ \' \" \0 \xHH \uHHHH \u{...}` 与行延续； 未知转义保留字符本身（sloppy 模式
   * `NonEscapeCharacter` 行为）。
   *
   * @param pos - Position of the backslash / 反斜杠位置
   * @returns The cooked value and the position after the escape / 转义后的值与结束位置
   */
  private readEscape(pos: number): { value: string; next: number } {
    const { source } = this;

    if (pos + 1 >= source.length) throw this.error("Invalid escape sequence", pos, pos + 1);

    const escaped = source[pos + 1];

    switch (escaped) {
      case "n": {
        return { value: "\n", next: pos + 2 };
      }
      case "t": {
        return { value: "\t", next: pos + 2 };
      }
      case "r": {
        return { value: "\r", next: pos + 2 };
      }
      case "b": {
        return { value: "\b", next: pos + 2 };
      }
      case "f": {
        return { value: "\f", next: pos + 2 };
      }
      case "v": {
        return { value: "\v", next: pos + 2 };
      }
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7": {
        // Legacy octal escape (sloppy mode): a lone `\0` is the NUL character,
        // otherwise up to 3 octal digits (e.g. `\1` → U+0001, `\012` → "\n").
        // 旧式八进制转义（sloppy）：单独的 `\0` 是 NUL，否则最多 3 位八进制。
        if (escaped === "0" && !isOctalDigit(source[pos + 2]))
          return { value: "\0", next: pos + 2 };

        let value = 0;
        let digits = 0;
        // First digit 0-3 allows up to 3 octal digits, 4-7 only up to 2
        // (LegacyOctalEscapeSequence).
        // 首数字 0-3 允许最多 3 位八进制，4-7 只允许 2 位。
        const maxDigits = Number(escaped) <= 3 ? 3 : 2;

        while (digits < maxDigits && isOctalDigit(source[pos + 1 + digits])) {
          value = value * 8 + Number(source[pos + 1 + digits]);
          digits += 1;
        }

        return { value: String.fromCharCode(value), next: pos + 1 + digits };
      }
      case "x": {
        return this.readHexEscape(pos);
      }
      case "u": {
        return this.readUnicodeEscape(pos);
      }
      case "\n": {
        return { value: "", next: pos + 2 };
      }
      case "\r": {
        return source[pos + 2] === "\n"
          ? { value: "", next: pos + 3 }
          : { value: "", next: pos + 2 };
      }
      default: {
        // NonEscapeCharacter — keep the character as-is
        return { value: escaped, next: pos + 2 };
      }
    }
  }

  /**
   * Read a `\xHH` escape sequence.
   *
   * 读取 `\xHH` 转义序列。
   *
   * @param pos - Position of the backslash / 反斜杠位置
   * @returns The cooked value and the position after the escape / 转义后的值与结束位置
   */
  private readHexEscape(pos: number): { value: string; next: number } {
    const { source } = this;
    const hex = source.slice(pos + 2, pos + 4);

    if (hex.length !== 2 || !isHexString(hex))
      throw this.error("Invalid hexadecimal escape sequence", pos, pos + 4);

    return { value: String.fromCharCode(Number.parseInt(hex, 16)), next: pos + 4 };
  }

  /**
   * Read a `\uHHHH` or `\u{...}` escape sequence.
   *
   * 读取 `\uHHHH` 或 `\u{...}` 转义序列。
   *
   * @param pos - Position of the backslash / 反斜杠位置
   * @returns The cooked value and the position after the escape / 转义后的值与结束位置
   */
  private readUnicodeEscape(pos: number): { value: string; next: number } {
    const { source } = this;

    if (source[pos + 2] === "{") {
      let end = pos + 3;
      let codeString = "";

      while (end < source.length && source[end] !== "}") {
        if (!isHexDigit(source[end]))
          throw this.error("Invalid unicode escape sequence", pos, end + 1);

        codeString += source[end];
        end += 1;
      }

      if (end >= source.length) throw this.error("Invalid unicode escape sequence", pos, end);

      const code = Number.parseInt(codeString, 16);

      if (codeString.length === 0 || code > 0x10ffff)
        throw this.error("Invalid unicode escape sequence", pos, end + 1);

      return { value: String.fromCodePoint(code), next: end + 1 };
    }

    const hex = source.slice(pos + 2, pos + 6);

    if (hex.length !== 4 || !isHexString(hex))
      throw this.error("Invalid unicode escape sequence", pos, pos + 6);

    return { value: String.fromCharCode(Number.parseInt(hex, 16)), next: pos + 6 };
  }

  /**
   * Read a regular expression literal (started at `/`).
   *
   * 读取正则表达式字面量（从 `/` 开始）。
   *
   * Character classes `[...]` are tracked so a `/` inside a class does not terminate the literal;
   * `\` escapes the next character.
   *
   * 跟踪字符类 `[...]`，类内的 `/` 不会结束字面量；`\` 转义下一字符。
   *
   * @param start - Start offset of the literal / 字面量起始偏移
   * @returns The regexp token / 正则 token
   */
  private readRegexp(start: number): Token {
    const { source } = this;
    let pos = this.pos + 1;
    let inClass = false;

    while (pos < source.length) {
      const ch = source[pos];

      if (ch === "\\") {
        pos += 2;
        continue;
      }
      if (ch === "[") {
        inClass = true;
        pos += 1;
        continue;
      }
      if (ch === "]") {
        inClass = false;
        pos += 1;
        continue;
      }
      if (ch === "/" && !inClass) break;

      pos += 1;
    }

    if (pos >= source.length)
      throw this.error("Unterminated regular expression literal", start, pos);

    const pattern = source.slice(this.pos + 1, pos);
    let flags = "";
    let flagPos = pos + 1;

    while (flagPos < source.length && REGEXP_FLAGS.has(source[flagPos])) {
      const flag = source[flagPos];

      if (flags.includes(flag))
        throw this.error("Duplicate regular expression flag", start, flagPos + 1);

      flags += flag;
      flagPos += 1;
    }

    if (flagPos < source.length && isIdentifierStart(source[flagPos]))
      throw this.error("Invalid regular expression flag", start, flagPos);

    const end = flagPos;
    const token: Token = {
      type: "regexp",
      value: source.slice(start, end),
      pattern,
      flags,
      start,
      end,
    };

    this.pos = end;
    this.lastToken = token;

    return token;
  }

  /**
   * Read the start of a template literal (at the backtick).
   *
   * 读取模板字面量的开始（在反引号处）。
   *
   * @param start - Start offset of the backtick / 反引号起始偏移
   * @returns The template token / 模板 token
   */
  private readTemplateStart(start: number): Token {
    const quasi = this.scanTemplateQuasi(this.pos + 1, this.pos + 1);
    const token: Token = quasi.hasInterpolation
      ? { type: "templateHead", value: quasi.value, cooked: quasi.cooked, start, end: quasi.next }
      : {
          type: "templateNoSubstitution",
          value: quasi.value,
          cooked: quasi.cooked,
          start,
          end: quasi.next,
        };

    this.pos = quasi.next;
    this.lastToken = token;

    return token;
  }

  /**
   * Scan template text from `scanStart`, stopping at `` ` `` or `` ${ ``.
   *
   * 从 `scanStart` 扫描模板文本，遇 `` ` `` 或 `` ${ `` 停止。
   *
   * @param rawStart - Position where the quasi raw text begins / 准原始文本开始位置
   * @param scanStart - Position to scan from / 开始扫描的位置
   * @returns Quasi raw value, cooked value, next position and whether an interpolation is present /
   *   准原始值、cooked 值、下一位置与是否含插值
   */
  private scanTemplateQuasi(
    rawStart: number,
    scanStart: number,
  ): { value: string; cooked: string; next: number; hasInterpolation: boolean } {
    const { source } = this;
    let pos = scanStart;
    let cooked = "";

    while (pos < source.length) {
      const ch = source[pos];

      if (ch === "`") {
        return {
          value: source.slice(rawStart, pos),
          cooked,
          next: pos + 1,
          hasInterpolation: false,
        };
      }
      if (ch === "$" && source[pos + 1] === "{") {
        return {
          value: source.slice(rawStart, pos),
          cooked,
          next: pos + 2,
          hasInterpolation: true,
        };
      }
      if (ch === "\\") {
        const escape = this.readEscape(pos);

        cooked += escape.value;
        pos = escape.next;

        continue;
      }

      cooked += ch;
      pos += 1;
    }

    throw this.error("Unterminated template literal", rawStart, pos);
  }

  /**
   * Read a punctuator / operator with longest match.
   *
   * 按最长匹配读取标点/运算符。
   *
   * `?.` followed by a digit is tokenized as `?` plus a number (e.g. `a?.5 : b` is a conditional
   * expression).
   *
   * `?.` 后跟数字时按 `?` + 数字处理（如 `a?.5 : b` 是条件表达式）。
   *
   * @param start - Start offset of the punctuator / 标点起始偏移
   * @returns The punct token / 标点 token
   */
  private readPunct(start: number): Token {
    const { source } = this;

    for (const punct of PUNCTS) {
      if (!source.startsWith(punct, this.pos)) continue;

      // `?.` followed by a digit should be `?` + a number
      if (punct === "?." && isDigit(source[this.pos + 2])) continue;

      const end = this.pos + punct.length;
      const token: Token = { type: "punct", value: punct, start, end };

      this.pos = end;
      this.lastToken = token;

      return token;
    }

    throw this.error(`Unexpected character '${source[this.pos]}'`, start, this.pos + 1);
  }
}

/**
 * Low-level lexical helpers for the `Lexer`: token tables (keywords / punctuators / regexp flags)
 * and character classification predicates.
 *
 * `Lexer` 的低层词法辅助：token 表（关键字 / 标点 / 正则标志）与字符分类谓词。
 */
export const KEYWORDS: Set<string> = new Set<string>([
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
export const PUNCTS = [
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

export const REGEXP_FLAGS: Set<string> = new Set<string>(["g", "i", "m", "s", "u", "y"]);

const HEX_STRING_REGEX = /^[0-9a-fA-F]+$/u;

/**
 * Whether a character can start an identifier.
 *
 * 判断字符是否可作为标识符（变量名）的起始字符。
 *
 * Only strict ASCII names (`a-z`, `A-Z`, `$`, `_`) are accepted. This deliberately drops Unicode
 * identifier support so the lexer runs on mini-program devices whose engines do not support
 * `\p{ID_Start}` / `\p{ID_Continue}` Unicode property escapes in regular expressions.
 *
 * 只允许严格 ASCII 变量名（`a-z`、`A-Z`、`$`、`_`）。这是有意为之：弃用 Unicode 标识符支持，以保证在不支持正则 Unicode
 * 属性转义（`\p{ID_Start}` / `\p{ID_Continue}`）的小程序真机环境也能正常运行。
 *
 * @param ch - Character to test / 待判断的字符
 * @returns Whether the character can start an identifier / 是否可作为标识符起始字符
 */
export const isIdentifierStart = (ch: string | undefined): boolean => {
  if (typeof ch !== "string") return false;

  const code = ch.charCodeAt(0);

  return (
    (code >= 0x61 && code <= 0x7a) || // a-z
    (code >= 0x41 && code <= 0x5a) || // A-Z
    code === 0x24 || // $
    code === 0x5f // _
  );
};

/**
 * Whether a character can continue an identifier.
 *
 * 判断字符是否可作为标识符（变量名）的后续字符。
 *
 * Strict ASCII names only (`a-z`, `A-Z`, `0-9`, `$`, `_`), see `isIdentifierStart`.
 *
 * 只允许严格 ASCII 变量名（`a-z`、`A-Z`、`0-9`、`$`、`_`），见 `isIdentifierStart`。
 *
 * @param ch - Character to test / 待判断的字符
 * @returns Whether the character can continue an identifier / 是否可作为标识符后续字符
 */
export const isIdentifierPart = (ch: string | undefined): boolean => {
  if (typeof ch !== "string") return false;

  const code = ch.charCodeAt(0);

  return (
    (code >= 0x61 && code <= 0x7a) || // a-z
    (code >= 0x41 && code <= 0x5a) || // A-Z
    (code >= 0x30 && code <= 0x39) || // 0-9
    code === 0x24 || // $
    code === 0x5f // _
  );
};
export const isDigit = (ch: string): boolean => ch >= "0" && ch <= "9";
export const isOctalDigit = (ch: string): boolean => ch >= "0" && ch <= "7";
export const isBinaryDigit = (ch: string): boolean => ch === "0" || ch === "1";
export const isHexDigit = (ch: string): boolean =>
  (ch >= "0" && ch <= "9") || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
export const isHexString = (str: string): boolean => HEX_STRING_REGEX.test(str);
export const isWhitespace = (ch: string): boolean =>
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

/**
 * Characters that must not appear literally in a data URI payload / 在 data URI 载荷中不能字面出现的字符
 *
 * `%` starts an escape, `#` starts a fragment, `<` / `>` break HTML parsing, `"` ends the
 * containing attribute, `&` starts an HTML character reference, and whitespace / control characters
 * are not valid in a URI. Everything else (`=`, `:`, `/`, `'`, `,`, ...) is kept literal to keep
 * the URI short; browsers accept it inside an `image/svg+xml` data URI.
 */
const MUST_ENCODE: Record<string, string> = {
  "%": "%25",
  "#": "%23",
  "&": "%26",
  '"': "%22",
  "<": "%3C",
  ">": "%3E",
};

/**
 * Convert SVG markup to a `data:` URI.
 *
 * Only URI-significant characters are percent-encoded; the rest of the SVG is left as-is so the URI
 * stays as short as possible.
 *
 * 将 SVG 标记转换为 `data:` URI。只编码 URI 中有特殊含义的字符，其余内容原样保留，尽量缩短 URI。
 *
 * @param content - SVG content to convert / 待转换的 SVG 内容
 * @returns Data URI string / Data URI 字符串
 */
export const convertSVGToDataURI = (content: string): string =>
  `data:image/svg+xml,${content
    // the character class below matches exactly the keys of `MUST_ENCODE`, so every lookup hits
    // 下方字符类与 `MUST_ENCODE` 的键完全一致，因此查表必然命中，无需回退原字符
    .replace(/[%#&"<>]/gu, (character) => MUST_ENCODE[character])
    .replace(
      /\s/gu,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
    )
    .replace(/[^\u0020-\u007E]/gu, (character) => encodeURIComponent(character))}`;

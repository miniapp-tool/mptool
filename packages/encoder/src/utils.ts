// oxlint-disable no-bitwise
/**
 * @param  a The number to test.
 * @param min The minimum value in the range, inclusive.
 * @param max The maximum value in the range, inclusive.
 * @returns True if a >= min and a <= max.
 */
export const inRange = (a: number, min: number, max: number): boolean => min <= a && a <= max;

/**
 * An ASCII byte is a byte in the range 0x00 to 0x7F, inclusive.
 * @param a The number to test.
 * @returns True if a is in the range 0x00 to 0x7F, inclusive.
 */
export const isASCIIByte = (a: number): boolean => a >= 0x00 && a <= 0x7f;

/**
 * @param content Input string of UTF-16 code units.
 * @returns code points.
 */
export const stringToCodePoints = (content: string): number[] => {
  // https://heycam.github.io/webidl/#dfn-obtain-unicode

  // 1. Let S be the DOMString value.
  const str = String(content);

  // 2. Let n be the length of S.
  const strLength = str.length;

  // 3. Initialize i to 0.
  let i = 0;

  // 4. Initialize U to be an empty sequence of Unicode characters.
  const u: number[] = [];

  // 5. While i < strLength:
  while (i < strLength) {
    // 1. Let char be the code unit in S at index i.
    const char = str.charCodeAt(i);

    // 2. Depending on the value of c:

    // char < 0xD800 or char > 0xDFFF
    if (char < 0xd800 || char > 0xdfff)
      // Append to U the Unicode character with code point c.
      u.push(char);
    // 0xDC00 ≤ char ≤ 0xDFFF
    else if (char >= 0xdc00 && char <= 0xdfff)
      // Append to U a U+FFFD REPLACEMENT CHARACTER.
      u.push(0xfffd);
    // 0xD800 ≤ char ≤ 0xDBFF
    else if (char >= 0xd800 && char <= 0xdbff)
      if (i === strLength - 1) {
        // 1. i is the last one then append to U a U+FFFD REPLACEMENT
        // CHARACTER.
        u.push(0xfffd);
      }
      // 2. Otherwise
      else {
        // 1. Let d be the code unit in S at index i+1.
        const nextChar = str.charCodeAt(i + 1);

        // 2. If 0xDC00 ≤ nextChar ≤ 0xDFFF, then:
        if (nextChar >= 0xdc00 && nextChar <= 0xdfff) {
          // 1. Let a be char & 0x3FF.
          const a = char & 0x3ff;

          // 2. Let b be nextChar & 0x3FF.
          const b = nextChar & 0x3ff;

          // 3. Append to U the Unicode character with code point
          // 2^16+2^10*a+b.
          u.push(0x10000 + (a << 10) + b);

          // 4. Set i to i+1.
          i += 1;
        }

        // 3. Otherwise, nextChar < 0xDC00 or nextChar > 0xDFFF. Append to U a
        // U+FFFD REPLACEMENT CHARACTER.
        else {
          u.push(0xfffd);
        }
      }

    // 3. Set i to i+1.
    i += 1;
  }

  // 6. Return U.
  return u;
};

/**
 * @param {!Array.<number>} codePoints Array of code points.
 * @returns {string} string String of UTF-16 code units.
 */
export const codePointsToString = (codePoints: number[]): string => {
  let s = "";

  for (let codePoint of codePoints) {
    if (codePoint <= 0xffff) {
      s += String.fromCharCode(codePoint);
    } else {
      codePoint -= 0x10000;
      s += String.fromCharCode((codePoint >> 10) + 0xd800, (codePoint & 0x3ff) + 0xdc00);
    }
  }

  return s;
};

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

  // 3. Initialize index to 0.
  let index = 0;

  // 4. Initialize U to be an empty sequence of Unicode characters.
  const charCodePoints: number[] = [];

  // 5. While i < strLength:
  while (index < strLength) {
    // 1. Let char be the code unit in S at index i.
    const char = str.charCodeAt(index);

    // 2. Depending on the value of c:

    // char < 0xD800 or char > 0xDFFF
    if (char < 0xd800 || char > 0xdfff)
      // Append to U the Unicode character with code point c.
      charCodePoints.push(char);
    // 0xDC00 ≤ char ≤ 0xDFFF
    else if (char >= 0xdc00 && char <= 0xdfff)
      // Append to U a U+FFFD REPLACEMENT CHARACTER.
      charCodePoints.push(0xfffd);
    // 0xD800 ≤ char ≤ 0xDBFF
    else if (char >= 0xd800 && char <= 0xdbff)
      if (index === strLength - 1) {
        // 1. i is the last one then append to U a U+FFFD REPLACEMENT
        // CHARACTER.
        charCodePoints.push(0xfffd);
      }
      // 2. Otherwise
      else {
        // 1. Let d be the code unit in S at index i+1.
        const nextChar = str.charCodeAt(index + 1);

        // 2. If 0xDC00 ≤ nextChar ≤ 0xDFFF, then:
        if (nextChar >= 0xdc00 && nextChar <= 0xdfff) {
          // 1. Let a be char & 0x3FF.
          const a = char & 0x3ff;

          // 2. Let b be nextChar & 0x3FF.
          const b = nextChar & 0x3ff;

          // 3. Append to U the Unicode character with code point
          // 2^16+2^10*a+b.
          charCodePoints.push(0x10000 + (a << 10) + b);

          // 4. Set i to i+1.
          index += 1;
        }

        // 3. Otherwise, nextChar < 0xDC00 or nextChar > 0xDFFF. Append to U a
        // U+FFFD REPLACEMENT CHARACTER.
        else {
          charCodePoints.push(0xfffd);
        }
      }

    // 3. Set i to i+1.
    index += 1;
  }

  // 6. Return U.
  return charCodePoints;
};

/**
 * @param codePoints Array of code points.
 * @returns String of UTF-16 code units.
 */
export const codePointsToString = (codePoints: number[]): string => {
  let str = "";

  for (let codePoint of codePoints) {
    if (codePoint <= 0xffff) {
      str += String.fromCharCode(codePoint);
    } else {
      codePoint -= 0x10000;
      str += String.fromCharCode((codePoint >> 10) + 0xd800, (codePoint & 0x3ff) + 0xdc00);
    }
  }

  return str;
};

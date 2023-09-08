/**
 * @param  a The number to test.
 * @param min The minimum value in the range, inclusive.
 * @param max The maximum value in the range, inclusive.
 * @return True if a >= min and a <= max.
 */
export const inRange = (a: number, min: number, max: number): boolean =>
  min <= a && a <= max;

/**
 * An ASCII byte is a byte in the range 0x00 to 0x7F, inclusive.
 * @param a The number to test.
 * @return True if a is in the range 0x00 to 0x7F, inclusive.
 */
export const isASCIIByte = (a: number): boolean => 0x00 <= a && a <= 0x7f;

/**
 * @param content Input string of UTF-16 code units.
 * @return code points.
 */
export const stringToCodePoints = (content: string): number[] => {
  // https://heycam.github.io/webidl/#dfn-obtain-unicode

  // 1. Let S be the DOMString value.
  const s = String(content);

  // 2. Let n be the length of S.
  const n = s.length;

  // 3. Initialize i to 0.
  let i = 0;

  // 4. Initialize U to be an empty sequence of Unicode characters.
  const u: number[] = [];

  // 5. While i < n:
  while (i < n) {
    // 1. Let c be the code unit in S at index i.
    const c = s.charCodeAt(i);

    // 2. Depending on the value of c:

    // c < 0xD800 or c > 0xDFFF
    if (c < 0xd800 || c > 0xdfff) {
      // Append to U the Unicode character with code point c.
      u.push(c);
    }

    // 0xDC00 ≤ c ≤ 0xDFFF
    else if (0xdc00 <= c && c <= 0xdfff) {
      // Append to U a U+FFFD REPLACEMENT CHARACTER.
      u.push(0xfffd);
    }

    // 0xD800 ≤ c ≤ 0xDBFF
    else if (0xd800 <= c && c <= 0xdbff) {
      // 1. If i = n−1, then append to U a U+FFFD REPLACEMENT
      // CHARACTER.
      if (i === n - 1) {
        u.push(0xfffd);
      }
      // 2. Otherwise, i < n−1:
      else {
        // 1. Let d be the code unit in S at index i+1.
        const d = s.charCodeAt(i + 1);

        // 2. If 0xDC00 ≤ d ≤ 0xDFFF, then:
        if (0xdc00 <= d && d <= 0xdfff) {
          // 1. Let a be c & 0x3FF.
          const a = c & 0x3ff;

          // 2. Let b be d & 0x3FF.
          const b = d & 0x3ff;

          // 3. Append to U the Unicode character with code point
          // 2^16+2^10*a+b.
          u.push(0x10000 + (a << 10) + b);

          // 4. Set i to i+1.
          i += 1;
        }

        // 3. Otherwise, d < 0xDC00 or d > 0xDFFF. Append to U a
        // U+FFFD REPLACEMENT CHARACTER.
        else {
          u.push(0xfffd);
        }
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
 * @return {string} string String of UTF-16 code units.
 */
export const codePointsToString = (codePoints: number[]): string => {
  let s = "";

  for (let i = 0; i < codePoints.length; ++i) {
    let cp = codePoints[i];

    if (cp <= 0xffff) {
      s += String.fromCharCode(cp);
    } else {
      cp -= 0x10000;
      s += String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
    }
  }

  return s;
};

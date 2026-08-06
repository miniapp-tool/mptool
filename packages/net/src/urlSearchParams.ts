/**
 * Forked from https://github.com/jerrybendy/url-search-params-polyfill
 *
 * MIT License
 *
 * Copyright (c) 2016 Jerry Bendy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// oxlint-disable no-bitwise
const ENCODE_MAP: Record<string, string> = {
  "!": "%21",
  "'": "%27",
  "(": "%28",
  ")": "%29",
  "~": "%7E",
  "%20": "+",
};

const encode = (str: string): string =>
  encodeURIComponent(str).replace(/[!'()~]|%20/gu, (match) => ENCODE_MAP[match]);

/**
 * Decodes a byte sequence as UTF-8 into a string, replacing malformed sequences with U+FFFD,
 * matching the native behavior.
 *
 * @param bytes - The UTF-8 byte sequence
 * @returns The decoded string
 */
// oxlint-disable-next-line max-statements, complexity
const decodeUtf8 = (bytes: number[]): string => {
  let result = "";
  let index = 0;

  while (index < bytes.length) {
    const byte = bytes[index];

    // ASCII byte
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
      index += 1;
      continue;
    }

    let length = 0;
    let codePoint = 0;

    if (byte >= 0xc2 && byte <= 0xdf) {
      length = 2;
      codePoint = byte & 0x1f;
    } else if (byte >= 0xe0 && byte <= 0xef) {
      length = 3;
      codePoint = byte & 0x0f;
    } else if (byte >= 0xf0 && byte <= 0xf4) {
      length = 4;
      codePoint = byte & 0x07;
    } else {
      // Invalid leading byte (0x80-0xC1 or 0xF5-0xFF)
      result += "\uFFFD";
      index += 1;
      continue;
    }

    let consumed = 0;

    for (let i = 1; i < length; i += 1) {
      const next = bytes[index + i];

      // oxlint-disable-next-line no-undefined
      if (next === undefined || (next & 0xc0) !== 0x80) break;
      codePoint = (codePoint << 6) | (next & 0x3f);
      consumed = i;
    }

    // Not enough continuation bytes: emit a single U+FFFD, skip the leading byte and
    // the consumed continuation bytes
    if (consumed !== length - 1) {
      result += "\uFFFD";
      index += consumed + 1;
      continue;
    }

    // Reject overlong encodings, surrogate code points and code points beyond U+10FFFF
    if (
      (length === 2 && codePoint < 0x80) ||
      (length === 3 && codePoint < 0x800) ||
      (length === 4 && codePoint < 0x10000) ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      result += "\uFFFD";
      index += length;
      continue;
    }

    result += String.fromCodePoint(codePoint);
    index += length;
  }

  return result;
};

/**
 * Leniently decodes the input, matching the native `URLSearchParams` behavior:
 *
 * - `+` decodes to a space
 * - Valid `%XX` sequences decode to bytes, which are then decoded as UTF-8
 * - Invalid `%` (non-hexadecimal or lone) is kept as-is
 *
 * @param str - The string to decode
 * @returns The decoded string
 */
const decode = (str: string): string => {
  let result = "";
  let bytes: number[] = [];

  const flush = (): void => {
    if (bytes.length) {
      result += decodeUtf8(bytes);
      bytes = [];
    }
  };

  for (let i = 0; i < str.length; i += 1) {
    const char = str[i];

    if (char === "+") {
      flush();
      result += " ";
    } else if (char === "%") {
      const hex = str.slice(i + 1, i + 3);

      if (/^[0-9a-f]{2}$/iu.test(hex)) {
        bytes.push(Number.parseInt(hex, 16));
        i += 2;
      } else {
        flush();
        result += "%";
      }
    } else {
      flush();
      result += char;
    }
  }

  flush();

  return result;
};

export class URLSearchParams {
  private params: [name: string, value: string][];

  constructor(
    init?:
      | URLSearchParams
      | string
      | Record<string, string | string[]>
      | Iterable<[string, string]>,
  ) {
    // oxlint-disable-next-line typescript/strict-boolean-expressions
    if (!init) {
      this.params = [];
    } else if (init instanceof URLSearchParams) {
      this.params = init.params.map(([name, value]) => [name, value]);
    } else {
      this.params = [];

      if (typeof init === "string") {
        (init.startsWith("?")
          ? // remove first '?'
            init.slice(1)
          : init
        )
          .split("&")
          .forEach((pair) => {
            // Ignore empty pairs (e.g. from "a&&b"), keep pairs with an empty
            // name but a value (e.g. "=v") per the URL standard.
            if (pair === "") return;

            const index = pair.indexOf("=");
            const name = index === -1 ? pair : pair.slice(0, index);
            const value = index === -1 ? "" : pair.slice(index + 1);

            this.append(decode(name), decode(value));
          });
      } else if (Symbol.iterator in init) {
        for (const item of init) {
          if (item.length !== 2) {
            throw new TypeError(
              "Failed to construct 'URLSearchParams': Sequence initializer must only contain pair elements",
            );
          }
          const [key, value] = item;

          this.append(key, value);
        }
      } else {
        for (const key of Object.keys(init)) {
          const value = init[key];

          this.append(key, String(value));
        }
      }
    }
  }

  get size(): number {
    return this.params.length;
  }

  /**
   * Append a new name-value pair to the query string.
   *
   * @param name - The name of the parameter
   * @param value - The value of the parameter
   */
  append(name: string, value: string): void {
    // oxlint-disable-next-line typescript/no-unnecessary-type-conversion
    this.params.push([name, String(value)]);
  }

  /**
   * Removes all name-value pairs whose name is `name` and, if `value` is provided, whose value is
   * `value`.
   *
   * @param name - The name of the parameter to delete
   * @param value - If provided, only removes pairs with this value
   */
  delete(name: string, value?: string): void {
    this.params = this.params.filter(
      // oxlint-disable-next-line no-undefined
      ([key, val]) => key !== name || (value !== undefined && val !== value),
    );
  }

  /**
   * Returns an ES6 `Iterator` over each of the name-value pairs in the query. Each item of the
   * iterator is a JavaScript `Array`. The first item of the `Array`is the `name`, the second item
   * of the `Array` is the `value`.
   *
   * Alias for `urlSearchParams[@@iterator]()`.
   *
   * @returns An iterator over the name-value pairs in the query
   */
  entries(): IterableIterator<[string, string]> {
    return this.params.values();
  }

  /**
   * Iterates over each name-value pair in the query and invokes the given function.
   *
   * ```js
   * const myURL = new URL("https://example.org/?a=b&#x26;c=d");
   * myURL.searchParams.forEach((value, name, searchParams) => {
   *   console.log(name, value, myURL.searchParams === searchParams);
   * });
   * // Prints:
   * //   a b true
   * //   c d true
   * ```
   *
   * @param callbackfn Invoked for each name-value pair in the query
   * @param thisArg To be used as `this` value for when `fn` is called
   */
  forEach(
    callbackfn: (value: string, key: string, iterable: URLSearchParams) => void,
    thisArg?: unknown,
  ): void {
    // Bind thisArg once to avoid creating a new function on every iteration
    // oxlint-disable-next-line no-undefined
    const bound = thisArg === undefined ? callbackfn : callbackfn.bind(thisArg);

    for (const [key, value] of this.params) bound(value, key, this);
  }

  /**
   * Returns the value of the first name-value pair whose name is `name`. If there are no such
   * pairs, `null` is returned.
   *
   * @param name - The name of the parameter
   * @returns The value of the first matching parameter, or `null` if not found
   */
  get(name: string): string | null {
    return this.params.find(([key]) => key === name)?.[1] ?? null;
  }

  /**
   * Returns the values of all name-value pairs whose name is `name`. If there are no such pairs, an
   * empty array is returned.
   *
   * @param name - The name of the parameter
   * @returns An array of values associated with the given parameter
   */
  getAll(name: string): string[] {
    return this.params.filter(([key]) => key === name).map(([, value]) => value);
  }

  /**
   * Checks if the `URLSearchParams` object contains key-value pair(s) based on`name` and an
   * optional `value` argument.
   *
   * If `value` is provided, returns `true` when name-value pair with same `name` and `value`
   * exists.
   *
   * If `value` is not provided, returns `true` if there is at least one name-value pair whose name
   * is `name`.
   *
   * @param name - The name of the parameter to check
   * @returns `true` if a matching name-value pair exists, `false` otherwise
   */
  has(name: string): boolean {
    return this.params.some(([key]) => key === name);
  }

  /**
   * Returns an ES6 `Iterator` over the names of each name-value pair.
   *
   * ```js
   * const params = new URLSearchParams("foo=bar&#x26;foo=baz");
   * for (const name of params.keys()) {
   *   console.log(name);
   * }
   * // Prints:
   * //   foo
   * //   foo
   * ```
   *
   * @yields {string} The name of each name-value pair
   * @returns An iterator over the names of each name-value pair
   */
  *keys(): IterableIterator<string> {
    for (const [name] of this.params) yield name;
  }

  /**
   * Sets the value in the `URLSearchParams` object associated with `name` to`value`. If there are
   * any pre-existing name-value pairs whose names are `name`, set the first such pair's value to
   * `value` and remove all others. If not, append the name-value pair to the query string.
   *
   * ```js
   * const params = new URLSearchParams();
   * params.append("foo", "bar");
   * params.append("foo", "baz");
   * params.append("abc", "def");
   * console.log(params.toString());
   * // Prints foo=bar&#x26;foo=baz&#x26;abc=def
   *
   * params.set("foo", "def");
   * params.set("xyz", "opq");
   * console.log(params.toString());
   * // Prints foo=def&#x26;abc=def&#x26;xyz=opq
   * ```
   *
   * @param name - The name of the parameter to set
   * @param value - The value to set
   */
  set(name: string, value: string): void {
    const firstIndex = this.params.findIndex(([key]) => key === name);

    if (firstIndex === -1) {
      // oxlint-disable-next-line typescript/no-unnecessary-type-conversion
      this.params.push([name, String(value)]);
      return;
    }

    // Keep the first matching pair in place and drop the rest
    this.params = this.params.filter(([key], index) => key !== name || index === firstIndex);
    // oxlint-disable-next-line typescript/no-unnecessary-type-conversion
    this.params[firstIndex] = [name, String(value)];
  }

  /**
   * Sort all existing name-value pairs in-place by their names. Sorting is done with a [stable
   * sorting algorithm](https://en.wikipedia.org/wiki/Sorting_algorithm#Stability), so relative
   * order between name-value pairs with the same name is preserved.
   *
   * This method can be used, in particular, to increase cache hits.
   *
   * ```js
   * const params = new URLSearchParams("query[]=abc&#x26;type=search&#x26;query[]=123");
   * params.sort();
   * console.log(params.toString());
   * // Prints query%5B%5D=abc&#x26;query%5B%5D=123&#x26;type=search
   * ```
   */
  sort(): void {
    // Code unit order, as required by the URL standard (String comparison is
    // already based on UTF-16 code units)
    this.params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }

  /**
   * Returns the search parameters serialized as a string, with characters percent-encoded where
   * necessary.
   *
   * @returns The serialized query string
   */
  toString(): string {
    return this.params.map(([name, value]) => `${encode(name)}=${encode(value)}`).join("&");
  }

  /**
   * Returns an ES6 `Iterator` over the values of each name-value pair.
   *
   * @yields {string} The value of each name-value pair
   * @returns An iterator over the values
   */
  *values(): IterableIterator<string> {
    for (const [, value] of this.params) yield value;
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }
}

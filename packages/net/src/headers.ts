import { splitCookiesString } from "set-cookie-parser";

const HEADERS_INVALID_CHARACTERS = /[^a-z0-9\-#$%&'*+.^_`|~]/i;
const TOKENS = [
  0x7f,
  0x20,
  "(",
  ")",
  "<",
  ">",
  "@",
  ",",
  ";",
  ":",
  "\\",
  '"',
  "/",
  "[",
  "]",
  "?",
  "=",
  "{",
  "}",
];
const NORMALIZED_HEADERS = Symbol("normalizedHeaders");
const RAW_HEADER_NAMES = Symbol("rawHeaderNames");
const HEADER_VALUE_DELIMITER = ", " as const;
const REMOVED_CHARS = [
  String.fromCharCode(0x0a),
  String.fromCharCode(0x0d),
  String.fromCharCode(0x09),
  String.fromCharCode(0x20),
];
const HEADER_VALUE_REMOVE_REGEXP = new RegExp(
  `(^[${REMOVED_CHARS.join("")}]|$[${REMOVED_CHARS.join("")}])`,
  "g",
);

const isToken = (value: string | number): boolean => !TOKENS.includes(value);

/**
 * Validate the given header name.
 * @see https://fetch.spec.whatwg.org/#header-name
 */
const isValidHeaderName = (value: unknown): boolean => {
  if (typeof value !== "string" || value.length === 0) return false;

  for (let i = 0; i < value.length; i++) {
    const character = value.charCodeAt(i);

    if (character > 0x7f || !isToken(character)) return false;
  }

  return true;
};

const normalizeHeaderName = (name: string): string => {
  if (HEADERS_INVALID_CHARACTERS.test(name) || name.trim() === "")
    throw new TypeError("Invalid character in header field name");

  return name.trim().toLowerCase();
};

/**
 * Validate the given header value.
 * @see https://fetch.spec.whatwg.org/#header-value
 */
const isValidHeaderValue = (value: unknown): boolean => {
  if (typeof value !== "string" || value.trim() !== value) return false;

  for (let i = 0; i < value.length; i++) {
    const character = value.charCodeAt(i);

    if (
      // NUL.
      character === 0x00 ||
      // HTTP newline bytes.
      character === 0x0a ||
      character === 0x0d
    )
      return false;
  }

  return true;
};

/**
 * Normalize the given header value.
 * @see https://fetch.spec.whatwg.org/#concept-header-value-normalize
 */
const normalizeHeaderValue = (value: string): string =>
  value.replace(HEADER_VALUE_REMOVE_REGEXP, "");

export type HeadersInit = [string, string][] | Record<string, string> | Headers;

export class Headers {
  // Normalized header {"name":"a, b"} storage.
  private [NORMALIZED_HEADERS]: Record<string, string> = {};

  // Keeps the mapping between the raw header name
  // and the normalized header name to ease the lookup.
  private [RAW_HEADER_NAMES]: Map<string, string> = new Map();

  constructor(init?: HeadersInit) {
    if (init instanceof Headers) {
      const initialHeaders = init;

      initialHeaders.forEach((value, name) => {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(init)) {
      init.forEach(([name, value]) => {
        this.append(
          name,
          Array.isArray(value) ? value.join(HEADER_VALUE_DELIMITER) : value,
        );
      });
    } else if (init) {
      Object.getOwnPropertyNames(init).forEach((name) => {
        const value = init[name];
        this.append(
          name,
          Array.isArray(value) ? value.join(HEADER_VALUE_DELIMITER) : value,
        );
      });
    }
  }

  /**
   * Appends a new value onto an existing header inside a `Headers` object, or adds the header if it does not already exist.
   */
  append(name: string, value: string): void {
    if (!isValidHeaderName(name) || !isValidHeaderValue(value)) {
      return;
    }

    const normalizedName = normalizeHeaderName(name);
    const normalizedValue = normalizeHeaderValue(value);

    const resolvedValue = this.has(normalizedName)
      ? `${this.get(normalizedName)}, ${normalizedValue}`
      : normalizedValue;

    this.set(name, resolvedValue);
  }

  /**
   * Deletes a header from the `Headers` object.
   */
  delete(name: string): void {
    if (!isValidHeaderName(name)) {
      return;
    }

    if (!this.has(name)) {
      return;
    }

    const normalizedName = normalizeHeaderName(name);
    delete this[NORMALIZED_HEADERS][normalizedName];
    this[RAW_HEADER_NAMES].delete(normalizedName);
  }

  /**
   * Returns a `ByteString` sequence of all the values of a header with a given name.
   */
  get(name: string): string | null {
    if (!isValidHeaderName(name))
      throw TypeError(`Invalid header name "${name}"`);

    return this[NORMALIZED_HEADERS][normalizeHeaderName(name)] ?? null;
  }

  /**
   * Returns an array containing the values
   * of all Set-Cookie headers associated
   * with a response
   */
  getSetCookie(): string[] {
    const setCookieHeader = this.get("set-cookie");

    if (setCookieHeader === null) {
      return [];
    }

    if (setCookieHeader === "") {
      return [""];
    }

    return splitCookiesString(setCookieHeader);
  }

  /**
   * Returns a boolean stating whether a `Headers` object contains a certain header.
   */
  has(name: string): boolean {
    if (!isValidHeaderName(name)) {
      throw new TypeError(`Invalid header name "${name}"`);
    }

    // eslint-disable-next-line no-prototype-builtins
    return this[NORMALIZED_HEADERS].hasOwnProperty(normalizeHeaderName(name));
  }

  /**
   * Sets a new value for an existing header inside a `Headers` object, or adds the header if it does not already exist.
   */
  set(name: string, value: string): void {
    if (!isValidHeaderName(name) || !isValidHeaderValue(value)) {
      return;
    }

    const normalizedName = normalizeHeaderName(name);
    const normalizedValue = normalizeHeaderValue(value);

    this[NORMALIZED_HEADERS][normalizedName] =
      normalizeHeaderValue(normalizedValue);
    this[RAW_HEADER_NAMES].set(normalizedName, name);
  }

  /**
   * Traverses the `Headers` object,
   * calling the given callback for each header.
   */
  forEach<ThisArg = this>(
    callback: (
      this: ThisArg,
      value: string,
      name: string,
      parent: this,
    ) => void,
    thisArg?: ThisArg,
  ): void {
    for (const [name, value] of this.entries()) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      callback.call(thisArg, value, name, this);
    }
  }

  *keys(): IterableIterator<string> {
    for (const [name] of this.entries()) {
      yield name;
    }
  }

  *values(): IterableIterator<string> {
    for (const [, value] of this.entries()) {
      yield value;
    }
  }

  *entries(): IterableIterator<[string, string]> {
    // https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine
    const sortedKeys = Object.keys(this[NORMALIZED_HEADERS]).sort((a, b) =>
      a.localeCompare(b),
    );

    for (const name of sortedKeys) {
      if (name === "set-cookie") {
        for (const value of this.getSetCookie()) {
          yield [name, value];
        }
      } else {
        yield [name, this.get(name)!];
      }
    }
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }
}
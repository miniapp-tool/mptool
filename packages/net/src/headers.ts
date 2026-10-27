import { parseSetCookie, splitCookiesString } from "set-cookie-parser";

import { Cookie, isValidCookieName, isValidCookieValue } from "./cookie.js";
import type { CookieType } from "./typings.js";

const HEADERS_INVALID_CHARACTERS = /[^a-z0-9\-#$%&'*+.^_`|~]/iu;
const REMOVED_CHARS = String.fromCharCode(0x0a, 0x0d, 0x09, 0x20);
const HEADER_VALUE_REMOVE_REGEXP = new RegExp(`(^[${REMOVED_CHARS}]+|[${REMOVED_CHARS}]+$)`, "gu");

/**
 * Validate the given header name.
 *
 * @param value - The value to validate as a header name
 * @returns Whether the header name is valid
 * @see https://fetch.spec.whatwg.org/#header-name
 */
const isValidHeaderName = (value: unknown): boolean => {
  if (typeof value !== "string" || value.length === 0 || value.length > 128) return false;

  for (let i = 0; i < value.length; i++) {
    const character = value.charCodeAt(i);

    if (character > 0x7f || character === 0x20) return false;
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
 *
 * @param value - The value to validate as a header value
 * @returns Whether the header value is valid
 * @see https://fetch.spec.whatwg.org/#header-value
 */
const isValidHeaderValue = (value: unknown): boolean => {
  if (typeof value !== "string") return false;

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
 *
 * @param value - The header value to normalize
 * @returns The normalized header value
 * @see https://fetch.spec.whatwg.org/#concept-header-value-normalize
 */
const normalizeHeaderValue = (value: string): string =>
  value.replace(HEADER_VALUE_REMOVE_REGEXP, "");

const IP_ADDRESS_REGEXP = /^\d{1,3}(?:\.\d{1,3}){3}$/u;

/**
 * Whether a `Domain` attribute is acceptable for the given response host.
 *
 * @param cookieDomain - The `Domain` attribute value, a leading dot is allowed
 * @param host - The host that served the response
 * @returns Whether the cookie domain may be set
 * @see https://www.rfc-editor.org/rfc/rfc6265#section-5.3
 */
const isDomainAcceptable = (cookieDomain: string, host: string): boolean => {
  const domain = cookieDomain.replace(/^\.+/u, "").toLowerCase();
  const targetHost = host.replace(/^\.+/u, "").toLowerCase();

  if (!domain || !targetHost) return false;

  // An IP address host may only be matched exactly
  if (IP_ADDRESS_REGEXP.test(targetHost)) return domain === targetHost;

  // A cookie may be scoped to its own host or a parent domain, never a sibling
  if (domain === targetHost) return true;

  // RFC 6265 §5.1.3: the host must be a subdomain of the cookie domain
  if (!targetHost.endsWith(`.${domain}`)) return false;

  // Reject public suffixes such as `Domain=com`: a cookie scope needs at least two labels.
  // A full public suffix list is out of scope here, so this stays a conservative check.
  return domain.includes(".");
};

/**
 * Parse `Set-Cookie` header(s) into cookies.
 *
 * Cookies whose `Domain` attribute does not cover the response host are dropped, and cookies
 * without a `Domain` attribute are marked as host-only.
 *
 * @param setCookieHeader - The `Set-Cookie` header value
 * @param domain - The host that served the response
 * @returns The accepted cookies
 */
export const parseCookieHeader = (setCookieHeader: string, domain: string): Cookie[] =>
  parseSetCookie(setCookieHeader).flatMap((item) => {
    const { domain: cookieDomain } = item;

    // Invalid names / values would make `Headers.append("Cookie", …)` throw and drop the whole
    // cookie header, so reject the single bad cookie at the response boundary.
    if (!isValidCookieName(item.name) || !isValidCookieValue(item.value)) return [];

    // No `Domain` attribute: host-only cookie (RFC 6265 §5.3 step 6)
    if (!cookieDomain) return [new Cookie({ ...(item as CookieType), domain, hostOnly: true })];

    // Never let a response set a cookie for a domain it does not control
    if (!isDomainAcceptable(cookieDomain, domain)) return [];

    return [new Cookie({ ...(item as CookieType), hostOnly: false })];
  });

export type HeadersInit = [string, string][] | Record<string, string> | Headers;

export class Headers {
  // Normalized header {"name":"a, b"} storage.
  private headers: Record<string, string> = {};

  // Keeps the mapping between the raw header name
  // and the normalized header name to ease the lookup.
  private readonly headerNames = new Map<string, string>();

  constructor(init?: HeadersInit) {
    if (init instanceof Headers) {
      const initialHeaders = init;

      // oxlint-disable-next-line unicorn/no-array-method-this-argument
      initialHeaders.forEach((value, name) => {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(init)) {
      init.forEach(([name, value]) => {
        this.append(name, Array.isArray(value) ? value.join(", ") : value);
      });
    } else if (init) {
      Object.getOwnPropertyNames(init).forEach((name) => {
        const value = init[name];

        this.append(name, Array.isArray(value) ? value.join(", ") : value);
      });
    }
  }

  /**
   * Appends a new value onto an existing header inside a `Headers` object, or adds the header if it
   * does not already exist.
   *
   * @param name - The name of the header
   * @param value - The value to append
   */
  append(name: string, value: string): void {
    if (!isValidHeaderName(name)) throw new TypeError("Invalid character in header field name");
    if (!isValidHeaderValue(value)) throw new TypeError("Invalid character in header field value");

    const normalizedName = normalizeHeaderName(name);
    const normalizedValue = normalizeHeaderValue(value);

    const resolvedValue = this.has(normalizedName)
      ? `${this.get(normalizedName)}, ${normalizedValue}`
      : normalizedValue;

    this.set(name, resolvedValue);
  }

  /**
   * Deletes a header from the `Headers` object.
   *
   * @param name - The name of the header to delete
   */
  delete(name: string): void {
    if (!isValidHeaderName(name)) throw new TypeError("Invalid character in header field name");
    if (!this.has(name)) return;

    const normalizedName = normalizeHeaderName(name);

    // oxlint-disable-next-line typescript/no-dynamic-delete
    delete this.headers[normalizedName];
    this.headerNames.delete(normalizedName);
  }

  /**
   * Returns a `ByteString` sequence of all the values of a header with a given name.
   *
   * @param name - The name of the header
   * @returns The header value or null if not found
   */
  get(name: string): string | null {
    if (!isValidHeaderName(name)) throw new TypeError(`Invalid header name "${name}"`);

    return this.headers[normalizeHeaderName(name)] ?? null;
  }

  /**
   * Returns an array containing the values of all Set-Cookie headers associated with a response
   *
   * @returns An array of Set-Cookie header values
   */
  getSetCookie(): string[] {
    const setCookieHeader = this.get("set-cookie");

    // oxlint-disable-next-line eqeqeq
    if (setCookieHeader === null) return [];
    if (setCookieHeader === "") return [""];

    // oxlint-disable-next-line typescript/no-deprecated
    return splitCookiesString(setCookieHeader);
  }

  /**
   * Returns a boolean stating whether a `Headers` object contains a certain header.
   *
   * @param name - The name of the header to check
   * @returns Whether the header exists
   */
  has(name: string): boolean {
    if (!isValidHeaderName(name)) throw new TypeError(`Invalid header name "${name}"`);

    // oxlint-disable-next-line no-prototype-builtins
    return this.headers.hasOwnProperty(normalizeHeaderName(name));
  }

  /**
   * Sets a new value for an existing header inside a `Headers` object, or adds the header if it
   * does not already exist.
   *
   * @param name - The name of the header
   * @param value - The value to set
   */
  set(name: string, value: string): void {
    if (!isValidHeaderName(name)) throw new TypeError("Invalid character in header field name");
    if (!isValidHeaderValue(value)) throw new TypeError("Invalid character in header field value");

    const normalizedName = normalizeHeaderName(name);
    const normalizedValue = normalizeHeaderValue(value);

    this.headers[normalizedName] = normalizedValue;
    this.headerNames.set(normalizedName, name);
  }

  /**
   * Traverses the `Headers` object, calling the given callback for each header.
   *
   * @param callback - The callback function to call for each header
   * @param thisArg - The `this` value to use when calling the callback
   */
  forEach<ThisArg = this>(
    callback: (this: ThisArg, value: string, name: string, parent: this) => void,
    thisArg?: ThisArg,
  ): void {
    for (const [name, value] of this.entries()) {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      callback.call(thisArg!, value, name, this);
    }
  }

  *keys(): IterableIterator<string> {
    for (const [name] of this.entries()) yield name;
  }

  *values(): IterableIterator<string> {
    for (const [, value] of this.entries()) yield value;
  }

  *entries(): IterableIterator<[string, string]> {
    // https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine
    // `Object.keys()` returns unique names, so the comparator never sees two equal keys.
    const sortedKeys = Object.keys(this.headers).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : /* istanbul ignore next */ 0,
    );

    for (const name of sortedKeys) {
      if (name === "set-cookie") for (const value of this.getSetCookie()) yield [name, value];
      // oxlint-disable-next-line typescript/no-non-null-assertion
      else yield [name, this.get(name)!];
    }
  }

  toObject(): Record<string, string> {
    return { ...this.headers };
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }
}

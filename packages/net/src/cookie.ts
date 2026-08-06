import type { CookieType } from "./typings.js";
import { getCookieScopeDomain, normalizeDomain } from "./utils.js";

/**
 * Convert a date, treating an invalid date as a session cookie
 *
 * @param date The date to convert
 * @returns The valid date, or "session" if the date is invalid
 */
const toDate = (date: Date): Date | "session" => (Number.isNaN(date.getTime()) ? "session" : date);

/** Cookie 类 */
export class Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: Date | "session" | "outdate" = "session";
  httpOnly: boolean;

  constructor(cookie: CookieType) {
    this.name = cookie.name || "";
    this.value = cookie.value || "";
    this.domain = normalizeDomain(cookie.domain ?? "");
    this.path = cookie.path ?? "/";
    this.httpOnly = Boolean(cookie.httpOnly);
    this.expires = Number.isInteger(cookie.maxAge)
      ? // oxlint-disable-next-line typescript/no-non-null-assertion
        cookie.maxAge! > 0
        ? // oxlint-disable-next-line typescript/no-non-null-assertion
          new Date(Date.now() + cookie.maxAge! * 1000)
        : "outdate"
      : cookie.expires
        ? toDate(new Date(cookie.expires))
        : "session";
  }

  /** @returns 是否已过期 */
  isExpired(): boolean {
    return (
      this.expires === "outdate" ||
      (this.expires instanceof Date &&
        // Fallback: an invalid date is treated as expired
        (Number.isNaN(this.expires.getTime()) || new Date() > this.expires))
    );
  }

  /** @returns 是否可持久化 */
  isPersistence(): boolean {
    return this.expires !== "session";
  }

  /**
   * @param domain 域名
   * @returns 是否匹配
   */
  isDomainMatched(domain: string): boolean {
    return getCookieScopeDomain(domain).includes(this.domain);
  }

  /**
   * @param path 路径
   * @returns 是否匹配
   */
  isPathMatched(path: string): boolean {
    // RFC 6265 §5.1.4: cookie-path matches request-path if they are identical,
    // or cookie-path is a prefix of request-path followed by a "/" separator,
    // or cookie-path ends with "/" and is a prefix of request-path.
    return (
      this.path.replace(/\/$/u, "") === path ||
      (path.startsWith(this.path) && (this.path.endsWith("/") || path[this.path.length] === "/"))
    );
  }

  toString(): string {
    return `${this.name}=${this.value}`;
  }

  toJSON(): CookieType {
    const cookieType: CookieType = {
      name: this.name,
      value: this.value,
      domain: this.domain,
    };

    if (this.path !== "/") cookieType.path = this.path;
    if (this.httpOnly) cookieType.httpOnly = this.httpOnly;
    if (this.expires instanceof Date) cookieType.expires = this.expires;

    return cookieType;
  }
}

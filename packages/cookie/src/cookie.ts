import { type CookieType } from "./typings.js";
import { getCookieScopeDomain } from "./utils.js";

/**
 * Cookie 类
 */
export class Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number | "session" | "outdate" = "session";
  httpOnly: boolean;

  constructor(cookie: CookieType) {
    this.name = cookie.name || "";
    this.value = cookie.value || "";
    this.domain = cookie.domain || "";
    this.path = cookie.path || "/";
    this.httpOnly = Boolean(cookie.httpOnly);
    this.expires = Number.isInteger(cookie.maxAge)
      ? cookie.maxAge! > 0
        ? new Date().getTime() + cookie.maxAge! * 1000
        : "outdate"
      : cookie.expires?.getTime() ?? "session";
  }

  /**
   * @returns 是否已过期
   */
  isExpired(): boolean {
    return (
      this.expires === "outdate" ||
      (typeof this.expires === "number" && new Date().getTime() > this.expires)
    );
  }

  /**
   * @returns 是否可持久化
   */
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
    return path.startsWith(this.path) || this.path.replace(/\/$/, "") === path;
  }

  toString(): string {
    return `${this.name}=${this.value}`;
  }
}

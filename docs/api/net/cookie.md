# Cookie

```ts
interface CookieType {
  /**
   * cookie name
   */
  name: string;
  /**
   * cookie value
   */
  value: string;
  /**
   * cookie path
   */
  path?: string | undefined;
  /**
   * absolute expiration date for the cookie
   */
  expires?: Date | undefined;
  /**
   * relative max age of the cookie in seconds from when the client receives it (integer or undefined)
   * Note: when using with express's res.cookie() method, multiply maxAge by 1000 to convert to milliseconds
   */
  maxAge?: number | undefined;
  /**
   * domain for the cookie,
   * may begin with "." to indicate the named domain or any subdomain of it
   */
  domain?: string | undefined;
  /**
   * indicates that this cookie should only be sent over HTTPs
   */
  secure?: boolean | undefined;
  /**
   * indicates that this cookie should not be accessible to client-side JavaScript
   */
  httpOnly?: boolean | undefined;
  /**
   * indicates a cookie ought not to be sent along with cross-site requests
   */
  sameSite?: string | undefined;
}

/**
 * Cookie 类
 */
class Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number | "session" | "outdate";
  httpOnly: boolean;
  constructor(cookie: CookieType);
  /**
   * @returns 是否已过期
   */
  isExpired(): boolean;
  /**
   * @returns 是否可持久化
   */
  isPersistence(): boolean;
  /**
   * @param domain 域名
   * @returns 是否匹配
   */
  isDomainMatched(domain: string): boolean;
  /**
   * @param path 路径
   * @returns 是否匹配
   */
  isPathMatched(path: string): boolean;
  toString(): string;
  toJSON(): CookieType;
}
```

# CookieStore

Cookies are stored as `(name, domain, path)` triples, so cookies with the same name but different paths can coexist. `getCookies()` sorts according to RFC 6265 §5.4: a longer path comes first, and when path lengths are equal, an earlier creation time comes first; `get()` / `getValue()` return the first match in that order, and `getHeader()` joins cookies with the same name in the same order.

Storage reads and writes are optimized: persisted cookies are loaded only on the first read or write, and multiple changes within the same microtask write to Storage once. A single cookie larger than 4096 bytes is dropped; a domain is capped at 50 cookies and the total at 3000 (RFC 6265 §6.1). When the limit is exceeded, the cookies with the earliest creation time are evicted.

```ts
type CookieOptions =
  | string
  | {
      domain?: string;
      path?: string;
    };

// A string must be an absolute URL or a domain (such as "https://example.com/api" or "example.com");
// bare paths without a domain, such as `"/"` or `"/api"`, throw a TypeError.
// When you only know the path, use the object form `{ path: "/api" }`: an empty domain means no domain restriction.

interface SetCookieOptions {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
}

class CookieStore {
  constructor(
    /** Storage key */
    key?: string,
  );
  /**
   * Get a cookie object
   *
   * @param name Cookie name
   * @param options Cookie options
   * @returns Cookie object
   */
  get(name: string, options: CookieOptions): Cookie | null;
  /**
   * Get a cookie value
   *
   * @param name Cookie name
   * @param options Cookie options
   * @returns Cookie value
   */
  getValue(name: string, options: CookieOptions): string | undefined;
  /**
   * Check whether a specific cookie exists
   *
   * @param name Cookie name
   * @param options Cookie options
   * @returns Whether it exists
   */
  has(name: string, options: CookieOptions): boolean;
  /** Set a cookie */
  set(cookieOptions: SetCookieOptions): Cookie;
  /**
   * Delete a cookie
   *
   * @param name Cookie name
   * @param domain Cookie domain
   * @param path Cookie path; when omitted, deletes cookies with this name on all paths
   */
  delete(name: string, domain?: string, path?: string): void;
  /** Get the structure of all domains and cookies */
  list(): Record<string, Record<string, string>>;
  /**
   * Get an array of cookie objects
   *
   * The result is sorted according to RFC 6265 §5.4.
   *
   * @param options Cookie options
   * @returns Array of cookie objects
   */
  getCookies(options?: CookieOptions): Cookie[];
  /**
   * Get all cookie objects
   *
   * @returns Array of cookie objects
   */
  getAllCookies(): Cookie[];
  /**
   * Get a cookies key/value object
   *
   * @returns Key/value Map
   */
  getCookiesMap(options: CookieOptions): Record<string, string>;
  /**
   * Apply cookies
   *
   * @param cookies Cookies to set
   */
  apply(cookies: Cookie[]): void;
  /**
   * Clear cookies
   *
   * @param domain The specified domain
   */
  clear(domain?: string, exact = false): void;
  /**
   * Apply header cookies
   *
   * @param header Mini-program response header
   * @param domainOrURL URL or domain
   */
  applyHeader(header: unknown, domainOrURL: string): void;
  /**
   * Apply response cookies
   *
   * @param response Mini-program response
   * @param domainOrURL URL or domain
   */
  applyResponse(response: unknown, domainOrURL: string): void;
  /**
   * Get the request cookie header
   *
   * @param options Cookie options
   * @returns Request cookie header
   */
  getHeader(options: CookieOptions): string;
}
```

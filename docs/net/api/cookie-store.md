# CookieStore

Cookie 以 `(name, domain, path)` 三元组存储，同名但路径不同的 Cookie 可以共存。`getCookies()` 按 RFC 6265 §5.4 排序：path 更长者优先，path 长度相同时创建时间更早者优先；`get()` / `getValue()` 返回排序后的第一条匹配项，`getHeader()` 也按相同顺序拼接同名 Cookie。

Storage 读写经过优化：首次读写时才加载持久化 Cookie，同一 microtask 内的多次变更只写一次 Storage；单条 Cookie 超过 4096 字节会被丢弃，单域名上限 50 条、总量上限 3000 条（RFC 6265 §6.1），超出时淘汰创建时间最早的 Cookie。

```ts
type CookieOptions =
  | string
  | {
      domain?: string;
      path?: string;
    };

// 字符串形式必须是绝对 URL 或域名（如 "https://example.com/api"、"example.com"）；
// `"/"`、`"/api"` 这类不含域名的纯路径会抛 TypeError。
// 只知道路径时使用对象形式 `{ path: "/api" }`：domain 留空表示不限制域名。

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
    /** 存储键值 */
    key?: string,
  );
  /**
   * 获取 Cookie 对象
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @returns Cookie 对象
   */
  get(name: string, options: CookieOptions): Cookie | null;
  /**
   * 获取 Cookie 值
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @returns Cookie 值
   */
  getValue(name: string, options: CookieOptions): string | undefined;
  /**
   * 是否有特定的 Cookie
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @returns 是否存在
   */
  has(name: string, options: CookieOptions): boolean;
  /** 设置 cookie */
  set(cookieOptions: SetCookieOptions): Cookie;
  /**
   * 删除 cookie
   *
   * @param name Cookie 名称
   * @param domain 域名
   * @param path 路径，不填则删除该名称下所有路径的 Cookie
   */
  delete(name: string, domain?: string, path?: string): void;
  /** 获取所有域名和 cookies 结构 */
  list(): Record<string, Record<string, string>>;
  /**
   * 获取 cookies 对象数组
   *
   * 返回结果按 RFC 6265 §5.4 排序。
   *
   * @param options Cookie 选项
   * @returns Cookie 对象数组
   */
  getCookies(options?: CookieOptions): Cookie[];
  /**
   * 获取所有 cookies 对象
   *
   * @returns Cookie 对象数组
   */
  getAllCookies(): Cookie[];
  /**
   * 获取 cookies key/value 对象
   *
   * @returns 键值 Map
   */
  getCookiesMap(options: CookieOptions): Record<string, string>;
  /**
   * 应用 Cookies
   *
   * @param cookies 待设置的 Cookie 数组
   */
  apply(cookies: Cookie[]): void;
  /**
   * 清除 cookies
   *
   * @param domain 指定域名
   */
  clear(domain?: string, exact = false): void;
  /**
   * 应用 header cookies
   *
   * @param header 小程序 response header
   * @param domainOrURL Url 或域名
   */
  applyHeader(header: unknown, domainOrURL: string): void;
  /**
   * 应用响应 cookies
   *
   * @param response 小程序 response
   * @param domainOrURL Url 或域名
   */
  applyResponse(response: unknown, domainOrURL: string): void;
  /**
   * 获取 request cookie header
   *
   * @param options Cookie 选项
   * @returns Request cookie header
   */
  getHeader(options: CookieOptions): string;
}
```

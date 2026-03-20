# CookieStore

```ts
type CookieOptions =
  | string
  | {
      domain?: string;
      path?: string;
    };

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
   * @returns cookie 对象
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
  /**
   * 设置 cookie
   */
  set(cookieOptions: SetCookieOptions): Cookie;
  /**
   * 删除 cookie
   *
   * @param name cookie 名称
   * @param domain 域名
   */
  delete(name: string, domain?: string): void;
  /**
   * 获取所有域名和 cookies 结构
   */
  list(): Record<string, Record<string, string>>;
  /**
   * 获取 cookies 对象数组
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
  applyHeader(header: WechatMiniprogram.IAnyObject, domainOrURL: string): void;
  /**
   * 应用响应 cookies
   *
   * @param response 小程序 response
   * @param domainOrURL Url 或域名
   */
  applyResponse(
    response: WechatMiniprogram.RequestSuccessCallbackResult,
    domainOrURL: string,
  ): void;
  /**
   * 获取 request cookie header
   *
   * @param options Cookie 选项
   * @returns request cookie header
   */
  getHeader(options: CookieOptions): string;
}
```

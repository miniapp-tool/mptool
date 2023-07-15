# CookieStore

```ts
class CookieStore {
  key: string;
  private store;
  constructor(key?: string);
  /**
   * 获取 Cookie 对象
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @return cookie 对象
   */
  get(name: string, options: CookeStoreOptions): Cookie | null;
  /**
   * 获取 Cookie 值
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @return Cookie 值
   */
  getValue(name: string, options: CookeStoreOptions): string | undefined;
  /**
   * 是否有特定的 Cookie
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @return 是否存在
   */
  has(name: string, options: CookeStoreOptions): boolean;
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
  values(): Record<string, Record<string, string>>;
  /**
   * 获取 cookies 对象数组
   *
   * @param options Cookie 选项
   * @return Cookie 对象数组
   */
  getCookies(options?: CookeStoreOptions): Cookie[];
  /**
   * 获取 cookies key/value 对象
   *
   * @return 键值 Map
   */
  getCookiesMap(options: CookeStoreOptions): Record<string, string>;
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
  clear(domain?: string): void;
  /**
   * 设置 response cookies
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
   * @return request cookie header
   */
  getHeader(options: CookeStoreOptions): string;
}
```

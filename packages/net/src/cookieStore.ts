import { env } from "@mptool/shared";

import { Cookie } from "./cookie.js";
import { parseCookieHeader } from "./headers.js";
import type { CookieType } from "./typings.js";
import type { CookieOptions } from "./utils.js";
import { getCookieScopeDomain, getDomain, getUrlInfo, normalizeDomain } from "./utils.js";

/** Cookies of one name, keyed by path / 同一名称的 Cookie，按路径存储 */
export type CookiePathMap = Map<string, Cookie>;
/** Cookies of one domain, keyed by name / 同一域名的 Cookie，按名称存储 */
export type CookieMap = Map<string, CookiePathMap>;
export type CookieStoreType = Map<string, CookieMap>;

/**
 * Order cookies by RFC 6265 §5.4: a longer path comes first, cookies with the same path length keep
 * their creation order (earlier first).
 *
 * 按 RFC 6265 §5.4 排序：path 更长者优先；path 长度相同时创建时间更早者优先。
 *
 * @param a - First cookie / 第一个 Cookie
 * @param b - Second cookie / 第二个 Cookie
 * @returns The comparison result / 比较结果
 */
const compareCookiePriority = (a: Cookie, b: Cookie): number =>
  b.path.length - a.path.length || a.createdAt - b.createdAt;

export interface SetCookieOptions {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
}

/** CookieStore 类 */
export class CookieStore {
  private readonly store: CookieStoreType = new Map();

  constructor(
    /** 存储键值 */
    private readonly key = "__cookie_store__",
  ) {
    this.#init();
  }

  /**
   * 获取 Cookie 对象
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @returns Cookie 对象
   */
  get(name: string, options: CookieOptions): Cookie | null {
    return this.getCookies(options).find((cookie) => cookie.name === name) ?? null;
  }

  /**
   * 获取 Cookie 值
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @returns Cookie 值
   */
  getValue(name: string, options: CookieOptions): string | undefined {
    return this.get(name, options)?.value;
  }

  /**
   * 是否有特定的 Cookie
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @returns 是否存在
   */
  has(name: string, options: CookieOptions): boolean {
    // 返回是否存在 cookie 值
    return Boolean(this.get(name, options));
  }

  /**
   * 设置 cookie
   *
   * @param cookieOptions Cookie 选项
   * @returns 设置的 cookie 对象
   */
  set(cookieOptions: SetCookieOptions): Cookie {
    const cookie = new Cookie(cookieOptions);

    this.#storeCookie(cookie);
    this.#save();

    return cookie;
  }

  /**
   * 删除 cookie
   *
   * @param name Cookie 名称
   * @param domain 域名
   * @param path Cookie 路径，不填则删除该名称下所有路径的 Cookie
   */
  delete(name: string, domain = "", path = ""): void {
    const deleteFrom = (cookieMap: CookieMap): void => {
      const pathCookies = cookieMap.get(name);

      if (!pathCookies) return;

      if (path) pathCookies.delete(path);
      else cookieMap.delete(name);

      if (pathCookies.size === 0) cookieMap.delete(name);
    };

    if (domain) {
      const domainCookieMap = this.store.get(normalizeDomain(domain));

      if (domainCookieMap) deleteFrom(domainCookieMap);
    } else {
      for (const cookies of this.store.values()) deleteFrom(cookies);
    }

    this.#save();
  }

  /**
   * 获取所有域名和 cookies 结构
   *
   * @returns 域名和 cookies 结构对象
   */
  list(): Record<string, Record<string, string>> {
    const dirObj: Record<string, Record<string, string>> = {};

    for (const domain of this.store.keys()) dirObj[domain] = this.getCookiesMap(domain);

    return dirObj;
  }

  /**
   * 获取 cookies 对象数组
   *
   * @param options Cookie 选项
   * @returns Cookie 对象数组
   */
  getCookies(options: CookieOptions): Cookie[] {
    const { domain, path } = getUrlInfo(options);
    const scopeDomains = getCookieScopeDomain(domain);
    const cookies: { cookie: Cookie; index: number }[] = [];
    let index = 0;

    for (const [key, cookieMap] of this.store.entries()) {
      if (domain && !scopeDomains.includes(key)) continue;

      for (const pathCookies of cookieMap.values()) {
        for (const cookie of pathCookies.values()) {
          if (cookie.isPathMatched(path) && cookie.isDomainMatched(domain) && !cookie.isExpired()) {
            cookies.push({ cookie, index });
            index += 1;
          }
        }
      }
    }

    // RFC 6265 §5.4: longer paths first, then earlier creation time. The index keeps the order
    // deterministic when several cookies were created in the same millisecond.
    return cookies
      .sort((a, b) => compareCookiePriority(a.cookie, b.cookie) || a.index - b.index)
      .map(({ cookie }) => cookie);
  }

  /**
   * 获取所有 cookies 对象
   *
   * @returns Cookie 对象数组
   */
  getAllCookies(): Cookie[] {
    const cookies: Cookie[] = [];

    this.store.forEach((cookieMap) => {
      cookieMap.forEach((pathCookies) => {
        pathCookies.forEach((cookie) => {
          if (!cookie.isExpired()) cookies.push(cookie);
        });
      });
    });

    return cookies;
  }

  /**
   * 获取 cookies key/value 对象
   *
   * @param options Cookie 选项
   * @returns 键值 Map
   */
  getCookiesMap(options: CookieOptions): Record<string, string> {
    // 将 cookie 值添加到对象
    const map: Record<string, string> = {};
    // getCookies() is already ordered by RFC 6265 §5.4, so the most specific cookie wins
    this.getCookies(options).forEach(({ name, value }) => {
      map[name] ??= value;
    });
    return map;
  }

  /**
   * 应用 Cookies
   *
   * @param cookies 待设置的 Cookie 数组
   */
  apply(cookies: Cookie[]): void {
    // Cookie 数组转换 Map 对象
    cookies.forEach((cookie) => {
      this.#storeCookie(cookie);
    });

    // 保存到 Storage
    this.#save();
  }

  /**
   * 清除 cookies
   *
   * @param domain 指定域名
   * @param exact 是否仅清除指定域名的 cookies，默认为 false，即同时清除指定域名和其子域名的 cookies
   */
  clear(domain = "", exact = false): void {
    if (domain) {
      const normalizedDomain = normalizeDomain(domain);

      // store 键统一为归一化域名（带前导点）
      this.store.delete(normalizedDomain);

      // 同时清除子域名 cookies
      if (!exact) {
        const scopedKeys = [...this.store.keys()].filter(
          (key) => key !== normalizedDomain && key.endsWith(normalizedDomain),
        );

        for (const key of scopedKeys) this.store.delete(key);
      }
    } else {
      this.store.clear();
    }

    // 保存到 Storage
    this.#save();
  }

  /**
   * 应用 header cookies
   *
   * @param header 小程序 response header
   * @param domainOrURL Url 或域名
   */
  applyHeader(header: unknown, domainOrURL: string): void {
    if (env === "js") {
      this.apply(
        parseCookieHeader((header as Headers).getSetCookie().join(","), getDomain(domainOrURL)),
      );
      return;
    }

    const setCookieHeader =
      // oxlint-disable-next-line typescript/strict-boolean-expressions
      (header as Record<string, string[] | string>)["Set-Cookie"] ||
      // oxlint-disable-next-line typescript/strict-boolean-expressions
      (header as Record<string, string[] | string>)["set-cookie"] ||
      "";
    const realHeader = Array.isArray(setCookieHeader)
      ? setCookieHeader.filter(Boolean).join(",")
      : env === "qq"
        ? setCookieHeader.replace(
            /;((?!Path|Expires|Max-Age|Domain|Path|SameSite)[^\s;]*?)=/giu,
            ",$1=",
          )
        : setCookieHeader;

    this.apply(parseCookieHeader(realHeader, getDomain(domainOrURL)));
  }

  /**
   * 应用响应 cookies
   *
   * @param response 小程序 response
   * @param domainOrURL Url 或域名
   */
  applyResponse(response: unknown, domainOrURL: string): void {
    this.applyHeader(
      env === "js"
        ? (response as Response).headers
        : (response as WechatMiniprogram.RequestSuccessCallbackResult).header,
      domainOrURL,
    );
  }

  /**
   * 获取 request cookie header
   *
   * @param options Cookie 选项
   * @returns Request cookie header
   */
  getHeader(options: CookieOptions): string {
    // 转化为 request cookies 字符串
    return this.getCookies(options)
      .map((item) => item.toString())
      .join("; ");
  }

  /**
   * 将 Cookie 写入 store
   *
   * A cookie is identified by the `(name, domain, path)` triple, so cookies with the same name on
   * different paths no longer overwrite each other.
   *
   * 按 `(name, domain, path)` 三元组存储 Cookie，同名不同 path 的 Cookie 不再互相覆盖。
   *
   * @param cookie Cookie 对象
   */
  #storeCookie(cookie: Cookie): void {
    let cookieMap = this.store.get(cookie.domain);

    if (!cookieMap) {
      cookieMap = new Map();
      this.store.set(cookie.domain, cookieMap);
    }

    let pathCookies = cookieMap.get(cookie.name);

    if (!pathCookies) {
      pathCookies = new Map();
      cookieMap.set(cookie.name, pathCookies);
    }

    // RFC 6265 §5.3: updating a stored cookie keeps its original creation time
    const existing = pathCookies.get(cookie.path);

    if (existing) cookie.createdAt = existing.createdAt;

    pathCookies.set(cookie.path, cookie);
  }

  /** 从 Storage 读取 cookies */
  #init(): void {
    try {
      // 从本地存储读取 cookie 数据数组
      let cookiesData: CookieType[] = [];

      if (env !== "js") {
        const data = wx.getStorageSync<CookieType[] | undefined>(this.key);

        if (Array.isArray(data)) cookiesData = data;
      }

      // 转化为 cookie map 对象
      this.apply(cookiesData.map((item) => new Cookie(item)));
    } catch (err) {
      console.warn("Error applying cookie storage", err);
    }
  }

  /**
   * 清理过期 Cookie 并返回需要持久化的 Cookie
   *
   * Prune expired cookies and collect the persistable ones.
   *
   * @returns Persistable cookies / 需要持久化的 Cookie
   */
  #collectPersistedCookies(): Cookie[] {
    const saveCookies: Cookie[] = [];

    for (const [domain, cookieMap] of this.store) {
      for (const [name, pathCookies] of cookieMap) {
        for (const [path, cookie] of pathCookies) {
          if (cookie.isExpired()) pathCookies.delete(path);
          // 只存储可持久化 cookie
          else if (cookie.isPersistence()) saveCookies.push(cookie);
        }

        if (pathCookies.size === 0) cookieMap.delete(name);
      }

      if (cookieMap.size === 0) this.store.delete(domain);
    }

    return saveCookies;
  }

  /** 将 cookies 保存到 Storage */
  #save(): void {
    try {
      const saveCookies = this.#collectPersistedCookies();

      // 保存到本地存储
      if (env !== "js") wx.setStorageSync(this.key, saveCookies);
    } catch (err) {
      console.warn("Error setting cookies", err);
    }
  }
}

import { env } from "@mptool/shared";

import { Cookie } from "./cookie.js";
import { parseCookieHeader } from "./headers.js";
import type { CookieType } from "./typings.js";
import type { CookieOptions } from "./utils.js";
import { getCookieScopeDomain, getDomain, getUrlInfo, normalizeDomain } from "./utils.js";

export type CookieMap = Map<string, Cookie>;
export type CookieStoreType = Map<string, CookieMap>;

export interface SetCookieOptions {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
}

/**
 * CookieStore 类
 */
export class CookieStore {
  private store: CookieStoreType = new Map();

  constructor(
    /** 存储键值 */
    private key = "__cookie_store__",
  ) {
    this.#init();
  }

  /**
   * 获取 Cookie 对象
   *
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @returns cookie 对象
   */
  get(name: string, options: CookieOptions): Cookie | null {
    const { domain, path } = getUrlInfo(options);
    const scopeDomains = getCookieScopeDomain(domain);

    for (const [key, cookies] of this.store.entries()) {
      if (domain && !scopeDomains.includes(key)) continue;
      const cookie = cookies.get(name);

      if (cookie && cookie.isPathMatched(path) && !cookie.isExpired()) return cookie;
    }

    return null;
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
   * @returns Cookie 对象
   */
  set(cookieOptions: SetCookieOptions): Cookie {
    const { name, domain } = cookieOptions;
    const cookie = new Cookie(cookieOptions);

    const cookies = this.store.get(domain) ?? new Map<string, Cookie>();

    cookies.set(name, cookie);
    this.store.set(domain, cookies);

    this.#save();

    return cookie;
  }

  /**
   * 删除 cookie
   *
   * @param name cookie 名称
   * @param domain 域名
   */
  delete(name: string, domain = ""): void {
    if (domain) {
      const exactCookieMap = this.store.get(domain);

      if (exactCookieMap) exactCookieMap.delete(name);

      const domainCookieMap = this.store.get(normalizeDomain(domain));

      if (domainCookieMap) domainCookieMap.delete(name);
    } else {
      for (const cookies of this.store.values()) cookies.delete(name);
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
    const cookies = [];

    for (const [key, cookieMap] of this.store.entries()) {
      if (domain && !scopeDomains.includes(key)) continue;

      for (const cookie of cookieMap.values())
        if (cookie.isPathMatched(path) && !cookie.isExpired()) cookies.push(cookie);
    }

    return cookies;
  }

  /**
   * 获取所有 cookies 对象
   *
   * @returns Cookie 对象数组
   */
  getAllCookies(): Cookie[] {
    const cookies = [];

    for (const cookieMap of this.store.values())
      for (const cookie of cookieMap.values()) if (!cookie.isExpired()) cookies.push(cookie);

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
    return Object.fromEntries(this.getCookies(options).map(({ name, value }) => [name, value]));
  }

  /**
   * 应用 Cookies
   *
   * @param cookies 待设置的 Cookie 数组
   */
  apply(cookies: Cookie[]): void {
    // Cookie 数组转换 Map 对象
    cookies.forEach((cookie) => {
      let cookieMap = this.store.get(cookie.domain);

      if (!cookieMap) {
        cookieMap = new Map();
        this.store.set(cookie.domain, cookieMap);
      }
      cookieMap.set(cookie.name, cookie);
    });

    // 保存到 Storage
    this.#save();
  }

  /**
   * 清除 cookies
   *
   * @param domain 指定域名
   * @param exact 是否仅清除精确域名
   */
  clear(domain = "", exact = false): void {
    if (domain) {
      const exactCookieMap = this.store.get(domain);

      if (exactCookieMap) exactCookieMap.clear();

      if (!exact) {
        const domainCookieMap = this.store.get(normalizeDomain(domain));

        if (domainCookieMap) domainCookieMap.clear();
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
        ? setCookieHeader.replaceAll(
            /;((?!Path|Expires|Max-Age|Domain|Path|SameSite)[^\s;]*?)=/gi,
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
   * @returns request cookie header
   */
  getHeader(options: CookieOptions): string {
    // 转化为 request cookies 字符串
    return this.getCookies(options)
      .map((item) => item.toString())
      .join("; ");
  }

  /**
   * 从 Storage 读取 cookies
   */
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
   * 将 cookies 保存到 Storage
   */
  #save(): void {
    try {
      const saveCookies = [];

      // 获取需要持久化的 cookie
      // 清除无效 cookie
      for (const cookies of this.store.values())
        for (const cookie of cookies.values())
          if (cookie.isExpired()) cookies.delete(cookie.name);
          // 只存储可持久化 cookie
          else if (cookie.isPersistence()) saveCookies.push(cookie);

      // 保存到本地存储
      if (env !== "js") wx.setStorageSync(this.key, saveCookies);
    } catch (err) {
      console.warn("Error setting cookies", err);
    }
  }
}

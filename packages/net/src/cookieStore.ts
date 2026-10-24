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

/** RFC 6265 §6.1 recommends at least 4096 bytes per cookie / 单条 Cookie 的最小容量建议 */
const MAX_COOKIE_SIZE = 4096;
/** RFC 6265 §6.1 recommends at least 50 cookies per domain / 每个域名的最小容量建议 */
const MAX_COOKIES_PER_DOMAIN = 50;
/** RFC 6265 §6.1 recommends at least 3000 cookies in total / Cookie 总量的最小容量建议 */
const MAX_COOKIES = 3000;

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

/**
 * Get the UTF-8 byte length of a string.
 *
 * 获取字符串的 UTF-8 字节长度。
 *
 * @param value - The string / 字符串
 * @returns Byte length / 字节长度
 */
const getUtf8ByteLength = (value: string): number => {
  let length = 0;

  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint < 0x80) length += 1;
    else if (codePoint < 0x800) length += 2;
    else if (codePoint < 0x10000) length += 3;
    else length += 4;
  }

  return length;
};

/**
 * Estimate the serialized size of a cookie (name, value, domain and path).
 *
 * 估算 Cookie 的序列化大小（名称、值、域名与路径）。
 *
 * @param cookie - The cookie / Cookie 对象
 * @returns Size in bytes / 字节大小
 */
const getCookieSize = (cookie: Cookie): number =>
  getUtf8ByteLength(`${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}`);

/**
 * Count the cookies of one domain.
 *
 * 统计单个域名的 Cookie 数量。
 *
 * @param cookieMap - Cookies of one domain / 同一域名的 Cookie
 * @returns Number of cookies / Cookie 数量
 */
const countCookies = (cookieMap: CookieMap): number => {
  let count = 0;

  for (const pathCookies of cookieMap.values()) count += pathCookies.size;

  return count;
};

/**
 * Delete the oldest cookie of one domain.
 *
 * 删除单个域名下创建时间最早的 Cookie。
 *
 * @param cookieMap - Cookies of one domain / 同一域名的 Cookie
 * @returns Whether a cookie was removed / 是否删除了 Cookie
 */
const deleteOldestInDomain = (cookieMap: CookieMap): boolean => {
  let oldestName = "";
  let oldestPath = "";
  let oldestCookie: Cookie | undefined;

  for (const [name, pathCookies] of cookieMap) {
    for (const [path, cookie] of pathCookies) {
      if (!oldestCookie || cookie.createdAt < oldestCookie.createdAt) {
        oldestName = name;
        oldestPath = path;
        oldestCookie = cookie;
      }
    }
  }

  if (!oldestCookie) return false;

  const pathCookies = cookieMap.get(oldestName);

  pathCookies?.delete(oldestPath);

  if (pathCookies?.size === 0) cookieMap.delete(oldestName);

  return true;
};

export interface SetCookieOptions {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: CookieType["sameSite"];
}

/**
 * CookieStore 类
 *
 * Storage access is optimized for mini-program runtimes: the persisted cookies are loaded lazily on
 * the first operation, and all mutations in the same microtask are merged into a single synchronous
 * storage write. Cookies beyond the RFC 6265 §6.1 capacity minimums are dropped or evicted.
 *
 * 针对小程序运行时优化 storage 访问：首次操作时才加载持久化 Cookie，同一 microtask 内的多次变更 合并为一次同步写入；超出 RFC 6265 §6.1 最小容量建议的
 * Cookie 会被丢弃或淘汰。
 */
export class CookieStore {
  private readonly store: CookieStoreType = new Map();

  /** Whether the persisted cookies have been loaded / 是否已加载持久化 Cookie */
  private initialized = false;

  /** Whether a storage flush is already scheduled / 是否已安排 storage 写入 */
  private saveScheduled = false;

  constructor(
    /** 存储键值 */
    private readonly key = "__cookie_store__",
  ) {}

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
    this.#ensureInitialized();

    const cookie = new Cookie(cookieOptions);

    this.#storeCookie(cookie);
    this.#scheduleSave();

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
    this.#ensureInitialized();

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

    this.#scheduleSave();
  }

  /**
   * 获取所有域名和 cookies 结构
   *
   * @returns 域名和 cookies 结构对象
   */
  list(): Record<string, Record<string, string>> {
    this.#ensureInitialized();

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
    this.#ensureInitialized();

    const { domain, path } = getUrlInfo(options);
    const scopeDomains = getCookieScopeDomain(domain);
    // `Secure` cookies are never sent over an insecure scheme. Normal requests are HTTPS; this
    // guard matters for devtools and for cookies persisted before the attribute was supported.
    const isSecureRequest =
      typeof options !== "string" || !options.toLowerCase().startsWith("http://");
    const cookies: { cookie: Cookie; index: number }[] = [];
    let index = 0;

    for (const [key, cookieMap] of this.store.entries()) {
      if (domain && !scopeDomains.includes(key)) continue;

      for (const pathCookies of cookieMap.values()) {
        for (const cookie of pathCookies.values()) {
          if (
            cookie.isPathMatched(path) &&
            cookie.isDomainMatched(domain) &&
            !cookie.isExpired() &&
            (isSecureRequest || !cookie.secure)
          ) {
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
    this.#ensureInitialized();

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
    this.#ensureInitialized();

    // Nothing to apply: avoid scheduling a useless storage write
    if (cookies.length === 0) return;

    // Cookie 数组转换 Map 对象
    cookies.forEach((cookie) => {
      this.#storeCookie(cookie);
    });

    this.#scheduleSave();
  }

  /**
   * 清除 cookies
   *
   * @param domain 指定域名
   * @param exact 是否仅清除指定域名的 cookies，默认为 false，即同时清除指定域名和其子域名的 cookies
   */
  clear(domain = "", exact = false): void {
    this.#ensureInitialized();

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

    this.#scheduleSave();
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
    // RFC 6265 §6.1: drop the new value when a single cookie is too large
    if (getCookieSize(cookie) > MAX_COOKIE_SIZE) return;

    // An expired cookie removes the stored one instead of occupying a slot / 过期 Cookie 用于删除已有值
    if (cookie.isExpired()) {
      const expiredCookieMap = this.store.get(cookie.domain);
      const expiredPathCookies = expiredCookieMap?.get(cookie.name);

      expiredPathCookies?.delete(cookie.path);

      if (expiredPathCookies?.size === 0) expiredCookieMap?.delete(cookie.name);
      if (expiredCookieMap?.size === 0) this.store.delete(cookie.domain);

      return;
    }

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

    this.#enforceLimits(cookie.domain);
  }

  /**
   * Load the persisted cookies on first use
   *
   * Reading lazily means that importing `@mptool/net` (which creates the module level
   * `requestCookieStore`) does not hit the synchronous mini-program storage at startup.
   *
   * 首次使用时才从 Storage 读取 Cookie：这样导入 `@mptool/net`（会创建模块级的 `requestCookieStore`）不会在启动阶段触发同步 storage
   * 读取。
   */
  #ensureInitialized(): void {
    if (this.initialized) return;

    this.initialized = true;

    try {
      let cookiesData: CookieType[] = [];

      if (env !== "js") {
        const data = wx.getStorageSync<CookieType[] | undefined>(this.key);

        if (Array.isArray(data)) cookiesData = data;
      }

      // Restore without scheduling a write: reading the storage must not write it back
      for (const item of cookiesData) {
        const cookie = new Cookie(item);

        if (!cookie.isExpired()) this.#storeCookie(cookie);
      }
    } catch (err) {
      console.warn("Error applying cookie storage", err);
    }
  }

  /**
   * Schedule a batched storage write
   *
   * Every mutation in the same microtask is merged into one `wx.setStorageSync` call: a cookie jar
   * usually changes several times while a response is applied, and synchronous storage writes are a
   * main source of mini-program jank.
   *
   * 同一 microtask 内的所有变更合并为一次 `wx.setStorageSync`：一次响应通常会产生多次 Cookie 变更， 而同步 storage
   * 写入是小程序卡顿的主要原因之一。
   */
  #scheduleSave(): void {
    if (this.saveScheduled) return;

    this.saveScheduled = true;

    void Promise.resolve().then(() => {
      this.saveScheduled = false;
      this.#save();
    });
  }

  /**
   * Enforce the capacity minimums from RFC 6265 §6.1
   *
   * The oldest cookies (by creation time) are evicted first when a domain has more than 50 cookies
   * or the store has more than 3000 cookies.
   *
   * 按 RFC 6265 §6.1 的最小容量建议限制：单域名超过 50 条或总量超过 3000 条时，优先淘汰创建时间最早的 Cookie。
   *
   * @param domain - Domain that was just written / 刚刚写入的域名
   */
  #enforceLimits(domain: string): void {
    const cookieMap = this.store.get(domain);

    if (cookieMap) {
      let domainCount = countCookies(cookieMap);

      while (domainCount > MAX_COOKIES_PER_DOMAIN && deleteOldestInDomain(cookieMap))
        domainCount -= 1;
    }

    let totalCount = 0;

    this.store.forEach((domainCookieMap) => {
      totalCount += countCookies(domainCookieMap);
    });

    while (totalCount > MAX_COOKIES && this.#deleteOldest()) totalCount -= 1;
  }

  /** @returns Whether a cookie was removed / 是否删除了 Cookie */
  #deleteOldest(): boolean {
    let oldestDomain = "";
    let oldestCookie: Cookie | undefined;

    for (const [domain, cookieMap] of this.store) {
      for (const pathCookies of cookieMap.values()) {
        for (const cookie of pathCookies.values()) {
          if (!oldestCookie || cookie.createdAt < oldestCookie.createdAt) {
            oldestDomain = domain;
            oldestCookie = cookie;
          }
        }
      }
    }

    if (!oldestCookie) return false;

    const cookieMap = this.store.get(oldestDomain);

    if (!cookieMap) return false;

    const pathCookies = cookieMap.get(oldestCookie.name);

    pathCookies?.delete(oldestCookie.path);

    if (pathCookies?.size === 0) cookieMap.delete(oldestCookie.name);
    if (cookieMap.size === 0) this.store.delete(oldestDomain);

    return true;
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

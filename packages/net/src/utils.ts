/**
 * @param domain - Domain to normalize
 * @returns Normalized domain
 * @see RFC 6265
 */
export const normalizeDomain = (domain = ""): string =>
  domain
    .toLowerCase()
    .replace(/^(\.*)?(?=\S)/giu, ".")
    .replace(/\.+$/u, "");

// Strip the hash and the query string. `search()` with a single character class keeps this linear
// (the previous `/[#?].*$/u` replace was reported as a polynomial regular expression by CodeQL).
const removeHashAndQuery = (url: string): string => {
  const index = url.search(/[#?]/u);

  return index === -1 ? url : url.slice(0, index);
};

export const getDomain = (domainOrURL: string): string =>
  // oxlint-disable-next-line typescript/no-non-null-assertion
  removeHashAndQuery(domainOrURL)
    .replace(/^https?:\/\/|^\/\//iu, "")
    .split("/")
    .shift()!
    .replace(/:\d+$/u, "")
    .toLowerCase();

export const getCookieScopeDomain = (domain = ""): string[] => {
  if (!domain) return [];

  // 获取 cookie 作用域范围列表
  const normalizedDomain = normalizeDomain(domain).replace(/^\.+/giu, "");

  const scopes: string[] = [`.${normalizedDomain}`];

  // 从每个点分隔位置生成后缀作用域，避免 indexOf 只取首次出现导致重复域名（如 com.com）出错
  for (
    let index = normalizedDomain.indexOf(".");
    index !== -1;
    index = normalizedDomain.indexOf(".", index + 1)
  )
    scopes.push(`.${normalizedDomain.slice(index + 1)}`);

  return [normalizedDomain, ...scopes];
};

export interface UrlInfo {
  domain: string;
  path: string;
}

const ABSOLUTE_URL = /^[a-z][a-z-]*:\/\//iu;

/**
 * @param host - Host name / 主机名
 * @returns Whether the host looks like a domain / 是否像域名
 */
const isLikelyDomain = (host: string): boolean =>
  host === "localhost" || host.includes(".") || host.startsWith("[");

/**
 * Parse an absolute URL or a bare domain into `{ domain, path }`.
 *
 * Path-only strings (e.g. `"/"`, `"/api"`) are invalid here: a Cookie scope must contain a domain.
 * Use `{ path: "/api" }` with `getUrlInfo()` when only the path is known.
 *
 * 解析绝对 URL 或裸域名。`"/"`、`"/api"` 这类不含域名的字符串视为错误调用（Cookie 作用域必须带域名）； 只知道路径时请使用 `getUrlInfo({ path:
 * "/api" })`。
 *
 * @param url - Absolute URL or bare domain / 绝对 URL 或裸域名
 * @returns Parsed URL info / 解析后的 URL 信息
 * @throws {TypeError} When the input does not contain a domain / 输入不包含域名时抛错
 */
export const parseUrl = (url: string): UrlInfo => {
  const value = url.trim();
  const hasScheme = ABSOLUTE_URL.test(value);
  const withoutScheme = value.replace(ABSOLUTE_URL, "").replace(/^\/\//u, "");
  const authorityEnd = withoutScheme.search(/[/?#]/u);
  const authority = authorityEnd === -1 ? withoutScheme : withoutScheme.slice(0, authorityEnd);
  const host = authority.replace(/:\d+$/u, "").toLowerCase();

  if (!host || (!hasScheme && !isLikelyDomain(host)))
    throw new TypeError(`Cookie scope must include a domain: "${url}"`);

  const rest = authorityEnd === -1 ? "" : withoutScheme.slice(authorityEnd);

  return {
    domain: host,
    path: removeHashAndQuery(rest) || "/",
  };
};

type Url = string;
export type CookieOptions = Url | { domain?: string; path?: string };

export const getUrlInfo = (options: CookieOptions): UrlInfo => {
  const { domain = "", path = "/" } =
    typeof options === "object" ? options : typeof options === "string" ? parseUrl(options) : {};

  return { domain: normalizeDomain(domain), path };
};

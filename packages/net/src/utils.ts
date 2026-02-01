/**
 * @see RFC 6265
 * @param domain Domain string
 * @returns 标准化后的 domain 字符串
 */
export const normalizeDomain = (domain = ""): string =>
  domain.replaceAll(/^(\.*)?(?=\S)/gi, ".").replace(/\.+$/, "");

const removeHashAndQuery = (url: string): string => url.replace(/[#?].*$/, "");

export const getDomain = (domainOrURL: string): string =>
  // oxlint-disable-next-line typescript/no-non-null-assertion
  removeHashAndQuery(domainOrURL)
    .replace(/^https?:\/\//, "")
    .split("/")
    .shift()!
    .replace(/:\d+$/, "");

export const getCookieScopeDomain = (domain = ""): string[] => {
  if (!domain) return [];

  // 获取 cookie 作用域范围列表
  // oxlint-disable-next-line no-param-reassign
  domain = normalizeDomain(domain).replaceAll(/^\.+/gi, "");

  const scopes = domain
    .split(".")
    .map((part) => [".", domain.slice(domain.indexOf(part))].join(""));

  return [domain, ...scopes];
};

export interface UrlInfo {
  domain: string;
  path: string;
}

export const parseUrl = (url: string): UrlInfo => {
  const domain = getDomain(url);
  const path = removeHashAndQuery(url).split(domain)[1].replace(/^:\d+/, "") || "/";

  return {
    domain,
    path,
  };
};

type Url = string;
export type CookieOptions = Url | { domain?: string; path?: string };

export const getUrlInfo = (options: CookieOptions): UrlInfo => {
  const { domain = "", path = "/" } =
    typeof options === "object" ? options : typeof options === "string" ? parseUrl(options) : {};

  return { domain: normalizeDomain(domain), path };
};

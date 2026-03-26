/**
 * @see RFC 6265
 * @param domain - Domain to normalize
 * @returns Normalized domain
 */
export const normalizeDomain = (domain = ""): string =>
  domain.replace(/^(\.*)?(?=\S)/gi, ".").replace(/\.+$/, "");

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
  const normalizedDomain = normalizeDomain(domain).replace(/^\.+/gi, "");

  const scopes = normalizedDomain
    .split(".")
    .map((k) => [".", normalizedDomain.slice(normalizedDomain.indexOf(k))].join(""));

  return [normalizedDomain, ...scopes];
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

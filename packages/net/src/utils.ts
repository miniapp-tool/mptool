/**
 * @see RFC 6265
 */
export const normalizeDomain = (domain = ""): string =>
  domain.replace(/^(\.*)?(?=\S)/gi, ".").replace(/\.+$/, "");

export const getDomain = (domainOrURL: string): string =>
  domainOrURL
    .replace(/^https?:\/\//, "")
    .split("/")
    .shift()!
    .replace(/:\d+$/, "");

export const getCookieScopeDomain = (domain = ""): string[] => {
  if (!domain) return [];

  // 获取 cookie 作用域范围列表
  domain = normalizeDomain(domain).replace(/^\.+/gi, "");

  const scopes = domain
    .split(".")
    .map((k) => [".", domain.slice(domain.indexOf(k))].join(""));

  return [domain].concat(scopes);
};

export interface UrlInfo {
  domain: string;
  path: string;
}

export const parseUrl = (url: string): UrlInfo => {
  const domain = getDomain(url);
  const path = url.split(domain)[1].replace(/^:\d+/, "") || "/";

  return {
    domain,
    path,
  };
};

type Url = string;
export type CookieOptions = Url | { domain?: string; path?: string };

export const getUrlInfo = (options: CookieOptions): UrlInfo => {
  const { domain = "", path = "/" } =
    typeof options === "object"
      ? options
      : typeof options === "string"
        ? parseUrl(options)
        : {};

  return { domain: normalizeDomain(domain), path };
};

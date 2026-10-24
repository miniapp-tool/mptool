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
    .replace(/^https?:\/\/|^\/\//u, "")
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

export const parseUrl = (url: string): UrlInfo => {
  const cleanUrl = removeHashAndQuery(url);
  const domain = getDomain(url);
  // `getDomain()` lowercases the host, so locate it case-insensitively and keep the path as-is
  const index = cleanUrl.toLowerCase().indexOf(domain);
  const path =
    index === -1 ? "/" : cleanUrl.slice(index + domain.length).replace(/^:\d+/u, "") || "/";

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

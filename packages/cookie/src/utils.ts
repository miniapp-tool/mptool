import { parse, splitCookiesString } from "set-cookie-parser";
import { Cookie } from "./cookie.js";

/**
 * @see RFC 6265
 */
export const normalizeDomain = (domain = ""): string =>
  domain.replace(/^(\.*)?(?=\S)/gi, ".");

export const getCookieScopeDomain = (domain = ""): string[] => {
  if (!domain) return [];

  // 获取 cookie 作用域范围列表
  domain = domain.replace(/^\.+/gi, "");

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
  const domain = url.split("/")[2];
  const path = url.split(domain).pop() || "/";

  return {
    domain,
    path,
  };
};

export type CookeStoreOptions = string | { domain?: string; path?: string };

export const getCookieOptions = (options?: CookeStoreOptions): UrlInfo => {
  const { domain = "", path = "/" } =
    typeof options === "object"
      ? options
      : typeof options === "string"
      ? parseUrl(options)
      : {};

  return { domain, path };
};

export const parseCookieHeader = (
  setCookieHeader: string,
  domain: string,
): Cookie[] =>
  parse(splitCookiesString(setCookieHeader), {
    decodeValues: false,
  }).map(
    (item) =>
      new Cookie({
        ...item,
        domain: normalizeDomain(item.domain) || domain,
      }),
  );

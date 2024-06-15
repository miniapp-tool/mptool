import { parse, splitCookiesString } from "set-cookie-parser";

import { Cookie } from "./cookie.js";

/**
 * @see RFC 6265
 */
export const normalizeDomain = (domain = ""): string =>
  domain.replace(/^(\.*)?(?=\S)/gi, ".");

export interface UrlInfo {
  domain: string;
  path: string;
}

export const getDomain = (domainOrURL: string): string =>
  domainOrURL
    .replace(/^https?:\/\//, "")
    .split("/")
    .shift()!
    .replace(/:\d+$/, "");

export const parseUrl = (url: string): UrlInfo => {
  const domain = getDomain(url);
  const path = url.split(domain)[1].replace(/^:\d+/, "") || "/";

  return {
    domain,
    path,
  };
};

export type CookieOptions = string | { domain?: string; path?: string };

export const getCookieOptions = (options: CookieOptions): UrlInfo => {
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

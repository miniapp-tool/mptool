import { logger } from "@mptool/shared";
import { Headers } from "./headers.js";
import { CookieStore } from "./store.js";
import { URLSearchParams } from "./urlSearchParams.js";

export const fetchCookieStore = new CookieStore("__global__");

export type FetchBody =
  | WechatMiniprogram.IAnyObject
  | ArrayBuffer
  | URLSearchParams
  | string
  | null;

export interface FetchOptions<
  T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
> extends Omit<
    WechatMiniprogram.RequestOption<T>,
    "url" | "method" | "header" | "data"
  > {
  /**
   * 请求方法
   */
  method?:
    | "options"
    | "OPTIONS"
    | "get"
    | "GET"
    | "head"
    | "HEAD"
    | "post"
    | "POST"
    | "put"
    | "PUT"
    | "delete"
    | "DELETE"
    | "trace"
    | "TRACE"
    | "connect"
    | "CONNECT"
    | undefined;

  /**
   * 请求头
   */
  headers?: Record<string, string>;

  /**
   * 请求主体
   */
  body?: FetchBody;

  /**
   * Cookie 作用域
   */
  cookieScope?: string;

  /**
   * Cookie Store
   */
  cookieStore?: CookieStore;
}

export interface FetchResult<
  T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
> {
  /** Status Code */
  status: number;
  /** Response headers */
  headers: Headers;
  /** Response data */
  data: T;
}

export type FetchType = <
  T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
>(
  url: string,
  options?: FetchOptions<T>,
) => Promise<FetchResult<T>>;

export const fetch = <
  T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
>(
  /** 接口地址 */
  url: string,
  {
    method = "GET",
    headers,
    body,
    cookieScope = url,
    cookieStore = fetchCookieStore,
    ...options
  }: FetchOptions<T> = {},
): Promise<FetchResult<T>> =>
  new Promise((resolve, reject) => {
    const cookieHeader = cookieStore.getHeader(cookieScope);
    const requestHeaders = new Headers(headers);

    requestHeaders.append("Cookie", cookieHeader);

    const data =
      body instanceof URLSearchParams ? body.toString() : body ?? undefined;

    if (body instanceof URLSearchParams) {
      requestHeaders.set(
        "Content-Type",
        "application/x-www-form-urlencoded; charset=UTF-8",
      );
    }

    logger.debug(
      `\
Requesting ${url}:
Cookie: ${cookieHeader}
Options:
`,
      options,
    );

    const task = wx.request<T>({
      url,
      method: <
        | "OPTIONS"
        | "GET"
        | "HEAD"
        | "POST"
        | "PUT"
        | "DELETE"
        | "TRACE"
        | "CONNECT"
      >method.toUpperCase(),

      header: requestHeaders,
      data,

      enableHttp2: true,

      success: ({ data, statusCode, header }) => {
        logger.debug(`Request ends with ${statusCode}`, data);

        return resolve({
          data,
          headers: new Headers(header),
          status: statusCode,
        });
      },

      fail: ({ errMsg, errno }) => {
        // 调试
        logger.warn(`Request ${url} failed: ${errMsg}`);
        reject({ errMsg, errno });
      },
      ...options,
    });

    task.onHeadersReceived(({ header }) => {
      cookieStore.applyHeader(header, cookieScope);
    });
  });

export interface FetchInitOptions
  extends Pick<
    WechatMiniprogram.RequestOption,
    | "redirect"
    | "enableCache"
    | "enableChunked"
    | "enableHttp2"
    | "enableHttpDNS"
    | "enableQuic"
    | "httpDNSServiceId"
    | "forceCellularNetwork"
    | "timeout"
  > {
  /**
   * 访问的默认域名
   */
  server?: string;
  /**
   * Cookie Store
   */
  cookieStore?: CookieStore | string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Fetch = ({
  cookieStore,
  server,
  ...options
}: FetchInitOptions = {}): FetchType => {
  const domain = server?.replace(/\/$/g, "");
  const defaultCookieStore =
    cookieStore instanceof CookieStore
      ? cookieStore
      : typeof cookieStore === "string"
        ? new CookieStore(cookieStore)
        : fetchCookieStore;

  const customFetch: FetchType = (url: string, fetchOptions = {}) => {
    if (url.startsWith("/") && !domain) throw new Error("No domain provided");

    const link = url.startsWith("/")
      ? `${domain}${url}`
      : url.match(/^[a-z][a-z-]*:\/\//)
        ? url
        : `https://${url}`;

    return fetch(link, {
      cookieStore: defaultCookieStore,
      ...options,
      ...fetchOptions,
    });
  };

  return customFetch;
};

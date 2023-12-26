import { logger } from "@mptool/shared";
import { Headers } from "./headers.js";
import { CookieStore } from "./store.js";
import { URLSearchParams } from "./urlSearchParams.js";

export const fetchCookieStore = new CookieStore("__fetch_cookie__");

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

export interface FetchResponse<
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
  options?: FetchOptions<T>
) => Promise<FetchResponse<T>>;

export interface FetchErrorInfo {
  /** 错误信息 */
  errMsg: string;
  /** 错误码 */
  errno: number;
}

export const mpFetch = <
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
  }: FetchOptions<T> = {}
): Promise<FetchResponse<T>> =>
  new Promise((resolve, reject) => {
    const cookieHeader = cookieStore.getHeader(cookieScope);
    const requestHeaders = new Headers(headers);

    requestHeaders.append("Cookie", cookieHeader);

    const data =
      body instanceof URLSearchParams ? body.toString() : body ?? undefined;

    if (body instanceof URLSearchParams) {
      requestHeaders.set(
        "Content-Type",
        "application/x-www-form-urlencoded; charset=UTF-8"
      );
    }

    logger.debug(
      `\
Requesting ${url}:
Cookie: ${cookieHeader}
Options:
`,
      options
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

      header: requestHeaders.toObject(),
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
   * Cookie 存储
   */
  cookieStore?: CookieStore | string;
  /**
   * 响应处理器
   *
   * @param response 响应
   * @returns 数据
   * @throws {Error} 自定义的错误数据
   */
  responseHandler?: <
    T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >,
  >(
    /** 响应数据 */
    response: FetchResponse<T>,
    /** 请求地址 */
    url: string,
    /** 请求配置 */
    options: FetchOptions<T>
  ) => FetchResponse<T>;
  errorHandler?: <
    T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >,
  >(
    /** 错误信息 */
    errInfo: FetchErrorInfo,
    /** 请求地址 */
    url: string,
    /** 请求配置 */
    options: FetchOptions<T>
  ) => FetchResponse<T> | never;
}

export interface FetchFactory {
  /**
   * Cookie 存储
   */
  cookieStore: CookieStore;
  /**
   * 请求方法
   */
  fetch: FetchType;
}

/**
 * @param options fetch 配置选项
 */
export const createMpFetch = ({
  cookieStore,
  server,
  responseHandler = <
    T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >,
  >(
    response: FetchResponse<T>
  ): FetchResponse<T> => response,
  errorHandler,
  ...defaultOptions
}: FetchInitOptions = {}): FetchFactory => {
  const domain = server?.replace(/\/$/g, "");
  const defaultCookieStore =
    cookieStore instanceof CookieStore
      ? cookieStore
      : typeof cookieStore === "string"
        ? new CookieStore(cookieStore)
        : fetchCookieStore;

  const customFetch: FetchType = (url: string, fetchOptions = {}) => {
    if (url.startsWith("/") && !domain)
      throw { message: "No server provided", errno: -1 };

    const link = url.startsWith("/")
      ? `${domain}${url}`
      : url.match(/^[a-z][a-z-]*:\/\//)
        ? url
        : `https://${url}`;

    const options = {
      cookieStore: defaultCookieStore,
      ...defaultOptions,
      ...fetchOptions,
    };

    return mpFetch(link, options)
      .then((response) => responseHandler(response, url, options))
      .catch((err: { errMsg: string; errno: number }) => {
        if (errorHandler) throw errorHandler(err, url, options);
        throw err;
      });
  };

  return { cookieStore: defaultCookieStore, fetch: customFetch };
};

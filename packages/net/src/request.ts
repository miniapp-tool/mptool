import { MpError, logger } from "@mptool/shared";

import { CookieStore } from "./cookieStore.js";
import { Headers } from "./headers.js";
import { URLSearchParams } from "./urlSearchParams.js";

export const requestCookieStore: CookieStore = new CookieStore("__request_cookie__");

export type RequestBody =
  | WechatMiniprogram.IAnyObject
  | ArrayBuffer
  | URLSearchParams
  | string
  | null;

/** 请求参数与响应数据的通用类型 */
type RequestData = WechatMiniprogram.IAnyObject | unknown[] | string | ArrayBuffer;

export interface RequestOptions<T extends RequestData = WechatMiniprogram.IAnyObject> extends Omit<
  WechatMiniprogram.RequestOption<T>,
  "url" | "method" | "header" | "data" | "success" | "fail"
> {
  /** 请求方法 */
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

  /** 请求头 */
  headers?: Record<string, string>;

  /** 请求主体 */
  body?: RequestBody;

  /** Cookie 作用域 */
  cookieScope?: string;

  /** Cookie Store */
  cookieStore?: CookieStore;
}

export interface RequestResponse<T extends RequestData = WechatMiniprogram.IAnyObject> {
  /** Status Code */
  status: number;
  /** Response headers */
  headers: Headers;
  /** Response data */
  data: T;
}

export type RequestType = <T extends RequestData = WechatMiniprogram.IAnyObject>(
  url: string,
  options?: RequestOptions<T>,
) => Promise<RequestResponse<T>>;

export const request = <T extends RequestData = WechatMiniprogram.IAnyObject>(
  /** 接口地址 */
  url: string,
  {
    method = "GET",
    headers,
    body,
    cookieScope = url,
    cookieStore = requestCookieStore,
    ...options
  }: RequestOptions<T> = {},
): Promise<RequestResponse<T>> =>
  new Promise((resolve, reject) => {
    const cookieHeader = cookieStore.getHeader(cookieScope);
    const requestHeaders = new Headers(headers);

    if (cookieHeader) requestHeaders.append("Cookie", cookieHeader);

    // oxlint-disable-next-line no-undefined
    const requestData = body instanceof URLSearchParams ? body.toString() : (body ?? undefined);

    // automatically set content-type header
    if (!requestHeaders.has("Content-Type")) {
      if (body instanceof URLSearchParams)
        requestHeaders.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
      else if (body instanceof ArrayBuffer)
        requestHeaders.set("Content-Type", "application/octet-stream; charset=UTF-8");
      else if (
        // is plain object
        Object.prototype.toString.call(body) === "[object Object]"
      )
        requestHeaders.set("Content-Type", "application/json; charset=UTF-8");
    }

    logger.debug(
      `\
Requesting ${url}:
Cookie: ${cookieHeader}
Options:
`,
      options,
    );

    wx.request<T>({
      url,
      method: method.toUpperCase() as
        | "OPTIONS"
        | "GET"
        | "HEAD"
        | "POST"
        | "PUT"
        | "DELETE"
        | "TRACE"
        | "CONNECT",

      header: requestHeaders.toObject(),
      data: requestData,

      enableHttp2: true,
      useHighPerformanceMode: true,
      ...options,

      // The internal callbacks must win: they settle the promise and persist response cookies.
      // 内部回调必须覆盖调用方传入的 success / fail：Promise 的 settle 与 cookie 写回依赖它们。
      success: ({ data: responseData, statusCode, header }) => {
        logger.debug(
          `Request ends with ${statusCode}`,
          typeof responseData === "string" ? responseData.trimEnd() : responseData,
        );

        cookieStore.applyHeader(header, cookieScope);

        resolve({
          data: responseData,
          headers: new Headers(header),
          status: statusCode,
        });
      },

      fail: ({ errMsg, errno }) => {
        // 调试
        logger.warn(`Request ${url} failed: ${errMsg}`);
        reject(new MpError({ code: errno, message: errMsg }));
      },
    });
  });

export interface RequestInitOptions extends Pick<
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
  /** 访问的默认域名 */
  server?: string;

  /** Cookie 存储 */
  cookieStore?: CookieStore | string;

  /** 请求选项处理器 */
  requestHandler?: <T extends RequestData = WechatMiniprogram.IAnyObject>(
    /** 请求地址 */
    url: string,
    /** 请求配置 */
    options: RequestOptions<T>,
  ) => RequestOptions<T>;

  /**
   * 响应处理器
   *
   * @throws {MpError} 自定义的错误数据
   */
  responseHandler?: <T extends RequestData = WechatMiniprogram.IAnyObject>(
    /** 响应数据 */
    response: RequestResponse<T>,
    /** 请求地址 */
    url: string,
    /** 请求配置 */
    options: RequestOptions<T>,
  ) => RequestResponse<T>;

  /**
   * 错误处理器
   *
   * @throws {MpError} 自定义的错误数据
   */
  errorHandler?: <T extends RequestData = WechatMiniprogram.IAnyObject>(
    /** 错误信息 */
    error: MpError,
    /** 请求地址 */
    url: string,
    /** 请求配置 */
    options: RequestOptions<T>,
  ) => RequestResponse<T> | never;
}

export interface RequestFactory {
  /** Cookie 存储 */
  cookieStore: CookieStore;
  /** 请求方法 */
  request: RequestType;
}

/**
 * @param options Request 配置选项
 * @returns 请求工厂，包含一个请求方法和一个 Cookie 存储
 */
export const createRequest = ({
  cookieStore,
  server,
  requestHandler,
  responseHandler = <T extends RequestData = WechatMiniprogram.IAnyObject>(
    response: RequestResponse<T>,
  ): RequestResponse<T> => response,
  errorHandler,
  ...defaultOptions
}: RequestInitOptions = {}): RequestFactory => {
  const domain = server?.replace(/\/$/gu, "");
  const defaultCookieStore =
    cookieStore instanceof CookieStore
      ? cookieStore
      : typeof cookieStore === "string"
        ? new CookieStore(cookieStore)
        : requestCookieStore;

  const newRequest: RequestType = <T extends RequestData = WechatMiniprogram.IAnyObject>(
    url: string,
    requestOptions: RequestOptions<T> = {},
  ) => {
    if (url.startsWith("/") && !domain) throw new Error("No server provided");

    const link = url.startsWith("/")
      ? `${domain}${url}`
      : /^[a-z][a-z-]*:\/\//u.test(url)
        ? url
        : `https://${url}`;

    const mergedOptions: RequestOptions<T> = {
      cookieStore: defaultCookieStore,
      ...defaultOptions,
      ...requestOptions,
    };
    const options = requestHandler?.<T>(link, mergedOptions) ?? mergedOptions;

    return (
      request<T>(link, options)
        .then((response) => responseHandler<T>(response, url, options))
        // oxlint-disable-next-line promise/prefer-await-to-callbacks
        .catch((err: unknown) => {
          if (errorHandler && err instanceof MpError) return errorHandler(err, url, options);

          throw err;
        })
    );
  };

  return { cookieStore: defaultCookieStore, request: newRequest };
};

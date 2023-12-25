import { logger } from "@mptool/shared";
import { Headers } from "./headers.js";
import { CookieStore } from "./store.js";
import { URLSearchParams } from "./urlSearchParams.js";

const globalCookieStore = new CookieStore();

export type FetchBody = ArrayBuffer | URLSearchParams | null | string;

export interface FetchOptions<
  T extends string | Record<string, string> | ArrayBuffer,
> {
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
  headers?: Record<string, string>;
  body?: FetchBody;
  domain?: string;
  dataType?: "json" | "其他";
  responseType?: "text" | "arraybuffer" | undefined;
  redirect?: "follow" | "manual";

  success?: WechatMiniprogram.RequestSuccessCallback<T>;
  fail?: WechatMiniprogram.RequestFailCallback;
  complete?: WechatMiniprogram.RequestCompleteCallback;
}

export interface FetchResult<
  T extends string | Record<string, string> | ArrayBuffer,
> {
  data: T;
  statusCode: number;
  headers: Headers;
}

export const fetch = <T extends string | Record<string, string> | ArrayBuffer>(
  url: string,
  { method = "GET", headers, body, ...options }: FetchOptions<T> = {},
): Promise<FetchResult<T>> =>
  new Promise((resolve, reject) => {
    const cookieScope = options.domain || url;
    const cookieHeader = globalCookieStore.getHeader(cookieScope);
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

        return resolve({ data, headers: new Headers(header), statusCode });
      },
      fail: ({ errMsg }) => {
        // 调试
        logger.warn(`Request ${url} failed: ${errMsg}`);
        reject(errMsg);
      },
      ...options,
    });

    task.onHeadersReceived(({ header }) => {
      globalCookieStore.applyHeader(header, cookieScope);
    });
  });

export interface FetchInitOptions {
  /**
   * 访问的默认域名
   */
  domain?: string;
  /** 需要基础库： `2.10.4`
   *
   * 开启 cache */
  enableCache?: boolean;
  /** 需要基础库： `2.20.2`
   *
   * 开启 transfer-encoding chunked。 */
  enableChunked?: boolean;
  /** 需要基础库： `2.10.4`
   *
   * 开启 http2 */
  enableHttp2?: boolean;
  /** 需要基础库： `2.19.1`
   *
   * 是否开启 HttpDNS 服务。如开启，需要同时填入 httpDNSServiceId 。 HttpDNS 用法详见 [移动解析HttpDNS](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/HTTPDNS.html) */
  enableHttpDNS?: boolean;
  /** 需要基础库： `2.10.4`
   *
   * 开启 quic */
  enableQuic?: boolean;
  /** 需要基础库： `2.21.0`
   *
   * 强制使用蜂窝网络发送请求 */
  forceCellularNetwork?: boolean;
  /** 需要基础库： `2.10.0`
   *
   * 超时时间，单位为毫秒。默认值为 60000 */
  timeout?: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Fetch = ({ domain, ...options }: FetchInitOptions = {}): (<
  T extends string | Record<string, string> | ArrayBuffer,
>(
  url: string,
  fetchOptions?: FetchOptions<T>,
) => Promise<FetchResult<T>>) => {
  const server = domain?.replace(/\/$/g, "");

  return <T extends string | Record<string, string> | ArrayBuffer>(
    url: string,
    fetchOptions: FetchOptions<T> = {},
  ): Promise<FetchResult<T>> => {
    if (url.startsWith("/") && !server) throw new Error("No domain provided");

    return fetch<T>(url.startsWith("/") ? server + url : url, {
      ...options,
      ...fetchOptions,
    });
  };
};

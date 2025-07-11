---
title: request
---

## request

```ts
export type RequestBody =
  | WechatMiniprogram.IAnyObject
  | ArrayBuffer
  | URLSearchParams
  | string
  | null;

export interface RequestOptions<
  T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
    string,
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
  body?: RequestBody;
  /**
   * Cookie 作用域
   */
  cookieScope?: string;
  /**
   * Cookie Store
   */
  cookieStore?: CookieStore;
}

export interface RequestResponse<
  T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
    string,
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

export interface MpError extends Error {
  /** 错误码 */
  errno?: number;
}

export type RequestType = <
  T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
    string,
    any
  >,
>(
  url: string,
  options?: RequestOptions<T>,
) => Promise<RequestResponse<T>>;

export const request: <
  T extends string | ArrayBuffer | Record<never, never> | unknown[] = Record<
    string,
    any
  >,
>(
  url: string,
  {
    method,
    headers,
    body,
    cookieScope,
    cookieStore,
    ...options
  }?: RequestOptions<T>,
) => Promise<RequestResponse<T>>;
```

## createRequest

```ts
export interface RequestInitOptions
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
   * 请求选项处理器
   */
  requestHandler?: <
    T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >,
  >(
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
  responseHandler?: <
    T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
      string,
      any
    >,
  >(
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
  errorHandler?: <
    T extends Record<never, never> | unknown[] | string | ArrayBuffer = Record<
      string,
      any
    >,
  >(
    /** 错误信息 */
    error: MpError,
    /** 请求地址 */
    url: string,
    /** 请求配置 */
    options: RequestOptions<T>,
  ) => RequestResponse<T> | never;
}

export interface RequestFactory {
  /**
   * Cookie 存储
   */
  cookieStore: CookieStore;
  /**
   * 请求方法
   */
  request: RequestType;
}

/**
 * @param options request 配置选项
 */
export const createRequest: (options?: RequestInitOptions) => RequestFactory;
```

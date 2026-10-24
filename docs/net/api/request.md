---
title: request
---

## request

```ts
export type RequestBody =
  WechatMiniprogram.IAnyObject | ArrayBuffer | URLSearchParams | string | null;

/** 请求参数与响应数据的通用类型 */
type RequestData = WechatMiniprogram.IAnyObject | unknown[] | string | ArrayBuffer;

export interface RequestOptions<T extends RequestData = WechatMiniprogram.IAnyObject>
  extends Omit<
    WechatMiniprogram.RequestOption<T>,
    "url" | "method" | "header" | "data" | "success" | "fail"
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

export interface RequestResponse<T extends RequestData = WechatMiniprogram.IAnyObject> {
  /** Status Code */
  status: number;
  /** Response headers */
  headers: Headers;
  /** Response data */
  data: T;
}

export interface MpError extends Error {
  /** 错误码 */
  code: number | null;
}

export type RequestType = <T extends RequestData = WechatMiniprogram.IAnyObject>(
  url: string,
  options?: RequestOptions<T>,
) => Promise<RequestResponse<T>>;

export const request: <T extends RequestData = WechatMiniprogram.IAnyObject>(
  url: string,
  { method, headers, body, cookieScope, cookieStore, ...options }?: RequestOptions<T>,
) => Promise<RequestResponse<T>>;
```

`success` / `fail` 不允许通过 `RequestOptions` 传入：内部回调需要独占它们来 resolve / reject Promise，并写回响应中的 Cookie。即使运行时强行传入，也会被内部回调覆盖。

## createRequest

```ts
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

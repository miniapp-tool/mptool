# Fetch

## fetch

```ts
export type FetchBody = ArrayBuffer | URLSearchParams | string | null;

export interface FetchOptions<
  T extends string | Record<string, string> | ArrayBuffer,
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
  T extends string | Record<string, string> | ArrayBuffer,
> {
  status: number;
  headers: Headers;
  data: T;
}

export const fetch: <T extends string | Record<string, string> | ArrayBuffer>(
  url: string,
  { method, headers, body, ...options }?: FetchOptions<T>,
) => Promise<FetchResult<T>>;
```

## Fetch

```ts
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

export type FetchType = <
  T extends string | Record<string, string> | ArrayBuffer,
>(
  url: string,
  options?: FetchOptions<T>,
) => Promise<FetchResult<T>>;

export const Fetch: (options?: FetchInitOptions) => FetchType;
```

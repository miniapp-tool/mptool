---
title: request
---

## request

The first argument, `url`, must be an absolute URL (`https://example.com/api` or `//example.com/api`); relative URLs are invalid calls and throw a `TypeError` before the request is sent.

```ts
export type RequestBody =
  WechatMiniprogram.IAnyObject | ArrayBuffer | URLSearchParams | string | null;

/** Common type for request parameters and response data */
type RequestData = WechatMiniprogram.IAnyObject | unknown[] | string | ArrayBuffer;

export interface RequestOptions<T extends RequestData = WechatMiniprogram.IAnyObject>
  extends Omit<
    WechatMiniprogram.RequestOption<T>,
    "url" | "method" | "header" | "data" | "success" | "fail"
  > {
  /**
   * Request method
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
   * Request headers
   */
  headers?: Record<string, string>;
  /**
   * Request body
   */
  body?: RequestBody;
  /**
   * Cookie scope; must include a domain (an absolute URL or a domain; bare paths such as `"/api"` throw a `TypeError`)
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
  /** Error code */
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

`success` / `fail` cannot be passed through `RequestOptions`: the internal callbacks must own them to resolve / reject the Promise and write back cookies from the response. They are overwritten by the internal callbacks even if passed in at runtime.

`request` returns a Promise of `RequestResponse` and additionally provides:

- `abort(): void`: cancels the current request (including retry waits); idempotent
- `task: WechatMiniprogram.RequestTask | undefined`: the underlying task for the current attempt

Additional optional options:

- `cancelKey?: string`: for batch cancellation with `createRequest().abort(key)`
- `onTask?: (task) => void`: called after a task is created for each attempt
- `signal?: { aborted: boolean; addEventListener?; removeEventListener? }`: cancellation signal
- `retry?: RequestRetryOptions | false`: retry configuration for this request

```ts
interface RequestRetryOptions {
  attempts?: number; // Total attempts (including the first), default 1
  delay?: number; // Delay before the first retry, default 300ms
  maxDelay?: number; // Maximum delay, default 3000ms
  methods?: string[]; // Default ["GET", "HEAD", "OPTIONS"]
  statusCodes?: number[]; // Default [408, 429, 500, 502, 503, 504]
  rejectOnHttpError?: boolean; // Default false
  onRetry?: (info) => void | number; // Return a number to override the delay
}
```

`createRequest` also provides `abort(key)` / `abortAll()` / `pendingCount()`; `RequestInitOptions` adds `retry`. Failures are normalized to `RequestError extends MpError`, with `type: "abort" | "timeout" | "network" | "http"`.

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
   * Default domain to access
   */
  server?: string;
  /**
   * Cookie storage
   */
  cookieStore?: CookieStore | string;
  /**
   * Request options handler
   */
  requestHandler?: <T extends RequestData = WechatMiniprogram.IAnyObject>(
    /** Request URL */
    url: string,
    /** Request config */
    options: RequestOptions<T>,
  ) => RequestOptions<T>;
  /**
   * Response handler
   *
   * @throws {MpError} Custom error data
   */
  responseHandler?: <T extends RequestData = WechatMiniprogram.IAnyObject>(
    /** Response data */
    response: RequestResponse<T>,
    /** Request URL */
    url: string,
    /** Request config */
    options: RequestOptions<T>,
  ) => RequestResponse<T>;
  /**
   * Error handler
   *
   * @throws {MpError} Custom error data
   */
  errorHandler?: <T extends RequestData = WechatMiniprogram.IAnyObject>(
    /** Error information */
    error: MpError,
    /** Request URL */
    url: string,
    /** Request config */
    options: RequestOptions<T>,
  ) => RequestResponse<T> | never;
}

export interface RequestFactory {
  /**
   * Cookie storage
   */
  cookieStore: CookieStore;
  /**
   * Request method
   */
  request: RequestType;
}

/**
 * @param options request config options
 */
export const createRequest: (options?: RequestInitOptions) => RequestFactory;
```

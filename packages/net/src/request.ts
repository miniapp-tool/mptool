// oxlint-disable max-lines -- request types, execution and factory form one public surface
// oxlint-disable max-classes-per-file -- RequestError + RequestExecution live together
// oxlint-disable unicorn/custom-error-definition -- RequestError extends MpError and keeps its name
import { MpError, logger } from "@mptool/shared";

import { CookieStore } from "./cookieStore.js";
import { Headers } from "./headers.js";
import { URLSearchParams } from "./urlSearchParams.js";
import { parseUrl } from "./utils.js";

export const requestCookieStore: CookieStore = new CookieStore("__request_cookie__");

/**
 * Request body accepted by `request()` / `createRequest()`.
 *
 * `URLSearchParams` must be this package's exported class to be recognised; for any other
 * implementation, convert it with `body.toString()` and pass the string instead.
 *
 * 请求体。`URLSearchParams` 必须是本包导出的类才能被识别；其它实现请先 `toString()` 后传字符串。
 */
export type RequestBody =
  | WechatMiniprogram.IAnyObject
  | ArrayBuffer
  | URLSearchParams
  | string
  | null;

/** 请求参数与响应数据的通用类型 */
type RequestData = WechatMiniprogram.IAnyObject | unknown[] | string | ArrayBuffer;

/** 请求失败的分类 / Category of a failed request */
export type RequestErrorType = "abort" | "http" | "network" | "timeout";

export class RequestError extends MpError {
  /** 失败类型 */
  type: RequestErrorType;

  constructor({
    code,
    message,
    type,
  }: {
    code?: number | undefined;
    message?: string | undefined;
    type: RequestErrorType;
  }) {
    super({ code, message });
    this.type = type;
  }
}

/**
 * Minimal cancellation signal, structurally compatible with the browser `AbortSignal` subset.
 *
 * The mini-program runtime does not provide `AbortController`, so only `aborted` is required;
 * `addEventListener` is used when present to cancel requests early.
 *
 * 最小取消信号，结构上兼容浏览器 `AbortSignal` 的子集。小程序没有 `AbortController`，因此只要求 `aborted`；存在 `addEventListener`
 * 时会用于提前取消请求。
 */
export interface RequestAbortSignal {
  readonly aborted: boolean;
  addEventListener?: (type: "abort", listener: () => void) => void;
  removeEventListener?: (type: "abort", listener: () => void) => void;
}

export interface RequestRetryInfo<T extends RequestData = WechatMiniprogram.IAnyObject> {
  /** 请求地址 / Request url */
  url: string;
  /** 即将进行的尝试序号，从 2 开始 / Upcoming attempt number, starting at 2 */
  attempt: number;
  /** 本次重试的延迟（毫秒） / Delay before this retry in ms */
  delay: number;
  /** 触发重试的错误 / Error that triggered the retry */
  error?: RequestError;
  /** 触发重试的响应（HTTP 状态码重试时） / Response that triggered the retry */
  response?: RequestResponse<T>;
}

export interface RequestRetryOptions {
  /** 总尝试次数（含第一次），默认 1（不重试） / Total attempts including the first, default 1 */
  attempts?: number;
  /** 首次重试延迟，默认 300ms / Base retry delay, default 300ms */
  delay?: number;
  /** 最大重试延迟，默认 3000ms / Maximum retry delay, default 3000ms */
  maxDelay?: number;
  /** 允许重试的方法，默认 GET / HEAD / OPTIONS / Methods allowed to retry */
  methods?: string[];
  /** 触发重试的 HTTP 状态码 / HTTP status codes that trigger a retry */
  statusCodes?: number[];
  /**
   * 重试耗尽后，HTTP 错误是否 reject
   *
   * 默认 `false`，保持「任何状态码都 resolve」的现有语义。
   *
   * Whether to reject after retries are exhausted for HTTP errors. Default `false` keeps the
   * existing "every status code resolves" behaviour.
   */
  rejectOnHttpError?: boolean;
  /** 每次重试前回调；返回数字可覆盖本次延迟 / Called before each retry; a number overrides the delay */
  onRetry?: (info: RequestRetryInfo) => void | number;
}

interface NormalizedRetryOptions<T extends RequestData = WechatMiniprogram.IAnyObject> {
  attempts: number;
  delay: number;
  maxDelay: number;
  methods: string[];
  statusCodes: number[];
  rejectOnHttpError: boolean;
  onRetry?: ((info: RequestRetryInfo<T>) => void | number) | undefined;
}

const DEFAULT_RETRY_METHODS = ["GET", "HEAD", "OPTIONS"];
const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const MAX_RETRY_ATTEMPTS = 10;

/**
 * Normalize the retry configuration.
 *
 * @param retry - Retry options / 重试配置
 * @returns Normalized options / 规范化后的配置
 */
const normalizeRetryOptions = <T extends RequestData>(
  retry: RequestRetryOptions | false | undefined,
): NormalizedRetryOptions<T> => {
  if (retry === false || retry == null) {
    return {
      attempts: 1,
      delay: 300,
      maxDelay: 3000,
      methods: DEFAULT_RETRY_METHODS,
      statusCodes: DEFAULT_RETRY_STATUS_CODES,
      rejectOnHttpError: false,
    };
  }

  return {
    attempts: Math.min(MAX_RETRY_ATTEMPTS, Math.max(1, Math.floor(retry.attempts ?? 1))),
    delay: Math.max(0, retry.delay ?? 300),
    maxDelay: Math.max(0, retry.maxDelay ?? 3000),
    methods: (retry.methods ?? DEFAULT_RETRY_METHODS).map((method) => method.toUpperCase()),
    statusCodes: retry.statusCodes ?? DEFAULT_RETRY_STATUS_CODES,
    rejectOnHttpError: retry.rejectOnHttpError ?? false,
    onRetry: retry.onRetry as NormalizedRetryOptions<T>["onRetry"],
  };
};

/**
 * Create the error for a failed wx.request attempt.
 *
 * @param errMsg - Error message from wx.request / wx.request 的错误信息
 * @param errno - Error number / 错误码
 * @returns Classified request error / 分类后的请求错误
 */
const createRequestError = (errMsg: string, errno?: number): RequestError => {
  const message = errMsg || "request:fail";
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("abort"))
    return new RequestError({ code: errno, message, type: "abort" });

  if (normalizedMessage.includes("timeout"))
    return new RequestError({ code: errno, message, type: "timeout" });

  return new RequestError({ code: errno, message, type: "network" });
};

/**
 * Get an abort function from a possible `RequestTask`.
 *
 * @param task - RequestTask returned by wx.request / wx.request 返回的 RequestTask
 * @returns Abort function, or null when the task cannot be aborted / 取消函数，无法取消时为 null
 */
const getTaskAbort = (task: WechatMiniprogram.RequestTask | null): (() => void) | null => {
  if (!task || typeof task.abort !== "function") return null;

  return (): void => {
    task.abort();
  };
};

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

  /** 取消分组键，配合工厂的 abort(key) 使用 / Cancellation key used by factory.abort(key) */
  cancelKey?: string;

  /** 拿到本次尝试的底层 RequestTask / Receive the underlying RequestTask of each attempt */
  onTask?: (task: WechatMiniprogram.RequestTask) => void;

  /** 本次请求的重试配置；false 表示关闭 / Retry options for this request; false disables */
  retry?: RequestRetryOptions | false;

  /** 取消信号 / Cancellation signal */
  signal?: RequestAbortSignal;
}

export interface RequestResponse<T extends RequestData = WechatMiniprogram.IAnyObject> {
  /** Status Code */
  status: number;
  /** Response headers */
  headers: Headers;
  /** Response data */
  data: T;
}

/**
 * The promise returned by `request`: a normal promise with cancellation helpers attached.
 *
 * 请求返回的 Promise：普通 Promise，额外挂载取消能力。
 */
export type RequestPromise<T extends RequestData = WechatMiniprogram.IAnyObject> = Promise<
  RequestResponse<T>
> & {
  /** 取消本次请求（含重试等待），幂等 / Abort the request including retry waits; idempotent */
  abort: () => void;
  /** 当前尝试对应的 RequestTask / The RequestTask of the current attempt */
  readonly task: WechatMiniprogram.RequestTask | undefined;
};

export type RequestType = <T extends RequestData = WechatMiniprogram.IAnyObject>(
  url: string,
  options?: RequestOptions<T>,
) => RequestPromise<T>;

/**
 * Build response headers, skipping invalid entries instead of throwing from the success callback.
 *
 * @param header - Raw response headers / 原始响应头
 * @returns Response Headers / 响应 Headers
 */
const createResponseHeaders = (header: Record<string, string>): Headers => {
  const headers = new Headers();

  for (const [name, value] of Object.entries(header)) {
    try {
      headers.set(name, value);
    } catch {
      logger.warn(`Ignored invalid response header "${name}"`);
    }
  }

  return headers;
};

/** Wx.request 失败结果 / wx.request fail result */
interface WxFailResult {
  errMsg: string;
  errno?: number;
}

/** Wx.request 成功结果 / wx.request success result */
interface WxSuccessResult<T extends RequestData> {
  data: T;
  statusCode: number;
  header: Record<string, string>;
}

interface RequestExecutionConfig<T extends RequestData> {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: RequestBody;
  cookieScope: string;
  cookieStore: CookieStore;
  retryOptions: NormalizedRetryOptions<T>;
  canRetry: boolean;
  signal?: RequestAbortSignal;
  onTask?: (task: WechatMiniprogram.RequestTask) => void;
  /** 其余透传给 wx.request 的选项 / Remaining options passed to wx.request */
  wxOptions: Omit<WechatMiniprogram.RequestOption<T>, "url" | "success" | "fail">;
}

/**
 * Single request execution, including retries and cancellation.
 *
 * 单次请求的执行器，负责重试与取消。
 */
class RequestExecution<T extends RequestData> {
  readonly promise: RequestPromise<T>;

  private attempt = 0;
  private currentTask: WechatMiniprogram.RequestTask | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private settled = false;
  private aborted = false;
  private resolvePromise!: (response: RequestResponse<T>) => void;
  private rejectPromise!: (error: RequestError) => void;
  private onAbortListener: (() => void) | null = null;

  constructor(private readonly config: RequestExecutionConfig<T>) {
    this.promise = new Promise<RequestResponse<T>>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    }) as RequestPromise<T>;

    this.promise.abort = (): void => {
      this.abort();
    };
    void Object.defineProperty(this.promise, "task", {
      configurable: true,
      enumerable: false,
      // oxlint-disable-next-line no-undefined
      get: (): WechatMiniprogram.RequestTask | undefined => this.currentTask ?? undefined,
    });
  }

  /** Start the first attempt (or reject immediately when the signal is already aborted). */
  start(): void {
    const { signal } = this.config;

    if (signal?.aborted) {
      this.aborted = true;
      this.settled = true;
      this.rejectPromise(new RequestError({ message: "request:fail abort", type: "abort" }));

      return;
    }

    if (signal?.addEventListener) {
      this.onAbortListener = (): void => {
        this.abort();
      };
      signal.addEventListener("abort", this.onAbortListener);
    }

    this.performAttempt();
  }

  private abort(): void {
    if (this.settled) return;

    this.aborted = true;
    this.settled = true;

    const taskAbort = getTaskAbort(this.currentTask);

    this.currentTask = null;
    this.cleanup();
    taskAbort?.();
    this.rejectPromise(new RequestError({ message: "request:fail abort", type: "abort" }));
  }

  private cleanup(): void {
    if (this.retryTimer != null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    const { signal } = this.config;

    if (signal?.removeEventListener && this.onAbortListener) {
      signal.removeEventListener("abort", this.onAbortListener);
      this.onAbortListener = null;
    }
  }

  private finishResolve(response: RequestResponse<T>): void {
    if (this.settled) return;

    this.settled = true;
    this.cleanup();
    this.resolvePromise(response);
  }

  private finishReject(error: RequestError): void {
    if (this.settled) return;

    this.settled = true;
    this.cleanup();
    this.rejectPromise(error);
  }

  private shouldRetry(): boolean {
    const { canRetry, retryOptions } = this.config;

    return !this.settled && !this.aborted && canRetry && this.attempt < retryOptions.attempts;
  }

  private scheduleRetry(error: RequestError | null, response?: RequestResponse<T>): void {
    const { onRetry, delay: baseDelay, maxDelay } = this.config.retryOptions;
    const nextAttempt = this.attempt + 1;
    const defaultDelay = Math.min(baseDelay * 2 ** (this.attempt - 1), maxDelay);
    const overriddenDelay = onRetry?.({
      url: this.config.url,
      attempt: nextAttempt,
      delay: defaultDelay,
      ...(error ? { error } : {}),
      ...(response ? { response } : {}),
    });
    const delay =
      typeof overriddenDelay === "number" && overriddenDelay >= 0 ? overriddenDelay : defaultDelay;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;

      if (!this.settled && !this.aborted) this.performAttempt();
    }, delay);
  }

  private handleSuccess({ data, statusCode, header }: WxSuccessResult<T>): void {
    if (this.settled || this.aborted) return;

    this.currentTask = null;
    logger.debug(
      `Request ends with ${statusCode}`,
      typeof data === "string" ? data.trimEnd() : data,
    );

    this.config.cookieStore.applyHeader(header, this.config.cookieScope);

    const response: RequestResponse<T> = {
      data,
      headers: createResponseHeaders(header),
      status: statusCode,
    };

    if (this.shouldRetry() && this.config.retryOptions.statusCodes.includes(statusCode)) {
      this.scheduleRetry(null, response);

      return;
    }

    if (this.config.retryOptions.rejectOnHttpError && statusCode >= 400) {
      this.finishReject(
        new RequestError({
          code: statusCode,
          message: `request:fail status ${statusCode}`,
          type: "http",
        }),
      );

      return;
    }

    this.finishResolve(response);
  }

  private handleFail({ errMsg, errno }: WxFailResult): void {
    if (this.settled || this.aborted) return;

    this.currentTask = null;

    const error = createRequestError(errMsg, errno);

    logger.warn(`Request ${this.config.url} failed: ${errMsg}`);

    if (this.shouldRetry() && error.type !== "abort") {
      this.scheduleRetry(error);

      return;
    }

    this.finishReject(error);
  }

  private performAttempt(): void {
    if (this.settled || this.aborted) return;

    const { url, method, headers, body, cookieScope, cookieStore, onTask, wxOptions } = this.config;

    this.attempt += 1;

    // Cookies may change between attempts (e.g. a failed response still sets a session cookie)
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
Requesting ${url} (attempt ${this.attempt}):
Cookie: ${cookieHeader}
Options:
`,
      wxOptions,
    );

    const task = wx.request<T>({
      ...wxOptions,
      url,
      method: method as
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
      enableHttp2: wxOptions.enableHttp2 ?? true,
      useHighPerformanceMode: wxOptions.useHighPerformanceMode ?? true,

      // The internal callbacks must win: they settle the promise and persist response cookies.
      // 内部回调必须覆盖调用方传入的 success / fail：Promise 的 settle 与 cookie 写回依赖它们。
      success: (result): void => {
        this.handleSuccess(result);
      },
      fail: (result): void => {
        this.handleFail(result);
      },
    });

    if (!this.settled) {
      this.currentTask = task;
      onTask?.(task);
    }
  }
}

export const request = <T extends RequestData = WechatMiniprogram.IAnyObject>(
  /** 接口地址 */
  url: string,
  {
    method = "GET",
    headers,
    body,
    cookieScope = url,
    cookieStore = requestCookieStore,
    retry,
    signal,
    onTask,
    cancelKey: _cancelKey,
    ...options
  }: RequestOptions<T> = {},
): RequestPromise<T> => {
  if (!/^[a-z][a-z-]*:\/\//iu.test(url) && !url.startsWith("//"))
    throw new TypeError(`request url must be absolute: "${url}"`);

  if (cookieScope) parseUrl(cookieScope);

  const retryOptions = normalizeRetryOptions<T>(retry);
  const upperMethod = method.toUpperCase();
  const execution = new RequestExecution<T>({
    url,
    method: upperMethod,
    headers,
    body,
    cookieScope,
    cookieStore,
    retryOptions,
    canRetry: retryOptions.attempts > 1 && retryOptions.methods.includes(upperMethod),
    signal,
    onTask,
    wxOptions: options,
  });

  execution.start();

  return execution.promise;
};

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

  /** 默认重试配置 / Default retry options */
  retry?: RequestRetryOptions;

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

/** 可被工厂取消的请求 / Request that can be aborted by the factory */
interface AbortableRequest {
  abort: () => void;
}

export interface RequestFactory {
  /** Cookie 存储 */
  cookieStore: CookieStore;
  /** 请求方法 */
  request: RequestType;
  /** 取消某个 cancelKey 下的所有在途请求 / Abort all pending requests under a cancelKey */
  abort: (key: string) => void;
  /** 取消工厂创建的所有在途请求 / Abort every pending request created by this factory */
  abortAll: () => void;
  /** 当前在途请求数（测试 / 诊断用） / Pending request count (tests / diagnostics) */
  pendingCount: () => number;
}

/**
 * @param options Request 配置选项
 * @returns 请求工厂，包含请求方法、Cookie 存储与取消能力
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

  /** Requests that can still be aborted / 仍可取消的请求 */
  const pendingRequests = new Set<AbortableRequest>();
  /** Requests grouped by `cancelKey` / 按 cancelKey 分组的请求 */
  const keyedRequests = new Map<string, Set<AbortableRequest>>();

  const newRequest: RequestType = <T extends RequestData = WechatMiniprogram.IAnyObject>(
    url: string,
    requestOptions: RequestOptions<T> = {},
  ): RequestPromise<T> => {
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
    const baseRequest = request<T>(link, options);
    let tracked = false;

    const abortable: AbortableRequest = {
      abort: (): void => {
        baseRequest.abort();
      },
    };

    const untrack = (): void => {
      if (!tracked) return;

      tracked = false;
      pendingRequests.delete(abortable);

      const key = options.cancelKey;

      if (key) {
        const requests = keyedRequests.get(key);

        requests?.delete(abortable);

        if (requests?.size === 0) keyedRequests.delete(key);
      }
    };

    abortable.abort = (): void => {
      baseRequest.abort();
      untrack();
    };

    const responsePromise = baseRequest
      .then((response) => responseHandler<T>(response, options.cookieScope ?? url, options))
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      .catch((err: unknown) => {
        if (errorHandler && err instanceof MpError) return errorHandler(err, url, options);

        throw err;
      }) as RequestPromise<T>;

    responsePromise.abort = abortable.abort;
    void Object.defineProperty(responsePromise, "task", {
      configurable: true,
      enumerable: false,
      get: () => baseRequest.task,
    });

    tracked = true;
    pendingRequests.add(abortable);

    if (options.cancelKey) {
      let requests = keyedRequests.get(options.cancelKey);

      if (!requests) {
        requests = new Set();
        keyedRequests.set(options.cancelKey, requests);
      }

      requests.add(abortable);
    }

    void responsePromise.then(untrack, untrack);

    return responsePromise;
  };

  return {
    cookieStore: defaultCookieStore,
    request: newRequest,
    abort: (key: string): void => {
      const requests = keyedRequests.get(key);

      if (!requests) return;

      for (const pendingRequest of requests) pendingRequest.abort();

      keyedRequests.delete(key);
    },
    abortAll: (): void => {
      const requests = [...pendingRequests];

      pendingRequests.clear();
      keyedRequests.clear();

      for (const pendingRequest of requests) pendingRequest.abort();
    },
    pendingCount: (): number => pendingRequests.size,
  };
};

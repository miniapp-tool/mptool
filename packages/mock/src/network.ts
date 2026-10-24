// oxlint-disable promise/prefer-await-to-callbacks

import { callCallback, offEvent, onEvent } from "./ui.js";

/** Result passed to `wx.request` success callbacks. */
interface RequestSuccessResult {
  statusCode: number;
  data: unknown;
  header: Record<string, string>;
  cookies: string[];
}

/** Listener registered with `RequestTask.onHeadersReceived`. */
type HeadersReceivedCallback = (result: {
  header: Record<string, string>;
  statusCode: number;
  cookies: string[];
}) => void;

/** Listener registered with `RequestTask.onChunkReceived`. */
type ChunkReceivedCallback = (result: { data: ArrayBuffer }) => void;

interface RequestOption {
  url?: string;
  success?: (result: RequestSuccessResult) => void;
  fail?: (result: { errMsg: string }) => void;
  complete?: (result: { errMsg: string }) => void;
}

/** The `RequestTask` returned by `wx.request`, mirroring the real contract. */
export interface MockRequestTask {
  abort: () => void;
  offChunkReceived: (callback?: ChunkReceivedCallback) => void;
  offHeadersReceived: (callback?: HeadersReceivedCallback) => void;
  onChunkReceived: (callback: ChunkReceivedCallback) => void;
  onHeadersReceived: (callback: HeadersReceivedCallback) => void;
}

interface RequestTaskController {
  task: MockRequestTask;
  fail: (errMsg: string) => void;
  start: () => void;
}

/**
 * Create the `RequestTask` returned by `wx.request`.
 *
 * The mock follows the real runtime contract: `wx.request` always returns a task and never a
 * promise. Failures (`abort` / `timeout`) are delivered asynchronously to `fail`, then `complete`;
 * `onHeadersReceived` listeners fire right before `success`.
 */
const createRequestTask = (option: RequestOption | undefined): RequestTaskController => {
  const headersReceivedCallbacks = new Set<HeadersReceivedCallback>();
  const chunkReceivedCallbacks = new Set<ChunkReceivedCallback>();
  const result: RequestSuccessResult = {
    statusCode: 200,
    data: {},
    header: {},
    cookies: [],
  };

  let settled = false;
  let successTimer: ReturnType<typeof setTimeout> | null = null;

  const clearSuccessTimer = (): void => {
    if (successTimer != null) clearTimeout(successTimer);
  };

  const succeed = (): void => {
    if (settled) return;
    settled = true;
    clearSuccessTimer();

    // The real runtime emits the response headers before the success callback.
    headersReceivedCallbacks.forEach((callback) => {
      callback({ header: result.header, statusCode: result.statusCode, cookies: result.cookies });
    });
    option?.success?.(result);
    option?.complete?.({ errMsg: "request:ok" });
  };

  const fail = (errMsg: string): void => {
    if (settled) return;
    settled = true;
    clearSuccessTimer();

    option?.fail?.({ errMsg });
    option?.complete?.({ errMsg });
  };

  const task: MockRequestTask = {
    abort(): void {
      if (settled) return;

      // The real runtime reports the abort asynchronously, after cancelling the request.
      settled = true;
      clearSuccessTimer();

      setTimeout(() => {
        option?.fail?.({ errMsg: "request:fail abort" });
        option?.complete?.({ errMsg: "request:fail abort" });
      }, 0);
    },
    offChunkReceived(callback?: ChunkReceivedCallback): void {
      if (callback) chunkReceivedCallbacks.delete(callback);
      else chunkReceivedCallbacks.clear();
    },
    offHeadersReceived(callback?: HeadersReceivedCallback): void {
      if (callback) headersReceivedCallbacks.delete(callback);
      else headersReceivedCallbacks.clear();
    },
    onChunkReceived(callback: ChunkReceivedCallback): void {
      chunkReceivedCallbacks.add(callback);
    },
    onHeadersReceived(callback: HeadersReceivedCallback): void {
      headersReceivedCallbacks.add(callback);
    },
  };

  const start = (): void => {
    successTimer = setTimeout(succeed, 0);
  };

  return { fail, start, task };
};

/** 网络相关 wx API mock */
export const networkApi = {
  /**
   * Mock of `wx.request`.
   *
   * Real devices always return a `RequestTask`; `wx.request` does not support the promise-style
   * call. Returning a task lets cancellation (`abort`) be tested.
   */
  request(option: unknown): MockRequestTask {
    const requestOption = option as RequestOption | undefined;
    const { fail, start, task } = createRequestTask(requestOption);

    if (!requestOption) {
      setTimeout(() => {
        fail("request:fail");
      }, 0);
      return task;
    }

    start();
    return task;
  },

  uploadFile(option: unknown): unknown {
    const result = {
      statusCode: 200,
      data: "",
      header: {} as Record<string, string>,
    };
    const realOption = option as
      | {
          url: string;
          filePath: string;
          name: string;
          success?: (result: {
            statusCode: number;
            data: string;
            header: Record<string, string>;
          }) => void;
          fail?: (result: { errMsg: string }) => void;
          complete?: (result: { errMsg: string }) => void;
        }
      | undefined;

    // 真实微信中 wx.uploadFile 恒返回 UploadTask，任务进度回调均不触发
    const task = {
      onProgressUpdate: (): void => void 0,
      offProgressUpdate: (): void => void 0,
      onHeadersReceived: (): void => void 0,
      offHeadersReceived: (): void => void 0,
      abort: (): void => void 0,
    };

    if (!realOption) return Promise.resolve(result);

    if (!realOption.success && !realOption.fail && !realOption.complete)
      return Promise.resolve(result);

    setTimeout(() => {
      if (realOption.success) realOption.success(result);
      if (realOption.complete) realOption.complete({ errMsg: "uploadFile:ok" });
    }, 0);

    return task;
  },

  connectSocket(_option: unknown): unknown {
    return {
      send: (option?: {
        data?: string | ArrayBuffer;
        success?: () => void;
        fail?: (result: { errMsg: string }) => void;
        complete?: () => void;
      }): void => {
        if (option?.success) setTimeout(option.success, 0);
        if (option?.complete) setTimeout(option.complete, 0);
      },
      close: (option?: {
        code?: number;
        reason?: string;
        success?: () => void;
        fail?: (result: { errMsg: string }) => void;
        complete?: () => void;
      }): void => {
        if (option?.success) setTimeout(option.success, 0);
        if (option?.complete) setTimeout(option.complete, 0);
      },
      onOpen: (): void => void 0,
      onClose: (): void => void 0,
      onError: (): void => void 0,
      onMessage: (): void => void 0,
      offOpen: (): void => void 0,
      offClose: (): void => void 0,
      offError: (): void => void 0,
      offMessage: (): void => void 0,
    };
  },

  onSocketOpen(listener: (result: { header: Record<string, string> }) => void): void {
    onEvent("socketOpen", listener);
  },

  offSocketOpen(listener?: (result: { header: Record<string, string> }) => void): void {
    offEvent("socketOpen", listener);
  },

  onSocketError(listener: (result: { errMsg: string }) => void): void {
    onEvent("socketError", listener);
  },

  offSocketError(listener?: (result: { errMsg: string }) => void): void {
    offEvent("socketError", listener);
  },

  onSocketMessage(listener: (result: { data: string | ArrayBuffer }) => void): void {
    onEvent("socketMessage", listener);
  },

  offSocketMessage(listener?: (result: { data: string | ArrayBuffer }) => void): void {
    offEvent("socketMessage", listener);
  },

  onSocketClose(listener: (result: { code: number; reason: string }) => void): void {
    onEvent("socketClose", listener);
  },

  offSocketClose(listener?: (result: { code: number; reason: string }) => void): void {
    offEvent("socketClose", listener);
  },

  sendSocketMessage(option: unknown): unknown {
    return callCallback(option, { errMsg: "sendSocketMessage:ok" });
  },

  closeSocket(option: unknown): unknown {
    return callCallback(option, { errMsg: "closeSocket:ok" });
  },
};

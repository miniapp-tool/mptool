import { callCallback, offEvent, onEvent } from "./ui.js";

interface RequestOption {
  success?: (result: {
    statusCode: number;
    data: unknown;
    header: Record<string, string>;
    cookies: string[];
  }) => void;
  fail?: (result: { errMsg: string }) => void;
  complete?: (result: { errMsg: string }) => void;
}

/** 网络相关 wx API mock */
export const networkApi = {
  request(option: unknown): unknown {
    const result = {
      statusCode: 200,
      data: {},
      header: {} as Record<string, string>,
      cookies: [] as string[],
    };
    const realOption = option as RequestOption | undefined;

    if (!realOption) return Promise.resolve(result);

    if (!realOption.success && !realOption.fail && !realOption.complete)
      return Promise.resolve(result);

    return setTimeout(() => {
      if (realOption.success) realOption.success(result);
      if (realOption.complete) realOption.complete({ errMsg: "request:ok" });
    }, 0);
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

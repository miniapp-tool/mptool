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
};

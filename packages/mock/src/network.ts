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
};

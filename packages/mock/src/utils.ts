// oxlint-disable typescript/no-explicit-any
interface AsyncMethodOptionLike {
  success?: (...args: any[]) => void;
}

export type PromisifySuccessResult<Options, T extends AsyncMethodOptionLike> = Options extends {
  success: any;
}
  ? void
  : Options extends { fail: any }
    ? void
    : Options extends { complete: any }
      ? void
      : Promise<Parameters<Exclude<T["success"], undefined>>[0]>;

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
export interface GeneralCallbackResult {
  errMsg: string;
}

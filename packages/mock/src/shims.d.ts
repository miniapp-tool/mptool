declare namespace WechatMiniprogram {
  interface Wx {
    env: {
      USER_DATA_PATH: string;
      /** 是否输出 Debug 日志 */
      DEBUG?: boolean;
      // oxlint-disable-next-line typescript/no-explicit-any
      [props: string]: any;
    };
  }
}

// eslint-disable-next-line
declare namespace WechatMiniprogram {
  interface Wx {
    env: {
      USER_DATA_PATH: string;
      /** 是否输出 Debug 日志 */
      DEBUG?: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [props: string]: any;
    };
  }
}

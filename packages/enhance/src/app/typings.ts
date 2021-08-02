import type { UserEmitter } from "../emitter";

export interface ExtendsAppOptions {
  /**
   * 小程序在切入后台后被唤醒
   *
   * @param time 休眠时间 (单位ms)
   */
  onAwake?(time: number): void;
}

export interface ExtendedAppMethods {
  /**
   * 事件派发器
   *
   * 是一个全局共享的 [Emitter](https://miniapp-tool.github.io/api/enhance/emitter.html) 实例
   */
  $emitter: UserEmitter;
}

export type AppOptions<Custom> = ExtendsAppOptions &
  Partial<WechatMiniprogram.App.Option> &
  Custom &
  Partial<ExtendedAppMethods> &
  ThisType<AppInstance<Custom>>;

export type AppInstance<Custom> = AppOptions<Custom> &
  Custom &
  ExtendedAppMethods;

export interface AppConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <Custom extends Record<string, any>>(appOptions: AppOptions<Custom>): void;
}

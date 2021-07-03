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
   * 是一个 [mitt](https://github.com/developit/mitt) 实例
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

export type AppConstructor = <Custom = WechatMiniprogram.IAnyObject>(
  appOptions: AppOptions<Custom>
) => void;

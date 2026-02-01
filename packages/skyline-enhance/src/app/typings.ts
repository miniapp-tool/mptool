import type { InstanceEmitterMethods } from "../emitter/index.js";

export interface ExtendsAppOptions {
  /**
   * 小程序在切入后台后被唤醒
   *
   * @param time 休眠时间 (单位ms)
   */
  onAwake?(time: number): void;
}

export type ExtendedAppMethods = InstanceEmitterMethods;

export type AppOptions<Custom> = ExtendsAppOptions &
  Partial<WechatMiniprogram.App.Option> &
  Custom &
  Partial<ExtendedAppMethods> &
  ThisType<AppInstance<Custom>>;

export type AppInstance<Custom> = AppOptions<Custom> & Custom & ExtendedAppMethods;

export type AppConstructor = <Custom extends WechatMiniprogram.IAnyObject>(
  appOptions: AppOptions<Custom>,
) => void;

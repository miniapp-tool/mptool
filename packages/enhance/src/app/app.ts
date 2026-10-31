import { logger, wrapFunction } from "@mptool/shared";

import { ON_APP_AWAKE, ON_APP_LAUNCH } from "../constant.js";
import { appEmitter, userEmitter } from "../emitter/index.js";
import type { AppConstructor, AppOptions } from "./typings.js";

export const appState = {
  /** 是否已启动 */
  launch: false,
  /** 启动参数 */
  lOpt: {},
  /** 切入后台时的时间戳 */
  hide: 0,
};

const appLaunchHandler = (options: WechatMiniprogram.App.LaunchShowOption): void => {
  appState.launch = true;
  appState.lOpt = options;

  appEmitter.emit(ON_APP_LAUNCH, options);
};

const appShowHandler = (): void => {
  // emit onAwake lifeCycle
  if (appState.hide) {
    appEmitter.emit(ON_APP_AWAKE, Date.now() - appState.hide);

    // reset timeStamp
    appState.hide = 0;
  }
};

const appHideHandler = (): void => {
  appState.hide = Date.now();
};

/**
 * Invoke the optional `onAwake` handler and report a rejected promise instead of leaving it
 * unhandled.
 *
 * The mini-program runtime has no `unhandledrejection` hook, so a rejected async `onAwake` would
 * otherwise vanish silently (or surface as an unhandled rejection in tests/Node).
 *
 * 触发可选的 `onAwake` 处理函数，并捕获其 Promise 拒绝（记录日志），避免产生 unhandled rejection。
 *
 * `onAwake` is typed with the app instance as `this`; in a mini-program the app options object is
 * the app instance, so it is passed explicitly.
 *
 * `onAwake` 的类型声明以 App 实例为 `this`；小程序中 app 选项对象就是实例，因此显式传入。
 *
 * @param appOptions - App instance (the app options object) / App 实例（即 app 选项对象）
 * @param handler - Awake handler / 唤醒处理函数
 * @param time - Sleep duration in ms / 休眠时间（ms）
 */
const invokeAsyncAwake = async (
  appOptions: object,
  handler: (time: number) => void | Promise<void>,
  time: number,
): Promise<void> => {
  try {
    await handler.call(appOptions, time);
  } catch (err) {
    logger.error(`App: onAwake rejected after ${time}ms`, err);
  }
};

/**
 * Application wrapper
 *
 * @param appOptions App Option
 */
export const $App: AppConstructor = <Custom extends WechatMiniprogram.IAnyObject>(
  appOptions: AppOptions<Custom>,
): void => {
  appOptions.onLaunch = wrapFunction(appOptions.onLaunch, appLaunchHandler);
  appOptions.onShow = wrapFunction(appOptions.onShow, appShowHandler);
  appOptions.onHide = wrapFunction(appOptions.onHide, appHideHandler);

  // 注册 onAwake 监听
  const { onAwake } = appOptions;

  if (onAwake) {
    appEmitter.on(ON_APP_AWAKE, (time) => {
      logger.debug(`App: awake after ${time}ms`);

      void invokeAsyncAwake(appOptions, onAwake, time);
    });
    logger.debug("App: registered onAwake");
  }

  appOptions.$on = userEmitter.on;
  appOptions.$off = userEmitter.off;
  appOptions.$emit = userEmitter.emit;
  appOptions.$emitAsync = userEmitter.emitAsync;

  /** Use app config */
  App(appOptions);
};

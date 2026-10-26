import { logger, wrapFunction } from "@mptool/shared";

import { ON_APP_AWAKE } from "../constant.js";
import { appEmitter, userEmitter } from "../emitter/index.js";
import type { AppConstructor, AppOptions } from "./typings.js";

export const appState = {
  /** 切入后台时的时间戳 */
  hide: 0,
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
 * @param handler - Awake handler / 唤醒处理函数
 * @param time - Sleep duration in ms / 休眠时间（ms）
 */
const invokeAsyncAwake = async (
  handler: (time: number) => void | Promise<void>,
  time: number,
): Promise<void> => {
  try {
    await handler(time);
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
  appOptions.onShow = wrapFunction(appOptions.onShow, appShowHandler);
  appOptions.onHide = wrapFunction(appOptions.onHide, appHideHandler);

  // 注册 onAwake 监听
  const { onAwake } = appOptions;

  if (onAwake) {
    appEmitter.on(ON_APP_AWAKE, (time) => {
      logger.debug(`App: awake after ${time}ms`);

      void invokeAsyncAwake(onAwake, time);
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

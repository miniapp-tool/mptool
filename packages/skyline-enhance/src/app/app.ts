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
  if (appOptions.onAwake) {
    appEmitter.on(ON_APP_AWAKE, (time) => {
      logger.debug(`App: awake after ${time}ms`);
      // oxlint-disable-next-line typescript/no-non-null-assertion
      appOptions.onAwake!(time);
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

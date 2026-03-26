import { logger, wrapFunction } from "@mptool/shared";

import type { AppConstructor, AppOptions } from "./typings.js";
import { ON_APP_AWAKE, ON_APP_LAUNCH } from "../constant.js";
import { appEmitter, userEmitter } from "../emitter/index.js";

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
  if (appOptions.onAwake) {
    appEmitter.on(ON_APP_AWAKE, (time) => {
      logger.debug(`App: awake after ${time}ms`);

      // oxlint-disable-next-line typescript/no-non-null-assertion
      appOptions.onAwake!(time);
    });
    logger.debug("App: registered onAwake");
  }

  // oxlint-disable-next-line typescript/unbound-method
  appOptions.$on = userEmitter.on;
  // oxlint-disable-next-line typescript/unbound-method
  appOptions.$off = userEmitter.off;
  // oxlint-disable-next-line typescript/unbound-method
  appOptions.$emit = userEmitter.emit;
  // oxlint-disable-next-line typescript/unbound-method
  appOptions.$emitAsync = userEmitter.emitAsync;

  /**
   * Use app config
   */
  App(appOptions);
};

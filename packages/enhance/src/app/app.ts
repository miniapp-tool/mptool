import { logger, mergeFun } from "@mptool/shared";
import { initConfig } from "../config";
import { appEmitter, userEmitter } from "../event";

import type { AppConstructor, AppInstance, AppOptions } from "./typings";

export const appState = {
  /** 是否已启动 */
  launch: false,
  /** 启动参数 */
  lOpt: {},
  /** 是否正在显示 */
  show: false,
  /** 显示参数 */
  sOpt: {},
  /** 切入后台时的时间戳 */
  hide: 0,
};

const appLaunchHandler = (
  options: WechatMiniprogram.App.LaunchShowOption
): void => {
  appState.launch = true;
  appState.lOpt = options;

  appEmitter.emit("app:launch", options);
};

const appShowHandler = (
  options: WechatMiniprogram.App.LaunchShowOption
): void => {
  try {
    if (!appState.show) {
      appState.show = true;
      appState.sOpt = options;

      appEmitter.emit("app:show", options);
    }
  } finally {
    // emit onAwake lifeCycle
    if (appState.hide) {
      appEmitter.emit("app:sleep", new Date().getTime() - appState.hide);

      // reset timeStamp
      appState.hide = 0;
    }
  }
};

const appHideHandler = (): void => {
  appState.hide = new Date().getTime();
};

/**
 * Application wrapper
 *
 * @param appOptions Appoption
 */
export const $App: AppConstructor = <Custom = WechatMiniprogram.IAnyObject>(
  appOptions: AppOptions<Custom>
): void => {
  let ctx: AppInstance<Custom>;

  initConfig(appOptions.config);

  appOptions.onLaunch = appOptions.onLaunch
    ? mergeFun(appLaunchHandler, appOptions.onLaunch)
    : appLaunchHandler;

  appOptions.onShow = appOptions.onShow
    ? mergeFun(appShowHandler, appOptions.onShow)
    : appShowHandler;

  appOptions.onHide = appOptions.onHide
    ? mergeFun(appHideHandler, appOptions.onHide)
    : appHideHandler;

  // 保留指针
  appOptions.onLaunch = mergeFun(function hold(this: AppInstance<Custom>) {
    ctx = this;
  }, appOptions.onLaunch);

  // 注册 onAwake 监听
  if (appOptions.onAwake) {
    appEmitter.on("app:sleep", (time) => {
      logger.debug(`[App] awake after ${time}ms`);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      appOptions.onAwake!.call(ctx, time);
    });
    logger.debug(`[App] registered onAwake`);
  }

  appOptions.$emitter = userEmitter;

  /**
   * Use app config
   */
  App(appOptions);
};

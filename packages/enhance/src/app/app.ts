import { logger } from "@mptool/shared";
import { ON_APP_AWAKE, ON_APP_LAUNCH } from "../constant";
import { appEmitter, userEmitter } from "../event";
import { mergeFunction } from "../utils";

import type { AppConstructor, AppInstance, AppOptions } from "./typings";

export const appState = {
  /** 是否已启动 */
  launch: false,
  /** 启动参数 */
  lOpt: {},
  /** 切入后台时的时间戳 */
  hide: 0,
};

const appLaunchHandler = (
  options: WechatMiniprogram.App.LaunchShowOption
): void => {
  appState.launch = true;
  appState.lOpt = options;

  appEmitter.emit(ON_APP_LAUNCH, options);
};

const appShowHandler = (): void => {
  // emit onAwake lifeCycle
  if (appState.hide) {
    appEmitter.emit(ON_APP_AWAKE, new Date().getTime() - appState.hide);

    // reset timeStamp
    appState.hide = 0;
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

  appOptions.onLaunch = mergeFunction(function launchExtraHandler(
    this: AppInstance<Custom>,
    options: WechatMiniprogram.App.LaunchShowOption
  ) {
    // saving context
    ctx = this;
    appLaunchHandler(options);
  },
  appOptions.onLaunch);
  appOptions.onShow = mergeFunction(appShowHandler, appOptions.onShow);
  appOptions.onHide = mergeFunction(appHideHandler, appOptions.onHide);

  // 注册 onAwake 监听
  if (appOptions[ON_APP_AWAKE]) {
    appEmitter.on(ON_APP_AWAKE, (time) => {
      logger.debug(`App: awake after ${time}ms`);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      appOptions[ON_APP_AWAKE]!.call(ctx, time);
    });
    logger.debug(`App: registered ${ON_APP_AWAKE}`);
  }

  appOptions.$emitter = userEmitter;

  /**
   * Use app config
   */
  App(appOptions);
};

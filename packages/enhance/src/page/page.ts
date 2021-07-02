import { logger, mergeFun } from "@mptool/shared";
import event from "mitt";

import { appState } from "../app";
import { mountMethods } from "../bridge";
import { getConfig } from "../config";
import { appEmitter, routeEmitter } from "../event";

import type {
  PageConstructor,
  PageLifecycleOptions,
  PageOptions,
} from "./typings";

let hasPageLoaded = false;

export const $Page: PageConstructor = <
  Data = WechatMiniprogram.IAnyObject,
  Custom = WechatMiniprogram.IAnyObject
>(
  name: string,
  options: PageOptions<Data, Custom>
): void => {
  const { extendPageAfter, extendPageBefore } = getConfig().options;

  const callLog = (lifeCycle: string, args?: unknown): void =>
    logger.debug(`Calling Page [${name}] ${lifeCycle} `, args || "");
  const registerLog = (lifeCycle: string): void =>
    logger.debug(`Page [${name}] registered ${lifeCycle}`);

  // extend page config
  if (extendPageBefore) extendPageBefore(name, options, { event });

  /*
   * mixin component defs
   * C.use(option, option.comps, `Page[${name}]`, emitter)
   */

  options.$state = {
    /** 是否是首个启动页面 */
    firstOpen: false,
  };

  if (options.onAppLaunch) {
    if (appState.launch) {
      const { lOpt: onLaunchOptions } = appState;

      callLog("onAppLaunch", onLaunchOptions);
      options.onAppLaunch(
        onLaunchOptions as WechatMiniprogram.App.LaunchShowOption
      );
    } else
      appEmitter.on("app:launch", (onLaunchOptions) => {
        callLog("onAppLaunch", onLaunchOptions);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        options.onAppLaunch!(onLaunchOptions);
      });

    registerLog("onAppLaunch");
  }

  if (options.onAppShow) {
    if (appState.launch) {
      const { sOpt: onShowOptions } = appState;

      callLog("onAppLaunch", onShowOptions);
      options.onAppShow(
        onShowOptions as WechatMiniprogram.App.LaunchShowOption
      );
    } else
      appEmitter.on("app:show", (onShowOptions) => {
        callLog("onAppLaunch", onShowOptions);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        options.onAppShow!(onShowOptions);
      });

    registerLog("onAppShow");
  }

  if (options.onNavigate) {
    const onNavigateHandler = function (
      lifeCycleOptions: PageLifecycleOptions
    ): void {
      callLog("onNavigate", lifeCycleOptions);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.onNavigate!(lifeCycleOptions);
    };

    routeEmitter.on(`navigate:${name}`, onNavigateHandler);
    registerLog("onNavigate");
  }

  if (options.onPreload) {
    routeEmitter.on(
      `preload:${name}`,
      (lifeCycleOptions: PageLifecycleOptions): void => {
        callLog("Preload", lifeCycleOptions);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        options.onPreload!(lifeCycleOptions);
      }
    );
    registerLog("onPreload");
  }

  options.onLoad = mergeFun((): void => {
    // After onLoad, onAwake is valid if defined
    if (options.onAwake) {
      appEmitter.on("app:sleep", (time: number) => {
        callLog("onAwake", time);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        options.onAwake!(time);
      });
      registerLog("onNavigate");
    }

    if (!hasPageLoaded) {
      hasPageLoaded = true;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.$state!.firstOpen = true;
    }
  }, options.onLoad);

  options.onReady = mergeFun(
    () => appEmitter.emit("page:ready"),
    options.onReady
  );

  mountMethods(options);

  // extend page config
  if (extendPageAfter) extendPageAfter(name, options, { event });

  // called before register
  if (options.onRegister) {
    callLog("onRegister");
    options.onRegister();
  }

  // register page
  Page(options as WechatMiniprogram.Page.Options<Data, Custom>);

  logger.debug(`Registered Page [${name}]`);
};

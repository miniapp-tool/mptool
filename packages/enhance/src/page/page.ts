import { logger } from "@mptool/shared";

import { appState } from "../app";
import { mount } from "../bridge";
import {
  ON_APP_AWAKE,
  ON_APP_LAUNCH,
  ON_PAGE_NAVIGATE,
  ON_PAGE_PRELOAD,
  ON_PAGE_READY,
  ON_PAGE_UNLOAD,
} from "../constant";
import { getConfig } from "../config";
import { appEmitter, routeEmitter } from "../emitter";
import { mergeFunction } from "../utils";

import type { PageConstructor, PageOptions, PageQuery } from "./typings";

let hasPageLoaded = false;

export const $Page: PageConstructor = <
  Data = WechatMiniprogram.IAnyObject,
  Custom = WechatMiniprogram.IAnyObject
>(
  name: string,
  options: PageOptions<Data, Custom>
): void => {
  const { extendPage, injectPage } = getConfig();

  const callLog = (lifeCycle: string, args?: unknown): void =>
    logger.debug(`Page ${name}: ${lifeCycle} has been invoked`, args || "");
  const registerLog = (lifeCycle: string): void =>
    logger.debug(`Page ${name}: registered ${lifeCycle}`);

  // extend page config
  if (extendPage) extendPage(name, options);

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

      callLog(ON_APP_LAUNCH);

      options.onAppLaunch(
        onLaunchOptions as WechatMiniprogram.App.LaunchShowOption
      );
    } else
      appEmitter.on(ON_APP_LAUNCH, (onLaunchOptions) => {
        callLog(ON_APP_LAUNCH);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        options.onAppLaunch!(onLaunchOptions);
      });

    registerLog(ON_APP_LAUNCH);
  }

  if (options.onNavigate) {
    routeEmitter.on(
      `${ON_PAGE_NAVIGATE}:${name}`,
      (query: PageQuery): Promise<void> | void => {
        callLog(ON_PAGE_NAVIGATE, query);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return options.onNavigate!(query);
      }
    );

    registerLog(ON_PAGE_NAVIGATE);
  }

  if (options.onPreload) {
    routeEmitter.on(
      `${ON_PAGE_PRELOAD}:${name}`,
      (query: PageQuery): void | Promise<void> => {
        callLog(ON_PAGE_PRELOAD, query);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return options.onPreload!(query);
      }
    );

    registerLog(ON_PAGE_PRELOAD);
  }

  options.onLoad = mergeFunction((): void => {
    // After onLoad, onAwake is valid if defined
    if (options.onAwake) {
      appEmitter.on(ON_APP_AWAKE, (time: number) => {
        callLog(ON_APP_AWAKE);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        options.onAwake!(time);
      });
      registerLog(ON_APP_AWAKE);
    }

    if (!hasPageLoaded) {
      hasPageLoaded = true;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.$state!.firstOpen = true;
    }
  }, options.onLoad);

  options.onReady = mergeFunction(
    () => appEmitter.emit(ON_PAGE_READY),
    options.onReady
  );

  options.onUnload = mergeFunction(
    () => appEmitter.emit(ON_PAGE_UNLOAD),
    options.onUnload
  );

  mount(options);

  // extend page config
  if (injectPage) injectPage(name, options);

  // called before register
  if (options.onRegister) {
    callLog("onRegister");
    options.onRegister();
  }

  // register page
  Page(options as WechatMiniprogram.Page.Options<Data, Custom>);

  logger.debug(`Registered: Page ${name}`);
};

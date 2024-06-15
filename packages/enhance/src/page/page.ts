import { logger, wrapFunction } from "@mptool/shared";

import type { PageConstructor, PageOptions, PageQuery } from "./typings.js";
import { appState } from "../app/index.js";
import { mount } from "../bridge.js";
import { getConfig } from "../config/index.js";
import {
  ON_APP_AWAKE,
  ON_APP_LAUNCH,
  ON_PAGE_NAVIGATE,
  ON_PAGE_PRELOAD,
  ON_PAGE_READY,
  ON_PAGE_UNLOAD,
} from "../constant.js";
import { appEmitter, routeEmitter } from "../emitter/index.js";

let shouldBeFirstPage = true;

export const $Page: PageConstructor = <
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
>(
  name: string,
  options: PageOptions<Data, Custom>,
): void => {
  const { extendPage, injectPage } = getConfig();

  const callLog = (lifeCycle: string, args?: unknown): void =>
    logger.debug(`Page ${name}: ${lifeCycle} has been invoked`, args || "");
  const registerLog = (lifeCycle: string): void =>
    logger.debug(`Page ${name}: registered ${lifeCycle}`);

  // extend page config
  if (extendPage) extendPage(name, options);

  options.$name = name;

  options.$state = {
    /** 是否是首个启动页面 */
    firstOpen: false,
  };

  if (options.onAppLaunch) {
    if (appState.launch) {
      const { lOpt: onLaunchOptions } = appState;

      callLog("onAppLaunch");

      void options.onAppLaunch(
        onLaunchOptions as WechatMiniprogram.App.LaunchShowOption,
      );
    } else {
      appEmitter.on(ON_APP_LAUNCH, (onLaunchOptions) => {
        callLog("onAppLaunch");

        void options.onAppLaunch!(onLaunchOptions);
      });
    }

    registerLog("onAppLaunch");
  }

  if (options.onNavigate) {
    routeEmitter.on(
      `${ON_PAGE_NAVIGATE}:${name}`,
      (query: PageQuery): Promise<void> | void => {
        callLog("onNavigate", query);

        return options.onNavigate!(query);
      },
    );

    registerLog("onNavigate");
  }

  if (options.onPreload) {
    routeEmitter.on(
      `${ON_PAGE_PRELOAD}:${name}`,
      (query: PageQuery): void | Promise<void> => {
        callLog("onPreload", query);

        return options.onPreload!(query);
      },
    );

    registerLog("onPreload");
  }

  options.onLoad = wrapFunction(options.onLoad, (): void => {
    // After onLoad, onAwake is valid if defined
    if (options.onAwake) {
      appEmitter.on(ON_APP_AWAKE, (time: number) => {
        callLog("onAwake");

        void options.onAwake!(time);
      });
      registerLog("onAwake");
    }

    if (shouldBeFirstPage) {
      shouldBeFirstPage = false;

      options.$state!.firstOpen = true;
    }
  });

  options.onReady = wrapFunction(options.onReady, () =>
    appEmitter.emit(ON_PAGE_READY),
  );

  options.onUnload = wrapFunction(options.onUnload, () =>
    appEmitter.emit(ON_PAGE_UNLOAD),
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

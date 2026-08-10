import { logger, wrapFunction } from "@mptool/shared";

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
import { applyHotReload, fetchHotReload } from "../hotReload.js";
import type { PageConstructor, PageInstance, PageOptions, PageQuery } from "./typings.js";

let shouldBeFirstPage = true;

/** 页面实例到其 onAwake 监听器的映射，按实例隔离，避免多实例共享闭包 */
const onAwakeHandlers = new WeakMap<object, (time: number) => void>();

// oxlint-disable-next-line eslint/max-statements -- hot reload integration adds two statements to $Page
export const $Page: PageConstructor = <
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
>(
  name: string,
  options: PageOptions<Data, Custom>,
): void => {
  const { getPath: getRoute, extendPage, injectPage, hotReloadPattern } = getConfig();
  // 统一为带前导斜杠的路径，保证与导航触发端的事件 key 一致
  const route = `/${getRoute(name).replace(/^\//u, "")}`;

  // 启动页面热更新拉取（异步，不阻塞注册）
  // start the async hot-reload fetch (does not block registration)
  if (hotReloadPattern) fetchHotReload(name, hotReloadPattern);

  const callLog = (lifeCycle: string, args?: unknown): void => {
    logger.debug(`Page ${name}: ${lifeCycle} has been invoked`, args);
  };
  const registerLog = (lifeCycle: string): void => {
    logger.debug(`Page ${name}: registered ${lifeCycle}`);
  };

  /** OnAwake 监听器，用于在页面卸载时注销 */

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

      void options.onAppLaunch(onLaunchOptions as WechatMiniprogram.App.LaunchShowOption);
    } else {
      appEmitter.on(ON_APP_LAUNCH, (onLaunchOptions) => {
        callLog("onAppLaunch");

        // oxlint-disable-next-line typescript/no-non-null-assertion
        void options.onAppLaunch!(onLaunchOptions);
      });
    }

    registerLog("onAppLaunch");
  }

  if (options.onNavigate) {
    routeEmitter.on(`${ON_PAGE_NAVIGATE}:${route}`, (query: PageQuery): Promise<void> | void => {
      callLog("onNavigate", query);

      // oxlint-disable-next-line typescript/no-non-null-assertion
      return options.onNavigate!(query);
    });

    registerLog("onNavigate");
  }

  if (options.onPreload) {
    routeEmitter.on(`${ON_PAGE_PRELOAD}:${route}`, (query: PageQuery): void | Promise<void> => {
      callLog("onPreload", query);

      // oxlint-disable-next-line typescript/no-non-null-assertion
      return options.onPreload!(query);
    });

    registerLog("onPreload");
  }

  /* oxlint-disable typescript/no-misused-promises */
  options.onLoad = wrapFunction(
    options.onLoad,
    function handleOnLoad(this: PageInstance<Data, Custom>): void {
      // 将已就绪的热更新方法挂到实例（未就绪时登记，拉取完成后补挂）
      // apply hot-reload methods to the instance (register when not ready, patch on resolve)
      if (hotReloadPattern) applyHotReload(name, this);

      // After onLoad, onAwake is valid if defined
      if (options.onAwake) {
        const onAwakeHandler = (time: number): void => {
          callLog("onAwake");

          // oxlint-disable-next-line typescript/no-non-null-assertion
          void options.onAwake!(time);
        };

        onAwakeHandlers.set(this, onAwakeHandler);
        appEmitter.on(ON_APP_AWAKE, onAwakeHandler);
        registerLog("onAwake");
      }

      if (shouldBeFirstPage) {
        shouldBeFirstPage = false;

        // oxlint-disable-next-line typescript/no-non-null-assertion
        options.$state!.firstOpen = true;
      }
    },
  );
  /* oxlint-enable typescript/no-misused-promises */

  // oxlint-disable-next-line typescript/no-misused-promises
  options.onReady = wrapFunction(options.onReady, () => {
    appEmitter.emit(ON_PAGE_READY);
  });

  /* oxlint-disable typescript/no-misused-promises */
  options.onUnload = wrapFunction(
    options.onUnload,
    function handleOnUnload(this: PageInstance<Data, Custom>): void {
      appEmitter.emit(ON_PAGE_UNLOAD);

      // 注销 onAwake 监听器，避免页面卸载后残留
      const onAwakeHandler = onAwakeHandlers.get(this);

      if (onAwakeHandler) {
        appEmitter.off(ON_APP_AWAKE, onAwakeHandler);
        onAwakeHandlers.delete(this);
      }
    },
  );
  /* oxlint-enable typescript/no-misused-promises */

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

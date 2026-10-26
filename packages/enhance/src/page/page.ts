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
import {
  applyHotReload,
  dropHotReloadInstance,
  fetchHotReload,
  markHotReloadReady,
} from "../hotReload.js";
import type { PageConstructor, PageInstance, PageOptions, PageQuery } from "./typings.js";

let shouldBeFirstPage = true;

/** 页面实例到其 onAwake 监听器的映射，按实例隔离，避免多实例共享闭包 */
const onAwakeHandlers = new WeakMap<object, (time: number) => void>();

/**
 * Cleanup callbacks for page-definition level listeners (`onAppLaunch` / `onNavigate` /
 * `onPreload`), keyed by page name. A page module can be evaluated twice, which would otherwise
 * register the same listeners again and invoke them twice per event.
 *
 * 页面定义级监听器（`onAppLaunch` / `onNavigate` / `onPreload`）的清理函数，按页面名登记。
 * 页面模块可能被执行两次，否则同一监听器会被重复注册并在每次事件中重复触发。
 */
const pageLifecycleCleanups = new Map<string, () => void>();

/**
 * Invoke an optional page lifecycle and report a rejected promise instead of leaving it unhandled.
 *
 * The mini-program runtime has no `unhandledrejection` hook, so a rejected async `onAppLaunch` /
 * `onAwake` would otherwise vanish silently (or surface as an unhandled rejection in tests/Node).
 *
 * 触发可选的页面生命周期，并捕获其 Promise 拒绝（记录日志），避免产生 unhandled rejection。 小程序运行时没有 `unhandledrejection` 钩子，异步
 * `onAppLaunch` / `onAwake` 的拒绝否则会被静默吞掉。
 *
 * @param name - Page name / 页面名称
 * @param lifeCycle - Lifecycle name / 生命周期名称
 * @param handler - Lifecycle handler / 生命周期处理函数
 */
const invokeAsyncLifecycle = async (
  name: string,
  lifeCycle: string,
  handler: () => void | Promise<void>,
): Promise<void> => {
  try {
    await handler();
  } catch (err) {
    logger.error(`Page ${name}: ${lifeCycle} rejected`, err);
  }
};

/**
 * Register page-definition lifecycle listeners (`onAppLaunch` / `onNavigate` / `onPreload`) and
 * unregister a previous registration of the same page name first: a page module can be evaluated
 * twice, which would otherwise accumulate listeners and fire each lifecycle handler twice.
 *
 * 注册页面定义级生命周期监听器（`onAppLaunch` / `onNavigate` / `onPreload`），并先注销同名页面上一次
 * 注册的监听器：页面模块可能被执行两次，否则监听器会累积并让生命周期重复触发。
 *
 * @param name - Page name / 页面名称
 * @param route - Normalized route key / 规范化后的路由 key
 * @param options - Page options / 页面选项
 * @param callLog - Lifecycle debug logger / 生命周期调试日志
 */
const registerPageLifecycleListeners = <
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
>(
  name: string,
  route: string,
  options: PageOptions<Data, Custom>,
  callLog: (lifeCycle: string, args?: unknown) => void,
): void => {
  // Unregister the listeners of a previous registration for the same page name, otherwise a page
  // module evaluated twice accumulates listeners and fires each lifecycle handler twice.
  // 同一页面被重复注册时，先注销上一次注册的监听器，避免监听器累积导致生命周期重复触发。
  const previousLifecycleCleanup = pageLifecycleCleanups.get(name);

  if (previousLifecycleCleanup) {
    logger.warn(`Page ${name}: registered more than once, replacing its lifecycle listeners`);
    previousLifecycleCleanup();
    pageLifecycleCleanups.delete(name);
  }

  const lifecycleCleanups: (() => void)[] = [];
  const { onAppLaunch } = options;

  if (onAppLaunch) {
    if (appState.launch) {
      const { lOpt: onLaunchOptions } = appState;

      callLog("onAppLaunch");

      void invokeAsyncLifecycle(name, "onAppLaunch", () =>
        onAppLaunch(onLaunchOptions as WechatMiniprogram.App.LaunchShowOption),
      );
    } else {
      const onLaunchHandler = (onLaunchOptions: WechatMiniprogram.App.LaunchShowOption): void => {
        callLog("onAppLaunch");

        void invokeAsyncLifecycle(name, "onAppLaunch", () => onAppLaunch(onLaunchOptions));
      };

      appEmitter.on(ON_APP_LAUNCH, onLaunchHandler);
      lifecycleCleanups.push(() => {
        appEmitter.off(ON_APP_LAUNCH, onLaunchHandler);
      });
    }

    logger.debug(`Page ${name}: registered onAppLaunch`);
  }

  if (options.onNavigate) {
    const { onNavigate } = options;
    const onNavigateHandler = (query: PageQuery): Promise<void> | void => {
      callLog("onNavigate", query);

      return onNavigate(query);
    };

    routeEmitter.on(`${ON_PAGE_NAVIGATE}:${route}`, onNavigateHandler);
    lifecycleCleanups.push(() => {
      routeEmitter.off(`${ON_PAGE_NAVIGATE}:${route}`, onNavigateHandler);
    });

    logger.debug(`Page ${name}: registered onNavigate`);
  }

  if (options.onPreload) {
    const { onPreload } = options;
    const onPreloadHandler = (query: PageQuery): void | Promise<void> => {
      callLog("onPreload", query);

      return onPreload(query);
    };

    routeEmitter.on(`${ON_PAGE_PRELOAD}:${route}`, onPreloadHandler);
    lifecycleCleanups.push(() => {
      routeEmitter.off(`${ON_PAGE_PRELOAD}:${route}`, onPreloadHandler);
    });

    logger.debug(`Page ${name}: registered onPreload`);
  }

  if (lifecycleCleanups.length > 0) {
    pageLifecycleCleanups.set(name, () => {
      for (const dispose of lifecycleCleanups) dispose();
    });
  }
};

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

  // extend page config
  if (extendPage) extendPage(name, options);

  options.$name = name;

  options.$state = {
    /** 是否是首个启动页面 */
    firstOpen: false,
  };

  registerPageLifecycleListeners(name, route, options, callLog);

  /* oxlint-disable typescript/no-misused-promises */
  options.onLoad = wrapFunction(
    options.onLoad,
    function handleOnLoad(this: PageInstance<Data, Custom>): void {
      // Give every page instance its own `$state`, seeded from the page definition so data prepared
      // by the pre-instance lifecycles (`onAppLaunch` / `onPreload` / `onNavigate`, whose `this` is
      // the page options) is inherited by this instance.
      // 为每个页面实例创建独立的 `$state`，并以页面定义上的状态为初始值：实例创建前的生命周期
      // （`onAppLaunch` / `onPreload` / `onNavigate`，其 `this` 为页面选项对象）写入的数据会由此继承。
      const isFirstPage = shouldBeFirstPage;

      shouldBeFirstPage = false;
      this.$state = { ...options.$state, firstOpen: isFirstPage };

      // 将已就绪的热更新方法挂到实例（未就绪时登记，拉取完成后补挂）
      // apply hot-reload methods to the instance (register when not ready, patch on resolve)
      if (hotReloadPattern) applyHotReload(name, this);

      // After onLoad, onAwake is valid if defined
      if (options.onAwake) {
        const { onAwake } = options;
        const onAwakeHandler = (time: number): void => {
          callLog("onAwake");

          void invokeAsyncLifecycle(name, "onAwake", () => onAwake(time));
        };

        onAwakeHandlers.set(this, onAwakeHandler);
        appEmitter.on(ON_APP_AWAKE, onAwakeHandler);
        registerLog("onAwake");
      }
    },
  );
  /* oxlint-enable typescript/no-misused-promises */

  /* oxlint-disable typescript/no-misused-promises */
  options.onReady = wrapFunction(
    options.onReady,
    function handleOnReady(this: PageInstance<Data, Custom>): void {
      // 标记页面已 ready，触发待执行的热更新 onHotReload 钩子
      // mark the page as ready and flush the pending hot-reload hook
      if (hotReloadPattern) markHotReloadReady(this);

      appEmitter.emit(ON_PAGE_READY);
    },
  );
  /* oxlint-enable typescript/no-misused-promises */

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

      // 从热更新登记中移除，避免晚到的拉取补挂已卸载页面
      dropHotReloadInstance(this);
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

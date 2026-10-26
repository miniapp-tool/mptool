import { logger, wrapFunction } from "@mptool/shared";

import { mount } from "../bridge.js";
import { getConfig } from "../config/index.js";
import { ON_APP_AWAKE } from "../constant.js";
import { appEmitter } from "../emitter/index.js";
import {
  applyHotReload,
  dropHotReloadInstance,
  fetchHotReload,
  markHotReloadReady,
} from "../hotReload.js";
import type { PageConstructor, PageInstance, PageOptions } from "./typings.js";

let shouldBeFirstPage = true;

/** 页面实例到其 onAwake 监听器的映射，按实例隔离，避免多实例共享闭包 */
const onAwakeHandlers = new WeakMap<object, (time: number) => void>();

/**
 * Invoke an optional page lifecycle and report a rejected promise instead of leaving it unhandled.
 *
 * The mini-program runtime has no `unhandledrejection` hook, so a rejected async `onAwake` would
 * otherwise vanish silently (or surface as an unhandled rejection in tests/Node).
 *
 * 触发可选的页面生命周期，并捕获其 Promise 拒绝（记录日志），避免产生 unhandled rejection。 小程序运行时没有 `unhandledrejection` 钩子，异步
 * `onAwake` 的拒绝否则会被静默吞掉。
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

export const $Page: PageConstructor = <
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
>(
  name: string,
  options: PageOptions<Data, Custom>,
): void => {
  const { extendPage, injectPage, hotReloadPattern } = getConfig();

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

  /* oxlint-disable typescript/no-misused-promises */
  options.onLoad = wrapFunction(
    options.onLoad,
    function handleOnLoad(this: PageInstance<Data, Custom>): void {
      // Give every page instance its own `$state`, seeded from the page definition.
      // 为每个页面实例创建独立的 `$state`，并以页面定义上的状态为初始值。
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
    },
  );
  /* oxlint-enable typescript/no-misused-promises */

  /* oxlint-disable typescript/no-misused-promises */
  options.onUnload = wrapFunction(
    options.onUnload,
    function handleOnUnload(this: PageInstance<Data, Custom>): void {
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

import { logger, wrapFunction } from "@mptool/shared";

import { mount } from "../bridge.js";
import { getConfig } from "../config/index.js";
import { ON_APP_AWAKE } from "../constant.js";
import { appEmitter } from "../emitter/index.js";
import {
  applyHotReload,
  dropHotReloadInstance,
  fetchHotReload,
  getHotOnLoad,
  markHotReloadReady,
  setFrameworkLifecycles,
} from "../hotReload.js";
import type { PageConstructor, PageInstance, PageOptions } from "./typings.js";

let shouldBeFirstPage = true;

/** 页面实例到其 onAwake 监听器的映射，按实例隔离，避免多实例共享闭包 */
const onAwakeHandlers = new WeakMap<object, (time: number) => void>();

/**
 * Page `onUnload` framework pre-hook: clears child-component `$refs`, unregisters the `onAwake`
 * listener, and drops the instance from hot-reload bookkeeping.
 *
 * 页面 `onUnload` 框架前置钩子：清空子组件 `$refs`、注销 `onAwake` 监听器，并从热更新登记中移除实例。
 *
 * @param this - Page instance / 页面实例
 */
const handleOnUnload = function handleOnUnload(
  this: PageInstance<WechatMiniprogram.IAnyObject, WechatMiniprogram.IAnyObject>,
): void {
  // 释放当前实例的子组件引用（每个实例独占自己的 Map）
  // release this instance's child-component references (every instance owns its own Map)
  this.$refs?.clear();

  // 注销 onAwake 监听器，避免页面卸载后残留
  const onAwakeHandler = onAwakeHandlers.get(this);

  if (onAwakeHandler) {
    appEmitter.off(ON_APP_AWAKE, onAwakeHandler);
    onAwakeHandlers.delete(this);
  }

  // 从热更新登记中移除，避免晚到的拉取补挂已卸载页面
  dropHotReloadInstance(this);
};

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

  const userOnLoad = options.onLoad;
  const handleOnLoad = function handleOnLoad(this: PageInstance<Data, Custom>): void {
    // Give every page instance its own `$state`, seeded from the page definition.
    // 为每个页面实例创建独立的 `$state`，并以页面定义上的状态为初始值。
    const isFirstPage = shouldBeFirstPage;

    shouldBeFirstPage = false;
    this.$state = { ...options.$state, firstOpen: isFirstPage };

    // Every page instance needs its own `$refs`: the page definition is shared by all instances of
    // the same page, so a single Map on it would leak child components between instances.
    // Preserve an existing Map if a child component attached before `onLoad`.
    // 每个页面实例都需要独立的 `$refs`：页面定义被同一页面的所有实例共享，挂在定义上的 Map 会让
    // 子组件引用在实例之间串台。若子组件在 `onLoad` 之前已完成 `attached`，则保留已创建的 Map。
    // oxlint-disable-next-line typescript/strict-boolean-expressions -- $refs is undefined unless a child attached before onLoad
    if (!this.$refs) this.$refs = new Map();

    // 将已就绪的热更新方法挂到实例（未就绪时登记，拉取完成后补挂）
    // apply hot-reload methods to the instance (register when not ready, patch on resolve)
    if (hotReloadPattern) applyHotReload(name, this);

    // After onLoad, onAwake is valid if defined
    if (options.onAwake) {
      const { onAwake } = options;
      const onAwakeHandler = (time: number): void => {
        callLog("onAwake");

        // `onAwake` is typed with the page instance as `this`, so it must be invoked with the
        // instance (`this` of `handleOnLoad`) instead of as an unbound function.
        // `onAwake` 的类型声明以页面实例为 `this`，因此必须绑定实例调用（即 `handleOnLoad` 的 `this`），
        // 不能作为无绑定函数调用。
        void invokeAsyncLifecycle(name, "onAwake", () => onAwake.call(this, time));
      };

      onAwakeHandlers.set(this, onAwakeHandler);
      appEmitter.on(ON_APP_AWAKE, onAwakeHandler);
      registerLog("onAwake");
    }
  };

  options.onLoad = function onLoad(
    this: PageInstance<Data, Custom>,
    query: Record<string, string | undefined>,
  ): void | Promise<void> {
    handleOnLoad.call(this);

    const activeOnLoad = getHotOnLoad(this) ?? userOnLoad;

    if (activeOnLoad) return activeOnLoad.call(this, query);
  };

  const handleOnReady = function handleOnReady(this: PageInstance<Data, Custom>): void {
    // 标记页面已 ready，触发待执行的热更新 onHotReload 钩子
    // mark the page as ready and flush the pending hot-reload hook
    if (hotReloadPattern) markHotReloadReady(this);
  };

  /* oxlint-disable typescript/no-misused-promises */
  options.onReady = wrapFunction(options.onReady, handleOnReady);
  options.onUnload = wrapFunction(options.onUnload, handleOnUnload);
  /* oxlint-enable typescript/no-misused-promises */

  setFrameworkLifecycles(options, {
    onLoad: handleOnLoad as (this: object, ...args: unknown[]) => void,
    onReady: handleOnReady as (this: object, ...args: unknown[]) => void,
    onUnload: handleOnUnload as (this: object, ...args: unknown[]) => void,
  });

  mount(options, true);

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

import { logger } from "@mptool/shared";

import type {
  ComponentOptions,
  InferPropTypes,
  PropsOptions,
  TrivialComponentInstance,
} from "./component/index.js";
import { getRef } from "./component/store";
import { getConfig } from "./config/index.js";
import { userEmitter } from "./emitter/index.js";
import { getTrigger, normalizePath } from "./navigator/index.js";
import type {
  ExtendedPageMethods,
  PageInstance,
  PageOptions,
  TrivialPageInstance,
} from "./page/index.js";

export type NavigatorType = "navigateTo" | "reLaunch" | "switchTab" | "redirectTo";

export type NavigatorOptionsType =
  | WechatMiniprogram.NavigateToOption
  | WechatMiniprogram.ReLaunchOption
  | WechatMiniprogram.RedirectToOption
  | WechatMiniprogram.SwitchTabOption;

export const go: (pageName: string) => Promise<WechatMiniprogram.NavigateToSuccessCallbackResult> =
  getTrigger("navigateTo");
export const redirect: (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult> =
  getTrigger("redirectTo");
export const switchTab: (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult> =
  getTrigger("switchTab");
export const reLaunch: (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult> =
  getTrigger("reLaunch");

const clickHandlerFactory = function (
  action: (pageName: string) => Promise<unknown>,
): (event: WechatMiniprogram.Touch) => Promise<void> {
  return async function touchHandler(
    this: TrivialPageInstance,
    event?: WechatMiniprogram.TouchEvent<
      WechatMiniprogram.IAnyObject,
      WechatMiniprogram.IAnyObject,
      { before?: string; after?: string; url?: string }
    >,
  ): Promise<void> {
    if (!event) return;

    const { before, after, url } = event.currentTarget.dataset;

    // oxlint-disable-next-line typescript/strict-boolean-expressions
    if (this && before && typeof this[before] === "function")
      (this[before] as (event: WechatMiniprogram.Touch) => void)(event);

    if (!url) return;

    let result: unknown;

    try {
      result = await action(url);
    } catch (err) {
      // Never let a rejected navigation escape the click handler as an unhandled rejection.
      // 导航失败时记录日志，避免 click handler 产生 unhandled rejection。
      logger.error(`Navigation to "${url}" failed`, err);

      return;
    }

    // A skipped navigation resolves to `undefined`; only run `after` for a real jump.
    // 未真正跳转时解析为 `undefined`，此时不执行 after。
    // oxlint-disable-next-line no-undefined -- locked navigations resolve to undefined
    if (result === undefined) return;

    // oxlint-disable-next-line typescript/strict-boolean-expressions
    if (this && after && typeof this[after] === "function")
      (this[after] as (event: WechatMiniprogram.Touch) => void)(event);
  };
};

const bindGo = clickHandlerFactory(go);
const bindRedirect = clickHandlerFactory(redirect);
const bindSwitch = clickHandlerFactory(switchTab);
const bindRelaunch = clickHandlerFactory(reLaunch);

/**
 * 返回，默认返回上一页
 *
 * @param delta - 后退层数
 * @returns Promise resolving to navigation result
 */
const back = (delta = 1): Promise<WechatMiniprogram.GeneralCallbackResult> => {
  const { home } = getConfig();
  const pageStackLength = getCurrentPages().length;
  const maxDelta = pageStackLength - 1;

  // 页面栈不足以后退 delta 层时，回到主页（若配置了 home）
  if (pageStackLength <= delta && home) return reLaunch(home);

  // 无 home 配置且已处于栈底时，不触发 navigateBack({ delta: 0 })
  if (maxDelta <= 0) {
    logger.debug("Cannot go back: already at the first page");

    return Promise.resolve({ errMsg: "" });
  }

  // 无 home 配置时，钳制 delta 至实际可退的最大层数，避免后退失败
  return wx.navigateBack({ delta: Math.min(delta, maxDelta) });
};

const bindBack = async function bindBack(
  this: TrivialPageInstance,
  event?: WechatMiniprogram.TouchEvent<
    WechatMiniprogram.IAnyObject,
    WechatMiniprogram.IAnyObject,
    { before?: string; after?: string; delta?: number | string }
  >,
): Promise<void> {
  if (!event) return;

  const { before, after, delta = 1 } = event.currentTarget.dataset;

  // oxlint-disable-next-line typescript/strict-boolean-expressions
  if (this && before && typeof this[before] === "function")
    (this[before] as (event: WechatMiniprogram.Touch) => void)(event);

  try {
    await back(Number(delta));
  } catch (err) {
    logger.error("Navigation back failed", err);

    return;
  }

  // oxlint-disable-next-line typescript/strict-boolean-expressions
  if (this && after && typeof this[after] === "function")
    (this[after] as (event: WechatMiniprogram.Touch) => void)(event);
};

/**
 * 获得页面实例
 *
 * @returns 页面实例对象，页面栈为空时返回 `undefined`
 */
const getPage = <
  Data extends WechatMiniprogram.IAnyObject = WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject = WechatMiniprogram.IAnyObject,
>(): PageInstance<Data, Custom> | undefined =>
  [...getCurrentPages()].pop() as PageInstance<Data, Custom> | undefined;

export const bind = function (
  this: TrivialComponentInstance,
  touchEvent: WechatMiniprogram.Touch<{
    id: number;
    event: string;
    args: unknown[];
  }>,
): void {
  const { args, event, id } = touchEvent.detail;

  switch (event) {
    // run private attach
    case "$attached": {
      const ref = getRef(id);

      if (!ref) break;

      const refName = ref.$refID;

      if (refName) this.$refs.set(refName, ref);

      ref.$attached(this);
      break;
    }
    default: {
      const method = this[event] as ((...args: unknown[]) => unknown) | undefined;

      // Only dispatch real methods: a truthy non-function property (`data`, `$state`, ...) must not
      // be called, otherwise `method.apply` throws a `TypeError`.
      // 只调用真正的方法：命中 `data`、`$state` 等真值非函数属性时不得调用，否则 `method.apply` 会抛
      // `TypeError`。
      if (typeof method === "function") method.apply(this, args);
    }
  }
};

/**
 * 挂载页面方法
 *
 * @param ctx 需要挂载页面的指针
 */
export function mount<
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
>(
  ctx: PageOptions<Data, Custom> & Partial<ExtendedPageMethods<Data, Custom>>,
  /**
   * Whether `ctx` is a page definition. Page instances create their own `$refs` in `onLoad`, so the
   * shared page definition must not own one.
   *
   * 是否为页面定义。页面实例会在 `onLoad` 中创建独立的 `$refs`，共享的页面定义上不应挂载。
   */
  isPage?: boolean,
): void;

/**
 * 挂载组件方法
 *
 * @param ctx 需要挂载组件的指针
 */
export function mount<
  Data extends WechatMiniprogram.Component.DataOption,
  Property extends PropsOptions,
  Method extends WechatMiniprogram.Component.MethodOption,
  Behavior extends WechatMiniprogram.Component.BehaviorOption,
  // oxlint-disable-next-line typescript/no-generated-empty-object-type -- deliberate empty-object type
  InstanceProps extends WechatMiniprogram.IAnyObject = Record<never, never>,
  IsPage extends boolean = false,
>(
  ctx: ComponentOptions<Data, Property, Method, Behavior, InstanceProps, IsPage> &
    Partial<
      ExtendedPageMethods<
        Data & InferPropTypes<Property>,
        InstanceProps &
          Method &
          // oxlint-disable-next-line typescript/no-generated-empty-object-type -- deliberate empty-object type
          (IsPage extends true ? WechatMiniprogram.Page.ILifetime : Record<never, never>)
      >
    >,
): void;

export function mount(
  ctx: Partial<ExtendedPageMethods<WechatMiniprogram.IAnyObject, WechatMiniprogram.IAnyObject>> &
    WechatMiniprogram.IAnyObject,
  isPage = false,
): void {
  const config = getConfig();

  // oxlint-disable-next-line id-length
  ctx.$ = bind;

  // Page instances create their own `$refs` in `onLoad`: a Map on the shared page definition would
  // be shared by every instance of the same page. Components are mounted per instance in
  // `created`, so their `$refs` is created here.
  // 页面实例在 `onLoad` 中创建独立的 `$refs`：若在共享的页面定义上创建 Map，同一页面的所有实例会共享它。
  // 组件在 `created` 中按实例挂载，因此可以在此创建 `$refs`。
  if (!isPage) ctx.$refs = new Map();

  ctx.$on = userEmitter.on;
  ctx.$off = userEmitter.off;
  ctx.$emit = userEmitter.emit;
  ctx.$emitAsync = userEmitter.emitAsync;

  // 路由方法
  ctx.$go = go;
  ctx.$redirect = redirect;
  ctx.$switch = switchTab;
  ctx.$reLaunch = reLaunch;
  ctx.$back = back;

  // 页面信息
  ctx.$currentPage = getPage;
  ctx.$getPath = (name: string): string => normalizePath(config.getPath(name));

  // 点击跳转代理
  ctx.$bindGo = bindGo;
  ctx.$bindRedirect = bindRedirect;
  ctx.$bindSwitch = bindSwitch;
  ctx.$bindRelaunch = bindRelaunch;
  ctx.$bindBack = bindBack;
}

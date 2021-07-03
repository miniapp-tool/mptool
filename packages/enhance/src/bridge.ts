import { getRef } from "./component/store";
import { getConfig } from "./config";
import { routeEmitter, userEmitter } from "./event";
import { getPathDetail, getTrigger } from "./navigator";

import type { ComponentOptions, UnknownComponentInstance } from "./component";
import type { ExtendedPageMethods, PageInstance, PageOptions } from "./page";

export type NavigatorType =
  | "navigateTo"
  | "reLaunch"
  | "switchTab"
  | "redirectTo";

export type NavigatorOptionsType =
  | WechatMiniprogram.NavigateToOption
  | WechatMiniprogram.ReLaunchOption
  | WechatMiniprogram.RedirectToOption
  | WechatMiniprogram.SwitchTabOption;

const navigate = getTrigger("navigateTo");
const redirect = getTrigger("redirectTo");
const switchTab = getTrigger("switchTab");
const reLaunch = getTrigger("reLaunch");

/** 导航方法 */
const routeMethods = { navigate, redirect, switchTab, reLaunch };

type RouteType = "navigate" | "redirect" | "switchTab" | "reLaunch";

function clickHandlerFactory(
  type: RouteType
): (event: WechatMiniprogram.Touch) => Promise<void> | void {
  const route = routeMethods[type];

  return function touchHandler(
    this: PageInstance<
      WechatMiniprogram.IAnyObject,
      WechatMiniprogram.IAnyObject
    >,
    event: WechatMiniprogram.Touch
  ): Promise<void> | void {
    if (event) {
      const { before, after, url } = event.currentTarget.dataset as {
        before?: string;
        after?: string;
        url?: string;
      };

      if (this && before && typeof this[before] === "function")
        (this[before] as (event: WechatMiniprogram.Touch) => void)(event);

      if (url)
        return route(url).then(() => {
          if (this && after && typeof this[after] === "function")
            (this[after] as (event: WechatMiniprogram.Touch) => void)(event);
        });
    }
  };
}

const bindGo = clickHandlerFactory("navigate");
const bindRedirect = clickHandlerFactory("redirect");
const bindSwitch = clickHandlerFactory("switchTab");
const bindRelaunch = clickHandlerFactory("reLaunch");

/**
 * 返回，默认返回上一页
 *
 * @param [delta=1] 后退层数
 */
const back = (delta = 1): void => {
  void wx.navigateBack({ delta });
};

/**
 * 获得页面实例
 *
 * @returns 页面实例对象
 */
const getPage = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V = Record<string, any>
>(): WechatMiniprogram.Page.Instance<T, V> =>
  getCurrentPages().slice(0).pop() as WechatMiniprogram.Page.Instance<T, V>;

/**
 * 预加载
 *
 * @param pageNamewithArg 需要预加载的地址
 */
const preload = (pageNamewithArg: string): void => {
  /** 页面名称 */
  const { name, query } = getPathDetail(pageNamewithArg);

  routeEmitter.emit(`preload:${name}`, query);
};

export function bind(
  this: UnknownComponentInstance,
  touchEvent: WechatMiniprogram.Touch<{
    id: number;
    event: string;
    args: unknown[];
  }>
): void {
  const { args, event, id } = touchEvent.detail;

  switch (event) {
    // run private attach
    case "_$attached": {
      const ref = getRef(id) as UnknownComponentInstance | undefined;

      if (!ref) break;

      const refName = ref.$refID;

      if (refName && this.$refs) this.$refs[refName] = ref;

      ref._$attached(this);
      break;
    }
    default: {
      const method = this[event] as
        | ((...args: unknown[]) => unknown)
        | undefined;

      if (method) method.apply(this, args);
    }
  }
}

/**
 * 挂载页面方法
 *
 * @param ctx 需要挂载页面的指针
 */
export function mount<Data, Custom>(
  ctx: PageOptions<Data, Custom> & Partial<ExtendedPageMethods>
): void;

/**
 * 挂载组件方法
 *
 * @param ctx 需要挂载组件的指针
 */
export function mount<
  Data extends WechatMiniprogram.Component.DataOption,
  Property extends WechatMiniprogram.Component.PropertyOption,
  Method extends WechatMiniprogram.Component.MethodOption,
  CustomInstanceProperty extends WechatMiniprogram.IAnyObject = Record<
    string,
    never
  >,
  IsPage extends boolean = false
>(
  ctx: ComponentOptions<
    Data,
    Property,
    Method,
    CustomInstanceProperty,
    IsPage
  > &
    Partial<ExtendedPageMethods>
): void;

export function mount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: Partial<ExtendedPageMethods> & Record<string, any>
): void {
  ctx.$ = bind;

  // 实例引用集合
  ctx.$refs = {};

  ctx.$emitter = userEmitter;

  // 路由方法
  ctx.$go = navigate;
  ctx.$redirect = redirect;
  ctx.$switch = switchTab;
  ctx.$launch = reLaunch;
  ctx.$back = back;

  // 页面预加载
  ctx.$preload = preload;

  // 页面信息
  ctx.$currentPage = getPage;
  ctx.$getName = getConfig().getName;
  ctx.$getPath = getConfig().getRoute;

  // 点击跳转代理
  ctx.$bindGo = bindGo;
  ctx.$bindRedirect = bindRedirect;
  ctx.$bindSwitch = bindSwitch;
  ctx.$bindRelaunch = bindRelaunch;
}

import type {
  ComponentOptions,
  InferPropTypes,
  PropsOptions,
  TrivialComponentInstance,
} from "./component/index.js";
import { getRef } from "./component/store";
import { getConfig } from "./config/index.js";
import { userEmitter } from "./emitter/index.js";
import { getTrigger } from "./navigator/index.js";
import type {
  ExtendedPageMethods,
  PageInstance,
  PageOptions,
  TrivialPageInstance,
} from "./page/index.js";

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

export const go = getTrigger("navigateTo");
export const redirect = getTrigger("redirectTo");
export const switchTab = getTrigger("switchTab");
export const reLaunch = getTrigger("reLaunch");

function clickHandlerFactory(
  action: (pageName: string) => Promise<unknown>,
): (event: WechatMiniprogram.Touch) => Promise<void> | void {
  return function touchHandler(
    this: TrivialPageInstance,
    event?: WechatMiniprogram.TouchEvent<
      WechatMiniprogram.IAnyObject,
      WechatMiniprogram.IAnyObject,
      { before?: string; after?: string; url?: string }
    >,
  ): Promise<void> | void {
    if (event) {
      const { before, after, url } = event.currentTarget.dataset as {
        before?: string;
        after?: string;
        url?: string;
      };

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this && before && typeof this[before] === "function")
        (this[before] as (event: WechatMiniprogram.Touch) => void)(event);

      if (url)
        return action(url).then(() => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (this && after && typeof this[after] === "function")
            (this[after] as (event: WechatMiniprogram.Touch) => void)(event);
        });
    }
  };
}

const bindGo = clickHandlerFactory(go);
const bindRedirect = clickHandlerFactory(redirect);
const bindSwitch = clickHandlerFactory(switchTab);
const bindRelaunch = clickHandlerFactory(reLaunch);

/**
 * 返回，默认返回上一页
 *
 * @param [delta=1] 后退层数
 */
const back = (delta = 1): Promise<WechatMiniprogram.GeneralCallbackResult> => {
  const { home } = getConfig();

  return getCurrentPages().length <= delta && home
    ? reLaunch(home)
    : wx.navigateBack({ delta });
};

const bindBack = function touchHandler(
  this: TrivialPageInstance,
  event?: WechatMiniprogram.TouchEvent<
    WechatMiniprogram.IAnyObject,
    WechatMiniprogram.IAnyObject,
    { before?: string; after?: string; delta?: number }
  >,
): Promise<void> | void {
  if (event) {
    const { before, after, delta = 1 } = event.currentTarget.dataset;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this && before && typeof this[before] === "function")
      (this[before] as (event: WechatMiniprogram.Touch) => void)(event);

    return Promise.resolve(back(Number(delta))).then(() => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this && after && typeof this[after] === "function")
        (this[after] as (event: WechatMiniprogram.Touch) => void)(event);
    });
  }
};

/**
 * 获得页面实例
 *
 * @returns 页面实例对象
 */
const getPage = <
  Data extends WechatMiniprogram.IAnyObject = WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject = WechatMiniprogram.IAnyObject,
>(): PageInstance<Data, Custom> =>
  getCurrentPages().slice(0).pop() as PageInstance<Data, Custom>;

export function bind(
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
      const ref = getRef(id) as TrivialComponentInstance | undefined;

      if (!ref) break;

      const refName = ref.$refID;

      if (refName) this.$refs[refName] = ref;

      ref.$attached(this);
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
export function mount<
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
>(
  ctx: PageOptions<Data, Custom> & Partial<ExtendedPageMethods<Data, Custom>>,
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
  InstanceProps extends WechatMiniprogram.IAnyObject = Record<never, never>,
  IsPage extends boolean = false,
>(
  ctx: ComponentOptions<
    Data,
    Property,
    Method,
    Behavior,
    InstanceProps,
    IsPage
  > &
    Partial<
      ExtendedPageMethods<
        Data & InferPropTypes<Property>,
        InstanceProps &
          Method &
          (IsPage extends true
            ? WechatMiniprogram.Page.ILifetime
            : Record<never, never>)
      >
    >,
): void;

export function mount(
  ctx: Partial<
    ExtendedPageMethods<
      WechatMiniprogram.IAnyObject,
      WechatMiniprogram.IAnyObject
    >
  > &
    WechatMiniprogram.IAnyObject,
): void {
  const config = getConfig();

  ctx.$ = bind;

  // 实例引用集合
  ctx.$refs = {};

  // eslint-disable-next-line @typescript-eslint/unbound-method
  ctx.$on = userEmitter.on;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  ctx.$off = userEmitter.off;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  ctx.$emit = userEmitter.emit;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  ctx.$emitAsync = userEmitter.emitAsync;

  // 路由方法
  ctx.$go = go;
  ctx.$redirect = redirect;
  ctx.$switch = switchTab;
  ctx.$reLaunch = reLaunch;
  ctx.$back = back;

  // 页面信息
  ctx.$currentPage = getPage;
  ctx.$getPath = config.getPath;

  // 点击跳转代理
  ctx.$bindGo = bindGo;
  ctx.$bindRedirect = bindRedirect;
  ctx.$bindSwitch = bindSwitch;
  ctx.$bindRelaunch = bindRelaunch;
  ctx.$bindBack = bindBack;
}

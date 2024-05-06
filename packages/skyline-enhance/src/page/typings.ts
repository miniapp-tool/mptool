import type { bind } from "../bridge.js";
import type { RefMap } from "../component/index.js";
import type { InstanceEmitterMethods } from "../emitter/index.js";
import type { NavigatorMethods } from "../navigator/index.js";

export interface PageState {
  /** 是否是打开的第一个页面 */
  firstOpen: boolean;
}

export interface ExtendedPageLifeCycles {
  /**
   * 在页面注册时调用
   *
   * 此时页面的 this 还不可用
   */
  onRegister(): void;

  /**
   * 小程序在切入后台后被唤醒
   *
   * @param time 休眠时间 (单位 ms)
   */
  onAwake(time: number): void | Promise<void>;
}

export interface ExtendedPageProperties {
  /** 当前页面名称 */
  $name: string;
  /** 一些由框架生成的页面状态 */
  $state: PageState;

  /**
   * 指定了 `ref` 的子组件实例映射
   *
   * 示例:
   *
   * ```html
   * <custom-component binding="$" ref="customComp"/>
   * ```
   *
   * ```js
   * $Page({
   *   onLoad() {
   *     this.$refs.customComp // 根据ref属性获取子组件的实例引用
   *   }
   * });
   * ```
   */
  $refs: RefMap;
}

export interface ExtendedPageMethods<
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
> extends InstanceEmitterMethods,
    NavigatorMethods {
  /**
   * 绑定组件函数
   */
  $: typeof bind;
  /**
   * 获取当前页面实例。
   */
  $currentPage(): PageInstance<Data, Custom>;

  /**
   * 获得页面简称
   *
   * @param url 页面地址
   */
  $getName(url: string): string;

  /**
   * 获得页面路径
   *
   * @param name 页面简称
   */
  $getPath(name: string): string;
}

export type PageInstance<
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
> = WechatMiniprogram.OptionalInterface<
  WechatMiniprogram.Page.ILifetime & ExtendedPageLifeCycles
> &
  WechatMiniprogram.Page.InstanceProperties &
  WechatMiniprogram.Page.InstanceMethods<Data> &
  ExtendedPageMethods<Data, Custom> &
  ExtendedPageProperties &
  WechatMiniprogram.Page.Data<Data> &
  Custom;

export type PageOptions<
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
> = (Custom &
  Partial<WechatMiniprogram.Page.Data<Data>> &
  Partial<WechatMiniprogram.Page.ILifetime & ExtendedPageLifeCycles> &
  Partial<ExtendedPageProperties> & {
    options?: WechatMiniprogram.Component.ComponentOptions;
  }) &
  ThisType<PageInstance<Data, Custom>>;

export type PageConstructor = <
  Data extends WechatMiniprogram.IAnyObject,
  Custom extends WechatMiniprogram.IAnyObject,
>(
  name: string,
  options: PageOptions<Data, Custom>,
) => void;

export type TrivialPageInstance = PageInstance<
  WechatMiniprogram.IAnyObject,
  WechatMiniprogram.IAnyObject
>;

export type TrivialPageOptions = PageOptions<
  WechatMiniprogram.IAnyObject,
  WechatMiniprogram.IAnyObject
>;

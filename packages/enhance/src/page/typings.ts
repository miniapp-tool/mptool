import { bind } from "../bridge";

import type { RefMap } from "../component";
import type { InstanceEmitterMethods } from "../emitter";
import type { NavigatorMethods } from "../navigator";

export interface PageQuery {
  [props: string]: string;
}

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
   * 在 `App.onLaunch` 触发时调用
   *
   * @param App.onLaunch 参数
   */
  onAppLaunch(
    options: WechatMiniprogram.App.LaunchShowOption
  ): void | Promise<void>;

  /**
   * 小程序在切入后台后被唤醒
   *
   * @param time 休眠时间 (单位 ms)
   */
  onAwake(time: number): void | Promise<void>;

  /**
   * 页面预加载时触发
   *
   * 可在其他页面中使用 `this.$preload(pageNameWithArgs|pageUrl)` 触发特定页面的预加载周期
   *
   * @param options url 参数对象
   */
  onPreload(options: PageQuery): void | Promise<void>;

  /**
   * 页面即将被导航时触发
   *
   * 需要在调用页面中使用框架提供的跳转方式 `this.$go(pageNameWithArgs|pageUrl)`
   * 才能正确触发 `onNavigate`
   *
   * 另外需要特别注意第一次进入一个分包界面
   * 或者是通过微信小程序二维码或微信内分享直接跳转到小程序子页面时同样不会触发
   */
  onNavigate(options: PageQuery): void | Promise<void>;
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

export interface ExtendedPageMethods<Data, Custom>
  extends InstanceEmitterMethods,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Custom extends Record<string, any>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Custom extends Record<string, any>
> = (Custom &
  Partial<WechatMiniprogram.Page.Data<Data>> &
  Partial<WechatMiniprogram.Page.ILifetime & ExtendedPageLifeCycles> &
  Partial<ExtendedPageProperties> & {
    options?: WechatMiniprogram.Component.ComponentOptions;
  }) &
  ThisType<PageInstance<Data, Custom>>;

export interface PageConstructor {
  <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Data extends Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Custom extends Record<string, any>
  >(
    name: string,
    options: PageOptions<Data, Custom>
  ): void;
}

export type TrivialPageInstance = PageInstance<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, any>
>;

export type TrivalPageOptions = PageOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, any>
>;

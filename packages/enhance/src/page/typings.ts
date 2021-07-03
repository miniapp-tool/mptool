import { bind } from "../bridge";

import type { RefMap } from "../component";
import type { UserEmitter } from "../event";
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
   * 在 App.onLaunch 触发时调用
   */
  onAppLaunch(options: WechatMiniprogram.App.LaunchShowOption): void;

  /**
   * 页面预加载时触发
   *
   * 需要在调用页面中使用 `this.preload(pageName|pagePath)`
   */
  onPreload(options: PageQuery): void;

  /**
   * 页面即将被导航时触发
   *
   * 需要在调用页面中使用框架提供的跳转方式 `this.$navigate(pageName|pagePath)`
   * 才能正确触发 `onNavigate`
   *
   * 另外需要特别注意第一次进入一个分包界面
   * 或者是通过微信小程序二维码或微信内分享直接跳转到小程序子页面时同样不会触发
   */
  onNavigate(options: PageQuery): void;

  /**
   * 小程序在切入后台后被唤醒
   *
   * @param time 休眠时间(单位ms)
   */
  onAwake(time: number): void;
}

export interface ExtendedPageProperties {
  /** 当前页面名称 */
  $name: string;
  /** 一些由框架生成的页面状态 */
  $state: PageState;
  /**
   * 事件派发器
   *
   * 是一个 [mitt](https://github.com/developit/mitt) 实例
   */
  $emitter: UserEmitter;
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
   * Page.P({
   *   onLoad: function () {
   *     this.$refs.customComp // 根据ref属性获取子组件的实例引用
   *   }
   * });
   * ```
   */
  $refs: RefMap;
}

export interface ExtendedPageMethods extends NavigatorMethods {
  /**
   * 绑定组件函数
   */
  $: typeof bind;
  /**
   * 获取当前页面实例。
   */
  $currentPage(): PageInstance;

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
  Data = WechatMiniprogram.IAnyObject,
  Custom = WechatMiniprogram.IAnyObject
> = WechatMiniprogram.OptionalInterface<
  WechatMiniprogram.Page.ILifetime & ExtendedPageLifeCycles
> &
  WechatMiniprogram.Page.InstanceProperties &
  WechatMiniprogram.Page.InstanceMethods<Data> &
  ExtendedPageMethods &
  ExtendedPageProperties &
  WechatMiniprogram.Page.Data<Data> &
  Custom;

export type PageOptions<
  Data = WechatMiniprogram.IAnyObject,
  Custom = WechatMiniprogram.IAnyObject
> = (Custom &
  Partial<WechatMiniprogram.Page.Data<Data>> &
  Partial<WechatMiniprogram.Page.ILifetime & ExtendedPageLifeCycles> &
  Partial<ExtendedPageProperties> & {
    options?: WechatMiniprogram.Component.ComponentOptions;
  }) &
  ThisType<PageInstance<Data, Custom>>;

export type PageConstructor = <
  Data = WechatMiniprogram.IAnyObject,
  Custom = WechatMiniprogram.IAnyObject
>(
  name: string,
  options: PageOptions<Data, Custom>
) => void;

import mitt from "mitt";

import type { UnknownComponentOptions } from "../component";
import type { PageOptions } from "../page";

export interface AppConfig {
  /**
   * 当你给出的页面路径或简称无法通过 routeMap 解析时，会回退到此路径
   *
   * 填入小程序路径模式，小程序路径模式是一个路径字符串，用 `$page` 表示小程序简称的位置
   *
   * 例子: 你可以填入 `/pages/$page/$page` 来表达:
   *
   * - `main': '/pages/main/main`
   * - `user': '/pages/user/user`
   */
  defaultRoute: string;

  /**
   * 你可以直接以对象形式表示简称到路径的映射。如:
   *
   * ```js
   * {
   *   main: '/pages/main/main',
   *   cart: '/pages/cart/cart',
   *   user: '/pages/user/user',
   * }
   * ```
   *
   * 也支持以在页面复杂的情况下数组格式表示小程序路径映射，数组的元素有两种填写方式:
   *
   * - `[页面简称, 小程序路经]`
   *
   * - `[页面简称数组, 小程序路经模式]`
   *
   *   小程序路径模式是一个路径字符串，用 `$page` 表示小程序简称的位置
   *
   * 如:
   *
   * ```js
   * [
   *   [['main', 'cart', 'user'], '/pages/$page/$page'],
   *   [['search', 'details', 'order'], '/shop/$page/$page'],
   *   ['about', '/others/about/about'],
   * ]
   * ```
   *
   * 等效于:
   *
   * ```js
   * {
   *   'main': '/pages/main/main',
   *   'cart': '/pages/cart/cart',
   *   'user': '/pages/user/user',
   *   'search': '/shop/search/search',
   *   'details': '/shop/details/details',
   *   'order': '/shop/order/order',
   *   'about': '/others/about/about',
   * }
   * ```
   *
   * @description 无法解析的路径会回退到 `defaultRoute`
   */
  routes?: Record<string, string> | [string | string[], string][];

  /**
   * 自定义扩展组件，在框架执行扩展之前。例如为每个组件挂在一个实例方法
   *
   * @param def pageoption
   */
  extendComponent?(
    options: UnknownComponentOptions,
    modules: { event: typeof mitt }
  ): void;

  /**
   * 自定义扩展页面，在框架执行扩展之前
   *
   * @param name 页面名称
   * @param def pageoption
   * @param modules 内置模块
   */
  extendPageBefore?(
    name: string,
    def: PageOptions,
    modules: { event: typeof mitt }
  ): void;

  /**
   * 自定义扩展页面，在框架执行扩展之后
   *
   * @param name 页面名称
   * @param def pageoption
   * @param modules 内置模块
   */
  extendPageAfter?(
    name: string,
    def: PageOptions,
    modules: { event: typeof mitt }
  ): void;
}

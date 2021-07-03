import type { UnknownComponentOptions } from "../component";
import type { PageOptions } from "../page";

export interface AppConfig {
  /**
   * 当你给出的页面路径或简称无法通过 routeMap 解析时，会回退到此路径
   *
   * 填入小程序路径模式，小程序路径模式是一个路径字符串，用 `$name` 表示小程序简称的位置
   *
   * 例子: 你可以填入 `/pages/$name/$name` 来表达:
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
   *   小程序路径模式是一个路径字符串，用 `$name` 表示小程序简称的位置
   *
   * 如:
   *
   * ```js
   * [
   *   [['main', 'cart', 'user'], '/pages/$name/$name'],
   *   [['search', 'details', 'order'], '/shop/$name/$name'],
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
   * 自定义扩展组件
   *
   * 时机在框架执行扩展之前，可为每个组件挂载实例方法
   *
   * @param options 组件选项
   */
  extendComponent?(options: UnknownComponentOptions): void;

  /**
   * 自定义扩展页面，在框架执行扩展之前
   *
   * @param name 页面名称
   * @param options 页面选项
   */
  extendPage?(name: string, options: PageOptions): void;

  /**
   * 自定义诸如页面
   *
   * 在框架执行扩展之后，这意味着你可以覆盖框架的方法
   *
   * @param name 页面选项
   * @param options pageoption
   */
  injectPage?(name: string, options: PageOptions): void;
}

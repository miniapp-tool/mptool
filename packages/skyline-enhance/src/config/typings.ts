import type { TrivialComponentOptions } from "../component/index.js";
import type { TrivialPageOptions } from "../page/index.js";

export interface AppConfigCommonOptions {
  /**
   * 主页页面名称或路径
   */
  home?: string;

  /**
   * 跳转延迟执行的最长时间，单位 ms
   *
   * @description 异步 onNavigate 方法用时过久会直接调转
   *
   * @default 200
   */
  maxDelay?: number;

  /**
   * 允许进行跳转据页面首屏渲染后的最小间隔时间，单位 ms
   *
   * @default 100
   */
  minInterval?: number;

  /**
   * 自定义扩展组件
   *
   * 时机在框架执行扩展之前，可为每个组件挂载实例方法
   *
   * @param options 组件选项
   */
  extendComponent?(options: TrivialComponentOptions): void;

  /**
   * 自定义注入组件
   *
   * 时机在框架执行扩展之后，这意味着你可以覆盖框架的方法
   *
   * @param options 组件选项
   */
  injectComponent?(options: TrivialComponentOptions): void;

  /**
   * 自定义扩展页面，在框架执行扩展之前
   *
   * @param name 页面名称
   * @param options 页面选项
   */
  extendPage?(name: string, options: TrivialPageOptions): void;

  /**
   * 自定义注入页面
   *
   * 在框架执行扩展之后，这意味着你可以覆盖框架的方法
   *
   * @param name 页面名称
   * @param options 页面选项
   */
  injectPage?(name: string, options: TrivialPageOptions): void;
}
export interface RoutePathConfig {
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
   * @description 无法解析的路径会回退到 `defaultPage`
   */
  pages?: Record<string, string> | [string | string[], string][];

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
  defaultPage: string;
}

export interface RouteCustomConfig {
  /**
   * 获得页面路径
   *
   * @param pageName 页面简称
   * @returns 页面路径
   */
  getPath: (pageName: string) => string;
}

export type AppConfigOptions = AppConfigCommonOptions &
  (RoutePathConfig | RouteCustomConfig);

import mitt from "mitt";

import type { UnknownComponentOptions } from "../component";
import type { PageOptions } from "../page";

export interface AppConfig {
  /** 小程序路径 */
  routes: string | string[];

  /**
   * 解析简称
   *
   * 只能在 routes 为 string 时省略
   *
   * @param name 页面简称
   * @returns 实际页面的地址
   */
  getRoute?: (name: string) => string;

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

  /**
   * 自定义扩展组件，在框架执行扩展之前。例如为每个组件挂在一个实例方法
   *
   * @param def pageoption
   */
  extendComponentBefore?(
    options: UnknownComponentOptions,
    modules: { event: typeof mitt }
  ): void;
}

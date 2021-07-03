import { query } from "@mptool/shared";
import { getConfig } from "../config";
import { ON_PAGE_NAVIGATE, ON_PAGE_READY } from "../constant";
import { appEmitter, routeEmitter } from "../event";

import type { PageQuery } from "../page";

export interface NavigatorTriggerOptions {
  fullPath: string;
  pageName: string;
  url: string;
  query: PageQuery;
}

let timer: number;
let readyTimer: number;
let inNagivation: boolean;

export type NavigatorType =
  | "navigateTo"
  | "redirectTo"
  | "switchTab"
  | "reLaunch";

export interface PathDetails {
  name: string;
  query: PageQuery;
  url: string;
}

export const getPathDetail = (pageNamewithArg: string): PathDetails => {
  const config = getConfig();
  const [pageName, queryString] = pageNamewithArg.split("?");

  // 获得正确的路径
  const path = pageName.startsWith("/") ? pageName : config.getRoute(pageName);

  return {
    name: config.getName(path),
    url: `${path}${queryString ? `?${queryString}` : ""}`,
    query: query.parse(queryString),
  };
};

export function getTrigger(
  type: "navigateTo"
): (
  pagename: string
) => Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>;
export function getTrigger(
  type: "redirectTo"
): (pagename: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;
export function getTrigger(
  type: "switchTab"
): (pagename: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;
export function getTrigger(
  type: "reLaunch"
): (pagename: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;

/**
 * 跳转触发器
 */
// eslint-disable-next-line
export function getTrigger(type: NavigatorType) {
  // eslint-disable-next-line
  return (pageNamewithArg: string): any => {
    if (!inNagivation) {
      const { name, url, query } = getPathDetail(pageNamewithArg);

      // 开始等待
      inNagivation = true;

      // 清楚计时器
      clearTimeout(timer);
      clearTimeout(readyTimer);

      /** 2s 内避免重复的跳转 */
      timer = setTimeout(() => {
        inNagivation = false;
      }, 2000);

      routeEmitter.emit(`${ON_PAGE_NAVIGATE}:${name}`, query);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return wx[type]({ url });
    }
  };
}

/** 监听 page ready 事件 */
appEmitter.on(ON_PAGE_READY, () => {
  // pageReady 被触发间隔后 100ms，允许下一次跳转
  readyTimer = setTimeout(() => {
    inNagivation = false;
  }, 100);
});

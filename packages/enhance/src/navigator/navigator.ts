import { query } from "@mptool/shared";
import { getConfig } from "../config";
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

export const getPath = (
  pageNamewithArg: string
): { name: string; path: string; query: PageQuery; url: string } => {
  const [path, queryString] = pageNamewithArg.split("?");

  // 获得正确的路径
  const url = path.startsWith("/") ? path : getConfig().getRoute(path);

  // 合法路径要求从头到尾匹配字母，数字、下划线字符或减号一次或多次
  if (!/^[\w-]+$/u.test(url) || !url)
    throw new Error(`Invalid path: ${pageNamewithArg}`);

  return {
    name: getConfig().getName(url),
    path: url,
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
      const { name, path, url, query } = getPath(pageNamewithArg);

      // 开始等待
      inNagivation = true;

      // 清楚计时器
      clearTimeout(timer);
      clearTimeout(readyTimer);

      /** 2s 内避免重复的跳转 */
      timer = setTimeout(() => {
        inNagivation = false;
      }, 2000);

      routeEmitter.emit(`${type}:${name}`, { url: path, query });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return wx[type]({ url });
    }
  };
}

/** 监听 page ready 事件 */
appEmitter.on("page:ready", () => {
  // pageReady 被触发间隔后 100ms，允许下一次跳转
  readyTimer = setTimeout(() => {
    inNagivation = false;
  }, 100);
});

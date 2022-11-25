import { query } from "@mptool/shared";
import { getConfig } from "../config/index.js";
import {
  ON_PAGE_NAVIGATE,
  ON_PAGE_READY,
  ON_PAGE_UNLOAD,
} from "../constant.js";
import { appEmitter, routeEmitter } from "../emitter/index.js";

import type { PageQuery } from "../page/index.js";

export interface NavigatorTriggerOptions {
  fullPath: string;
  pageName: string;
  url: string;
  query: PageQuery;
}

let canNavigate = true;

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
 * Navgation trigger
 */
// eslint-disable-next-line
export function getTrigger(type: NavigatorType) {
  // eslint-disable-next-line
  return (pageNamewithArg: string): any => {
    if (canNavigate) {
      // set navigate lock
      canNavigate = false;

      const { name, url, query } = getPathDetail(pageNamewithArg);

      return Promise.race([
        routeEmitter.emitAsync(`${ON_PAGE_NAVIGATE}:${name}`, query),
        // 等待最小延迟
        new Promise<void>((resolve) => {
          setTimeout(() => resolve(), getConfig().maxDelay || 200);
        }),
      ]).then(() => {
        // release navigate lock
        canNavigate = true;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return wx[type]({ url });
      });
    }
  };
}

// release navigate lock with $minInterval ms delay after pageReady triggers
appEmitter.on(ON_PAGE_READY, () => {
  setTimeout(() => {
    canNavigate = true;
  }, getConfig().minInterval || 100);
});

// release navigate lock on page unload
appEmitter.on(ON_PAGE_UNLOAD, () => {
  canNavigate = true;
});

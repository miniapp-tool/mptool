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
  path: string;
  query: PageQuery;
  url: string;
}

export const getPathDetail = (pageNameWithArg: string): PathDetails => {
  const config = getConfig();
  const [pageName, queryString] = pageNameWithArg.split("?");
  const path = pageName.startsWith("/") ? pageName : config.getPath(pageName);

  return {
    path,
    query: query.parse(queryString),
    url: `${path}${queryString ? `?${queryString}` : ""}`,
  };
};

export function getTrigger(
  type: "navigateTo",
): (
  pageName: string,
) => Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>;
export function getTrigger(
  type: "redirectTo" | "switchTab" | "reLaunch",
): (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;

/**
 * Navigation trigger
 */
export function getTrigger(
  type: NavigatorType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (pageNameWithArg: string) => any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pageNameWithArg: string): any => {
    if (canNavigate) {
      // set navigate lock
      canNavigate = false;

      const { path, url, query } = getPathDetail(pageNameWithArg);

      return Promise.race([
        routeEmitter.emitAsync(`${ON_PAGE_NAVIGATE}:${path}`, query),
        // 等待最小延迟
        new Promise<void>((resolve) => {
          setTimeout(() => resolve(), getConfig().maxDelay ?? 200);
        }),
      ]).then(() => {
        // release navigate lock
        canNavigate = true;

        // @ts-expect-error: argument can not union
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
  }, getConfig().minInterval ?? 100);
});

// release navigate lock on page unload
appEmitter.on(ON_PAGE_UNLOAD, () => {
  canNavigate = true;
});

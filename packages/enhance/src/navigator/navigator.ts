import { logger, query } from "@mptool/shared";

import { getConfig } from "../config/index.js";
import { ON_PAGE_NAVIGATE, ON_PAGE_READY, ON_PAGE_UNLOAD } from "../constant.js";
import { appEmitter, routeEmitter } from "../emitter/index.js";
import type { PageQuery } from "../page/index.js";

export interface NavigatorTriggerOptions {
  fullPath: string;
  pageName: string;
  url: string;
  query: PageQuery;
}

/**
 * How long a navigation may hold the lock before it is force released.
 *
 * The lock is normally released by `ON_PAGE_READY` / `ON_PAGE_UNLOAD`, but neither event is
 * guaranteed: `wx.switchTab` back to an already loaded tab page never fires `onReady` again, and a
 * page can be closed while it is still loading. This timeout is a safety net so a missed event can
 * never block navigation forever.
 */
const NAVIGATION_LOCK_TIMEOUT = 5000;

let canNavigate = true;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

const clearReleaseTimer = (): void => {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
};

/**
 * Release the navigation lock
 *
 * @param delay - Delay in milliseconds before the lock is released
 */
const releaseNavigationLock = (delay = 0): void => {
  clearReleaseTimer();

  if (delay > 0) {
    releaseTimer = setTimeout(() => {
      releaseTimer = null;
      canNavigate = true;
    }, delay);
  } else {
    canNavigate = true;
  }
};

/** Acquire the navigation lock and arm the dead lock safety net */
const acquireNavigationLock = (): void => {
  clearReleaseTimer();
  canNavigate = false;

  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    canNavigate = true;
    logger.warn("Navigation lock released by timeout, target page never became ready");
  }, NAVIGATION_LOCK_TIMEOUT);
};

export type NavigatorType = "navigateTo" | "redirectTo" | "switchTab" | "reLaunch";

export interface PathDetails {
  path: string;
  query: PageQuery;
  url: string;
}

export const getPathDetail = (pageNameWithArg: string): PathDetails => {
  const config = getConfig();
  const [pageName, queryString] = pageNameWithArg.split("?");
  // 统一为带前导斜杠的路径，保证与页面注册时的事件 key 一致
  const path = `/${(pageName.startsWith("/") ? pageName : config.getPath(pageName)).replace(/^\//u, "")}`;

  return {
    path,
    query: query.parse(queryString),
    url: `${path}${queryString ? `?${queryString}` : ""}`,
  };
};

export function getTrigger(
  type: "navigateTo",
): (pageName: string) => Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>;
export function getTrigger(
  type: "redirectTo" | "switchTab" | "reLaunch",
): (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;

/**
 * Navigation trigger
 *
 * @param type - Navigation type
 * @returns Navigation trigger function
 */
// oxlint-disable-next-line typescript/no-explicit-any
export function getTrigger(type: NavigatorType): (pageNameWithArg: string) => any {
  // oxlint-disable-next-line typescript/consistent-return
  return async (pageNameWithArg: string): Promise<unknown> => {
    if (canNavigate) {
      // set navigate lock
      acquireNavigationLock();

      const { path, url, query: queries } = getPathDetail(pageNameWithArg);

      try {
        await Promise.race([
          routeEmitter.emitAsync(`${ON_PAGE_NAVIGATE}:${path}`, queries),
          // 等待最小延迟
          new Promise<void>((resolve) => {
            setTimeout(() => {
              resolve();
            }, getConfig().maxDelay ?? 200);
          }),
        ]);
      } catch {
        // 忽略 onNavigate 处理器抛出的错误，导航不应被阻塞
      }

      // Keep the navigate lock until the target page is ready (ON_PAGE_READY)
      // to block repeated navigation from rapid taps. Release it on failure.
      try {
        // wx.switchTab does not allow query parameters, only the path is used
        // @ts-expect-error: argument can not union
        const result: unknown = await wx[type]({ url: type === "switchTab" ? path : url });

        // `wx.switchTab` back to an already loaded tab page only fires `onShow`, neither
        // `onReady` nor `onUnload`, so `ON_PAGE_READY` will never release the lock. Release it
        // here instead, keeping the usual `$minInterval` gap.
        if (type === "switchTab") releaseNavigationLock(getConfig().minInterval ?? 100);

        return result;
      } catch (err) {
        // release navigate lock on navigation failure to avoid a dead lock
        releaseNavigationLock();
        throw err;
      }
    }

    logger.debug(`Navigation is locked, ignored target "${pageNameWithArg}"`);
  };
}

// release navigate lock with $minInterval ms delay after pageReady triggers
appEmitter.on(ON_PAGE_READY, () => {
  releaseNavigationLock(getConfig().minInterval ?? 100);
});

// release navigate lock on page unload, in case the target page never fires
// onReady (e.g. it is forced to go back during onLoad) to avoid a dead lock
appEmitter.on(ON_PAGE_UNLOAD, () => {
  releaseNavigationLock();
});

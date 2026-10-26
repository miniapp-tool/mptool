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
 * Default time (ms) a navigation may hold the lock before it is force released.
 *
 * The lock is normally released by `ON_PAGE_READY` / `ON_PAGE_UNLOAD`, but neither event is
 * guaranteed: `wx.switchTab` back to an already loaded tab page never fires `onReady` again, and a
 * page can be closed while it is still loading. This timeout is a safety net so a missed event can
 * never block navigation forever. Override it with `$Config({ lockTimeout })`.
 *
 * 导航锁的默认最长持有时间（ms）。目标页未能触发 `onReady` / `onUnload` 时，锁会在该时间后强制释放， 避免导航永久失效。可通过 `$Config({
 * lockTimeout })` 覆盖。
 */
const DEFAULT_NAVIGATION_LOCK_TIMEOUT = 5000;

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
  }, getConfig().lockTimeout ?? DEFAULT_NAVIGATION_LOCK_TIMEOUT);
};

export type NavigatorType = "navigateTo" | "redirectTo" | "switchTab" | "reLaunch";

export interface PathDetails {
  path: string;
  query: PageQuery;
  url: string;
}

/**
 * Normalize a page path to a single leading slash.
 *
 * 统一页面路径为带前导斜杠的形式，避免相对路径被按当前页面解析，并保证与路由事件 key 一致。
 *
 * @param path - Page path / 页面路径
 * @returns Normalized path / 规范化后的路径
 */
export const normalizePath = (path: string): string => `/${path.replace(/^\//u, "")}`;

export const getPathDetail = (pageNameWithArg: string): PathDetails => {
  const config = getConfig();
  const [pageName, queryString] = pageNameWithArg.split("?");
  const path = normalizePath(pageName.startsWith("/") ? pageName : config.getPath(pageName));

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
      // Resolve the target before taking the lock: `getPathDetail` can throw (e.g. `$Config` is not
      // called, or a custom `getPath` throws), and a failed resolution must not leave navigation
      // locked for the full timeout.
      // 先解析目标再获取导航锁：`getPathDetail` 可能抛错（未调用 `$Config`、自定义 getPath 抛错等），
      // 解析失败不应让导航锁占用到超时。
      const { path, url, query: queries } = getPathDetail(pageNameWithArg);

      // set navigate lock
      acquireNavigationLock();

      let maxDelayTimer: ReturnType<typeof setTimeout> | undefined;

      try {
        await Promise.race([
          routeEmitter.emitAsync(`${ON_PAGE_NAVIGATE}:${path}`, queries),
          // 等待最小延迟
          new Promise<void>((resolve) => {
            maxDelayTimer = setTimeout(() => {
              resolve();
            }, getConfig().maxDelay ?? 200);
          }),
        ]);
      } catch {
        // 忽略 onNavigate 处理器抛出的错误，导航不应被阻塞
      } finally {
        // Clear the racing timer once the race settles, otherwise it keeps the event loop alive
        // for up to `maxDelay` ms after a fast `onNavigate`.
        // 竞速结束后清理定时器，避免快速完成 onNavigate 时残留 timer。
        //
        // A promise executor runs synchronously while the `Promise.race` arguments are built, and
        // `emitAsync` is an async function (it turns a synchronous throw into a rejection), so the
        // timer is always assigned before the race can settle. The guard stays for a `Promise`
        // implementation that defers the executor, and because `clearTimeout` is typed to take a
        // timer id, not `undefined`.
        // 构造 `Promise.race` 参数时 executor 同步执行，且 `emitAsync` 是 async 函数（同步抛错也会转为
        // rejection），因此竞速结束前定时器必定已赋值。保留判断用于防范延迟执行 executor 的 Promise 实现，
        // 同时 `clearTimeout` 的类型不接受 `undefined`。
        /* istanbul ignore else */
        if (maxDelayTimer != null) clearTimeout(maxDelayTimer);
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

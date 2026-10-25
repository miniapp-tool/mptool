import { MpError, isFunction } from "@mptool/shared";

import type {
  AppConfigCommonOptions,
  AppConfigOptions,
  RouteCustomConfig,
  RoutePathConfig,
} from "./typings.js";

export interface Config extends Omit<AppConfigOptions, "defaultPage" | "pages"> {
  /**
   * 获得页面路径
   *
   * @param pageName 页面简称
   * @returns 页面路径
   */
  getPath: (pageName: string) => string;
}

let appConfig: Config | null;

export const $Config = (config: AppConfigOptions): void => {
  const { defaultPage, pages, getPath, ...options } = config as Required<
    AppConfigCommonOptions & RoutePathConfig & RouteCustomConfig
  >;

  if (isFunction(getPath)) {
    appConfig = {
      ...options,
      getPath,
    };

    return;
  }

  let nameToRouteMap: Record<string, string> = {};

  const addRoute = (name: string, route: string): void => {
    const actualRoute = route.replace(/\$name/gu, name);

    nameToRouteMap[name] = actualRoute;
  };

  if (Array.isArray(pages)) {
    pages.forEach(([name, route]) => {
      if (typeof name === "string") {
        addRoute(name, route);
      } else {
        name.forEach((item) => {
          addRoute(item, route);
        });
      }
    });
  } else if (typeof pages === "object") {
    nameToRouteMap = pages;
  }

  appConfig = {
    ...options,

    getPath: (name: string): string =>
      nameToRouteMap[name] || defaultPage.replace(/\$name/gu, name),
  };
};

/**
 * Get the global config.
 *
 * @returns Global config / 全局配置
 * @throws {MpError} When `$Config` has not been called yet / 尚未调用 `$Config` 时抛出
 */
export const getConfig = (): Config => {
  if (!appConfig) {
    throw new MpError({
      message:
        "$Config is not called: call $Config() in app.js before registering pages or components",
    });
  }

  return appConfig;
};

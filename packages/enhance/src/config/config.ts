import { isFunction } from "@mptool/shared";

import type {
  AppConfigCommonOptions,
  AppConfigOptions,
  RouteCustomConfig,
  RoutePathConfig,
} from "./typings.js";

export interface Config
  extends Omit<AppConfigOptions, "defaultPage" | "pages"> {
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
  const {
    defaultPage: defaultPage,
    pages: pages = [],
    getPath,
    ...options
  } = config as Required<
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
  let routeToNameMap: Record<string, string> = {};

  const addRoute = (name: string, route: string): void => {
    const actualRoute = route.replace(/\$name/g, name);

    nameToRouteMap[name] = actualRoute;
    routeToNameMap[actualRoute] = name;
  };

  if (Array.isArray(pages)) {
    pages.forEach(([name, route]) => {
      if (typeof name === "string") addRoute(name, route);
      else name.forEach((item) => addRoute(item, route));
    });
  } else if (typeof pages === "object") {
    nameToRouteMap = pages;
    routeToNameMap = Object.fromEntries(
      Object.keys(pages).map((route) => [pages[route], route]),
    );
  }

  appConfig = {
    ...options,

    getPath: (name: string): string =>
      nameToRouteMap[name] || defaultPage.replace(/\$name/g, name),
  };
};

export const getConfig = (): Config => {
  if (!appConfig) throw new Error("$Config is not called");

  return appConfig;
};

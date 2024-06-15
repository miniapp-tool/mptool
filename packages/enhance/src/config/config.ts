import { isFunction } from "@mptool/shared";

import type {
  AppConfigCommonOptions,
  AppConfigOptions,
  RouteCustomConfig,
  RoutePathConfig,
} from "./typings.js";

export interface Config
  extends Omit<AppConfigOptions, "defaultRoute" | "routes"> {
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
    defaultPage: defaultRoute,
    pages: routes = [],
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

  if (Array.isArray(routes)) {
    routes.forEach(([name, route]) => {
      if (typeof name === "string") addRoute(name, route);
      else name.forEach((item) => addRoute(item, route));
    });
  } else if (typeof routes === "object") {
    nameToRouteMap = routes;
    routeToNameMap = Object.fromEntries(
      Object.keys(routes).map((route) => [routes[route], route]),
    );
  }

  appConfig = {
    ...options,

    getPath: (name: string): string =>
      nameToRouteMap[name] || defaultRoute.replace(/\$name/g, name),
  };
};

export const getConfig = (): Config => {
  if (!appConfig) throw new Error("$Config is not called");

  return appConfig;
};

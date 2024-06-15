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
   * @returns route
   */
  getRoute: (pageName: string) => string;
}

let appConfig: Config | null;

export const $Config = (config: AppConfigOptions): void => {
  const {
    defaultRoute,
    getRoute,
    routes = [],
    ...options
  } = config as Required<
    AppConfigCommonOptions & RoutePathConfig & RouteCustomConfig
  >;

  if (isFunction(getRoute)) {
    appConfig = {
      ...options,
      getRoute,
    };

    return;
  }

  let nameToRouteMap: Record<string, string> = {};

  const addRoute = (name: string, route: string): void => {
    const actualRoute = route.replace(/\$name/g, name);

    nameToRouteMap[name] = actualRoute;
  };

  if (Array.isArray(routes)) {
    routes.forEach(([name, route]) => {
      if (typeof name === "string") addRoute(name, route);
      else name.forEach((item) => addRoute(item, route));
    });
  } else if (typeof routes === "object") {
    nameToRouteMap = routes;
  }

  appConfig = {
    ...options,

    getRoute: (name: string): string =>
      nameToRouteMap[name] || defaultRoute.replace(/\$name/g, name),
  };
};

export const getConfig = (): Config => {
  if (!appConfig) throw new Error("$Config is not called");

  return appConfig;
};

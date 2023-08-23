import { logger } from "@mptool/shared";
import type { AppConfig } from "./typings.js";

export interface Config extends Omit<AppConfig, "defaultRoute" | "routeMap"> {
  /**
   * @returns name
   */
  getName: (url: string) => string;

  /**
   * @returns route
   */
  getRoute: (pageName: string) => string;
}

let appConfig: Config | null;

export const $Config = (config: AppConfig): void => {
  const { defaultRoute, routes = [], ...options } = config;

  let nameToRouteMap: Record<string, string> = {};
  let routeToNameMap: Record<string, string> = {};

  const addRoute = (name: string, route: string): void => {
    const actualRoute = route.replace(/\$name/g, name);
    nameToRouteMap[name] = actualRoute;
    routeToNameMap[actualRoute] = name;
  };

  if (Array.isArray(routes))
    routes.forEach(([name, route]) => {
      if (typeof name === "string") addRoute(name, route);
      else name.forEach((item) => addRoute(item, route));
    });
  else if (typeof routes === "object") {
    nameToRouteMap = routes;
    routeToNameMap = Object.fromEntries(
      Object.keys(routes).map((route) => [routes[route], route]),
    );
  }

  const defaultRouteReg = new RegExp(
    `^${defaultRoute
      .replace(/^\/?/, "/?")
      .replace(/[.]/g, "\\.")
      .replace("$name", "([\\w\\-]+)")
      .replace(/\$name/g, "[\\w\\-]+")}`,
  );

  appConfig = {
    ...options,

    getRoute: (name: string): string =>
      nameToRouteMap[name] || defaultRoute.replace(/\$name/g, name),

    getName: (url: string): string =>
      routeToNameMap[url] || defaultRouteReg.exec(url)?.[1] || "Unknown",
  };
};

export const getConfig = (): Config =>
  (appConfig as Config) || logger.error("$Config is not called");

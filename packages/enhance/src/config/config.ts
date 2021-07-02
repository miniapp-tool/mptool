import type { AppConfig } from "./typings";

export interface Config {
  options: Omit<AppConfig, "routes" | "routeResolver">;

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

export const initConfig = (config: AppConfig): void => {
  if (!config) throw new Error("AppOptions.config must be set!");

  const { routes, getRoute, ...options } = config;

  const routesConfig =
    typeof routes === "string"
      ? [routes]
      : Array.isArray(routes) &&
        routes.every((route) => typeof route === "string")
      ? routes
      : [];

  const mainRoute = routes[0];

  const routesMath = routesConfig.map(
    (item) =>
      new RegExp(
        `^${item
          .replace(/^\/?/u, "/?")
          .replace(/[.]/gu, "\\.")
          .replace("$page", "([\\w\\-]+)")}`
      )
  );

  if (!routesConfig.length) console.error("Invalid 'routes' option:", routes);

  appConfig = {
    options,
    getRoute:
      getRoute || ((name: string): string => mainRoute.replace("$page", name)),

    getName: (url: string): string => {
      let pageName = "";

      routesMath.some((reg: RegExp) => {
        const matchResult = reg.exec(url);

        if (matchResult) {
          pageName = matchResult[1];

          return true;
        }

        return false;
      });

      return pageName;
    },
  };
};

export const getConfig = (): Config => appConfig as Config;

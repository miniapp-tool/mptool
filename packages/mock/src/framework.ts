// oxlint-disable typescript/no-explicit-any, typescript/no-unsafe-assignment
// oxlint-disable promise/prefer-await-to-callbacks -- wx navigation uses success/fail callbacks
// oxlint-disable unicorn/no-immediate-mutation -- page instances are built incrementally
// oxlint-disable no-undefined -- navigation helpers use an explicit undefined return

import { emitEvent } from "./ui.js";

interface FrameworkApi {
  pages: any[];
  app: any;
  components: any[];
  behaviors: any[];
  currentPages: any[];
  /** Routes configured as tabBar pages via `mockWx.tabBar()`. */
  tabBarPages: string[];
  /** Cached tabBar page instances, kept alive across `switchTab()` calls. */
  tabPages: Map<string, MockPageInstance>;
}

/** 框架 mock 状态 */
export const frameworkApi: FrameworkApi = {
  /** 注册的页面选项 */
  pages: [],
  /** 注册的应用选项 */
  app: void 0,
  /** 注册的组件 */
  components: [],
  /** 注册的 behaviors */
  behaviors: [],
  /** 当前页面栈（真实页面实例） */
  currentPages: [],
  /** TabBar 页面路由（由 `mockWx.tabBar()` 配置） */
  tabBarPages: [],
  /** 缓存已打开的 tabBar 页面实例，`switchTab` 之间保留 */
  tabPages: new Map(),
};

export interface NavigationOption {
  url?: string;
  delta?: number;
  success?: (result: { errMsg: string }) => void;
  fail?: (result: { errMsg: string }) => void;
  complete?: (result: { errMsg: string }) => void;
}

/** A page instance created by navigating to a registered page definition. */
export interface MockPageInstance {
  data: Record<string, unknown>;
  options: Record<string, string>;
  route: string;
  setData: (patch: Record<string, unknown>, callback?: () => void) => void;
  [key: string]: unknown;
}

interface PageDefinition {
  $name?: string;
  data?: Record<string, unknown>;
  isTabBar?: boolean;
  route?: string;
  tabBar?: boolean;
  [key: string]: unknown;
}

const MAX_PAGE_STACK = 10;

const hasCallbacks = (option?: NavigationOption): boolean =>
  typeof option?.success === "function" ||
  typeof option?.fail === "function" ||
  typeof option?.complete === "function";

const createNavigationError = (errMsg: string): Error & { errMsg: string } =>
  Object.assign(new Error(errMsg), { errMsg });

/** Deliver a success / failure in callback style, or as a Promise. */
const settle = (
  option: NavigationOption | undefined,
  errMsg: string,
  ok: boolean,
  onDone?: () => void,
): unknown => {
  if (!hasCallbacks(option)) {
    onDone?.();

    return ok ? Promise.resolve({ errMsg }) : Promise.reject(createNavigationError(errMsg));
  }

  setTimeout(() => {
    if (ok) option?.success?.({ errMsg });
    else option?.fail?.({ errMsg });

    option?.complete?.({ errMsg });
    onDone?.();
  }, 0);

  return undefined;
};

const parseQuery = (queryString: string): Record<string, string> => {
  const query: Record<string, string> = {};

  for (const pair of queryString.split("&")) {
    if (!pair) continue;

    // `split` always yields at least one element, so the key is always defined.
    const [rawKey, rawValue = ""] = pair.split("=");

    try {
      query[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
    } catch {
      query[rawKey] = rawValue;
    }
  }

  return query;
};

const parseRoute = (url: unknown): { query: Record<string, string>; route: string } | null => {
  if (typeof url !== "string" || url.trim() === "") return null;

  // `split` always yields at least one element, so the path is always defined.
  const [rawPath, rawQuery = ""] = url.split("?");
  const route = `/${rawPath.replace(/^\/+/u, "").replace(/\/+$/u, "")}`;

  return { query: parseQuery(rawQuery), route: route === "/" ? "/" : route };
};

type OpenType = "navigateBack" | "navigateTo" | "redirectTo" | "reLaunch" | "switchTab";

const emitPageNotFound = (route: string, query: Record<string, string>): void => {
  emitEvent("pageNotFound", { isEntryPage: false, path: route, query });
};

const emitRouteEvent = (
  event: "appRoute" | "appRouteDone" | "beforeAppRoute",
  route: string,
  query: Record<string, string>,
  openType: OpenType,
): void => {
  emitEvent(event, { openType, path: route, query });
};

const routeDone =
  (route: string, query: Record<string, string>, openType: OpenType): (() => void) =>
  () => {
    emitRouteEvent("appRouteDone", route, query, openType);
  };

const findPageDefinition = (route: string): PageDefinition | undefined => {
  const definitions = frameworkApi.pages as PageDefinition[];
  const exact = [...definitions].reverse().find((definition) => definition.route === route);

  if (exact) return exact;

  const name = route.slice(route.lastIndexOf("/") + 1);

  return [...definitions].reverse().find((definition) => definition.$name === name);
};

const isTabBarDefinition = (definition: PageDefinition): boolean =>
  definition.tabBar === true || definition.isTabBar === true;

/** Normalize a route or URL to `/a/b` form for tabBar configuration. */
export const normalizeRoute = (route: string): string => {
  // `split` always yields at least one element, so the path is always defined.
  const [rawPath] = route.split("?");
  let start = 0;
  let end = rawPath.length;

  // Strip leading / trailing slashes in linear time; a regexp on an uncontrolled URL can
  // backtrack on long runs of "/" (CodeQL js/polynomial-redos).
  while (start < end && rawPath[start] === "/") start += 1;
  while (end > start && rawPath[end - 1] === "/") end -= 1;

  const path = rawPath.slice(start, end);

  return path ? `/${path}` : "/";
};

/** Whether a route is configured (or registered) as a tabBar page. */
const isTabBarTarget = (route: string, definition: PageDefinition): boolean =>
  isTabBarDefinition(definition) || frameworkApi.tabBarPages.includes(route);

const createPageInstance = (
  definition: PageDefinition,
  route: string,
  query: Record<string, string>,
): MockPageInstance => {
  const page = { ...definition } as MockPageInstance;

  // oxlint-disable-next-line unicorn/prefer-structured-clone -- JSON clone keeps the ES2018 bundle plain
  page.data = JSON.parse(JSON.stringify(definition.data ?? {})) as Record<string, unknown>;
  page.options = query;
  page.route = route;
  page.setData = (patch: Record<string, unknown>, callback?: () => void): void => {
    Object.assign(page.data, patch);
    if (callback) setTimeout(callback, 0);
  };

  return page;
};

const invokeLifecycle = (
  page: MockPageInstance | undefined,
  name: "onHide" | "onLoad" | "onReady" | "onShow" | "onUnload",
  ...args: unknown[]
): void => {
  const lifecycle = page?.[name];

  if (typeof lifecycle === "function") lifecycle.apply(page, args);
};

const currentStack = (): MockPageInstance[] => frameworkApi.currentPages as MockPageInstance[];

const topPage = (): MockPageInstance | undefined => currentStack()[currentStack().length - 1];

/** Whether a page instance is a tabBar page. */
const isTabPageInstance = (page: MockPageInstance): boolean =>
  frameworkApi.tabBarPages.includes(page.route) || page.tabBar === true || page.isTabBar === true;

/** Whether any tabBar page is configured or registered. */
const hasTabBarPages = (): boolean =>
  frameworkApi.tabBarPages.length > 0 ||
  (frameworkApi.pages as PageDefinition[]).some((page) => isTabBarDefinition(page));

/** Drop cached tab pages (unloading them unless they are still in the stack). */
const clearTabPages = (): void => {
  for (const [route, page] of frameworkApi.tabPages) {
    if (!currentStack().includes(page)) invokeLifecycle(page, "onUnload");
    frameworkApi.tabPages.delete(route);
  }
};

const unloadAll = (): void => {
  const stack = currentStack();

  while (stack.length > 0) {
    const page = stack.pop();

    invokeLifecycle(page, "onUnload");
  }
};

const openPage = (
  definition: PageDefinition,
  route: string,
  query: Record<string, string>,
): MockPageInstance => {
  const page = createPageInstance(definition, route, query);

  currentStack().push(page);
  invokeLifecycle(page, "onLoad", query);
  invokeLifecycle(page, "onShow");
  invokeLifecycle(page, "onReady");

  return page;
};

/** `switchTab` handler, extracted to keep `createNavigator` readable. */
// oxlint-disable-next-line max-statements -- the tab-stack rules need the explicit steps
const openTabPage = (option: NavigationOption = {}): unknown => {
  const parsed = parseRoute(option.url);

  if (!parsed)
    return settle(option, "switchTab:fail parameter error: url should not be empty", false);

  const definition = findPageDefinition(parsed.route);

  if (!definition) {
    emitPageNotFound(parsed.route, parsed.query);

    return settle(option, `switchTab:fail page "${parsed.route}" is not found`, false);
  }

  if (hasTabBarPages() && !isTabBarTarget(parsed.route, definition))
    return settle(option, "switchTab:fail can not switch to no-tabBar page", false);

  emitRouteEvent("beforeAppRoute", parsed.route, parsed.query, "switchTab");

  const stack = currentStack();
  const current = topPage();

  // Keep the current tab page alive: only hide it, never unload it.
  if (current && isTabPageInstance(current)) {
    if (current.route === parsed.route) {
      emitRouteEvent("appRoute", parsed.route, parsed.query, "switchTab");

      return settle(
        option,
        "switchTab:ok",
        true,
        routeDone(parsed.route, parsed.query, "switchTab"),
      );
    }

    invokeLifecycle(current, "onHide");
  }

  // Close all non-tab pages above the tab page.
  for (;;) {
    const last = stack[stack.length - 1];

    if (last === undefined || frameworkApi.tabPages.has(last.route)) break;

    stack.pop();
    invokeLifecycle(last, "onUnload");
  }

  const cached = frameworkApi.tabPages.get(parsed.route);

  stack.length = 0;

  if (cached) {
    stack.push(cached);
    invokeLifecycle(cached, "onShow");
  } else {
    const page = createPageInstance(definition, parsed.route, parsed.query);

    frameworkApi.tabPages.set(parsed.route, page);
    stack.push(page);
    invokeLifecycle(page, "onLoad", parsed.query);
    invokeLifecycle(page, "onShow");
    invokeLifecycle(page, "onReady");
  }

  emitRouteEvent("appRoute", parsed.route, parsed.query, "switchTab");

  return settle(option, "switchTab:ok", true, routeDone(parsed.route, parsed.query, "switchTab"));
};

// oxlint-disable-next-line max-lines-per-function -- one explicit handler per navigation API
const createNavigator = (type: string): ((option?: NavigationOption) => unknown) => {
  switch (type) {
    case "navigateTo": {
      return (option = {}): unknown => {
        const parsed = parseRoute(option.url);

        if (!parsed)
          return settle(option, "navigateTo:fail parameter error: url should not be empty", false);

        const definition = findPageDefinition(parsed.route);

        if (!definition) {
          emitPageNotFound(parsed.route, parsed.query);

          return settle(option, `navigateTo:fail page "${parsed.route}" is not found`, false);
        }

        if (isTabBarTarget(parsed.route, definition))
          return settle(option, "navigateTo:fail can not navigateTo a tabbar page", false);

        if (currentStack().length >= MAX_PAGE_STACK)
          return settle(option, "navigateTo:fail webview count limit exceed", false);

        emitRouteEvent("beforeAppRoute", parsed.route, parsed.query, "navigateTo");

        invokeLifecycle(topPage(), "onHide");
        openPage(definition, parsed.route, parsed.query);
        emitRouteEvent("appRoute", parsed.route, parsed.query, "navigateTo");

        return settle(
          option,
          "navigateTo:ok",
          true,
          routeDone(parsed.route, parsed.query, "navigateTo"),
        );
      };
    }

    case "redirectTo": {
      return (option = {}): unknown => {
        const parsed = parseRoute(option.url);

        if (!parsed)
          return settle(option, "redirectTo:fail parameter error: url should not be empty", false);

        const definition = findPageDefinition(parsed.route);

        if (!definition) {
          emitPageNotFound(parsed.route, parsed.query);

          return settle(option, `redirectTo:fail page "${parsed.route}" is not found`, false);
        }

        if (isTabBarTarget(parsed.route, definition))
          return settle(option, "redirectTo:fail can not redirectTo a tabbar page", false);

        emitRouteEvent("beforeAppRoute", parsed.route, parsed.query, "redirectTo");

        const previous = currentStack().pop();

        invokeLifecycle(previous, "onUnload");
        openPage(definition, parsed.route, parsed.query);
        emitRouteEvent("appRoute", parsed.route, parsed.query, "redirectTo");

        return settle(
          option,
          "redirectTo:ok",
          true,
          routeDone(parsed.route, parsed.query, "redirectTo"),
        );
      };
    }

    case "switchTab": {
      return openTabPage;
    }

    case "reLaunch": {
      return (option = {}): unknown => {
        const parsed = parseRoute(option.url);

        if (!parsed)
          return settle(option, "reLaunch:fail parameter error: url should not be empty", false);

        const definition = findPageDefinition(parsed.route);

        if (!definition) {
          emitPageNotFound(parsed.route, parsed.query);

          return settle(option, `reLaunch:fail page "${parsed.route}" is not found`, false);
        }

        emitRouteEvent("beforeAppRoute", parsed.route, parsed.query, "reLaunch");

        clearTabPages();
        unloadAll();
        openPage(definition, parsed.route, parsed.query);

        const tabPage = topPage();

        if (tabPage && isTabBarTarget(parsed.route, definition))
          frameworkApi.tabPages.set(parsed.route, tabPage);

        emitRouteEvent("appRoute", parsed.route, parsed.query, "reLaunch");

        return settle(
          option,
          "reLaunch:ok",
          true,
          routeDone(parsed.route, parsed.query, "reLaunch"),
        );
      };
    }

    case "navigateBack": {
      return (option = {}): unknown => {
        const delta = option.delta ?? 1;
        const stack = currentStack();

        if (!Number.isInteger(delta) || delta < 1) {
          return settle(
            option,
            "navigateBack:fail parameter error: delta should be a positive integer",
            false,
          );
        }

        if (stack.length <= delta)
          return settle(option, "navigateBack:fail cannot navigate back at first page", false);

        const target = stack[stack.length - delta - 1];

        emitRouteEvent("beforeAppRoute", target.route, {}, "navigateBack");

        for (let index = 0; index < delta; index += 1) {
          const page = stack.pop();

          invokeLifecycle(page, "onUnload");
        }

        invokeLifecycle(topPage(), "onShow");
        emitRouteEvent("appRoute", target.route, {}, "navigateBack");

        return settle(option, "navigateBack:ok", true, routeDone(target.route, {}, "navigateBack"));
      };
    }

    // istanbul ignore next -- `type` is a closed union whose every member is handled above
    default: {
      throw new TypeError(`[mock] unknown navigation type: ${type}`);
    }
  }
};

interface GlobalFramework {
  Page: (options: any) => void;
  App: (options: any) => void;
  Component: (options: any) => void;
  Behavior: (options: any) => void;
  getApp: () => unknown;
  getCurrentPages: () => unknown[];
}

/** 设置全局框架 mock */
export const setFrameworkMock = (): void => {
  const global = globalThis as unknown as GlobalFramework;

  global.Page = (options: any): void => {
    frameworkApi.pages.push(options);
  };
  global.App = (options: any): void => {
    frameworkApi.app = options;
  };
  global.Component = (options: any): void => {
    frameworkApi.components.push(options);
  };
  global.Behavior = (options: any): void => {
    frameworkApi.behaviors.push(options);
  };
  global.getApp = (): unknown => frameworkApi.app;
  global.getCurrentPages = (): unknown[] => [...frameworkApi.currentPages];
};

/** Wx 导航方法 */
export const frameworkApiMethods: Record<
  "navigateTo" | "navigateBack" | "redirectTo" | "switchTab" | "reLaunch",
  (option?: NavigationOption) => unknown
> = {
  navigateTo: createNavigator("navigateTo"),
  navigateBack: createNavigator("navigateBack"),
  redirectTo: createNavigator("redirectTo"),
  switchTab: createNavigator("switchTab"),
  reLaunch: createNavigator("reLaunch"),
};

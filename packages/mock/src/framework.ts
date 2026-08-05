// oxlint-disable typescript/no-explicit-any, typescript/no-unsafe-assignment

interface FrameworkApi {
  pages: any[];
  app: any;
  components: any[];
  behaviors: any[];
  currentPages: any[];
}

/** 框架 mock 状态 */
export const frameworkApi: FrameworkApi = {
  /** 注册的页面选项 */
  pages: [],
  /** 注册的应用选项 */
  app: void 0,
  /** 注册的组件选项 */
  components: [],
  /** 注册的 behaviors */
  behaviors: [],
  /** 当前页面栈 */
  currentPages: [],
};

export interface NavigationOption {
  url?: string;
  delta?: number;
  success?: (result: { errMsg: string }) => void;
  fail?: (result: { errMsg: string }) => void;
  complete?: (result: { errMsg: string }) => void;
}

/** 导航方法工厂 */
const createNavigator =
  (type: string) =>
  (option: NavigationOption = {}): unknown => {
    const result = { errMsg: `${type}:ok` };

    if (!option.success && !option.fail && !option.complete) return Promise.resolve(result);

    return setTimeout(() => {
      if (option.success) option.success(result);
      if (option.complete) option.complete(result);
    }, 0);
  };

interface GlobalFramework {
  Page: (options: any) => void;
  App: (options: any) => void;
  Component: (options: any) => void;
  Behavior: (options: any) => void;
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
  global.getCurrentPages = (): unknown[] => frameworkApi.currentPages;
};

/** Wx 导航方法 */
export const frameworkApiMethods = {
  navigateTo: createNavigator("navigateTo"),
  navigateBack: createNavigator("navigateBack"),
  redirectTo: createNavigator("redirectTo"),
  switchTab: createNavigator("switchTab"),
  reLaunch: createNavigator("reLaunch"),
};

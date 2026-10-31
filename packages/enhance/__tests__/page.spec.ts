import "@mptool/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { appState } from "../src/app/index.js";
import { $Config } from "../src/config/index.js";
import {
  ON_APP_AWAKE,
  ON_APP_LAUNCH,
  ON_PAGE_NAVIGATE,
  ON_PAGE_PRELOAD,
  ON_PAGE_READY,
  ON_PAGE_UNLOAD,
} from "../src/constant.js";
import { appEmitter, routeEmitter } from "../src/emitter/index.js";
import { $Page } from "../src/page/index.js";
import type { PageQuery } from "../src/page/typings.js";

type MyPageOptions = WechatMiniprogram.Page.Options<
  WechatMiniprogram.IAnyObject,
  WechatMiniprogram.IAnyObject
>;

interface PageState {
  firstOpen: boolean;
  [key: string]: unknown;
}

interface PageStateInstance {
  $state?: PageState;
}

interface CapturedPageOptions extends MyPageOptions {
  $state?: PageState;
}

interface PageInstanceLike {
  $refs?: Map<string, unknown>;
  $state?: PageState;
}

// Load a fresh `$Page` / `$Config` pair so `firstOpen` is isolated per test
const loadFreshPage = async (): Promise<{
  $Config: typeof $Config;
  $Page: typeof $Page;
}> => {
  vi.resetModules();

  const [{ $Config: freshConfig }, { $Page: freshPage }] = await Promise.all([
    import("../src/config/index.js"),
    import("../src/page/index.js"),
  ]);

  return { $Config: freshConfig, $Page: freshPage };
};

// Run one page instance through the wrapped `onLoad` and return the state it created
const loadPageState = (options: CapturedPageOptions | undefined): PageState => {
  const instance: PageStateInstance = {};

  if (options?.onLoad) void Reflect.apply(options.onLoad, instance, [{}]);

  // the wrapped `onLoad` always creates the instance state
  return instance.$state!;
};

// Run one page instance through the wrapped `onLoad` and return the instance
const loadPageInstance = (options: CapturedPageOptions | undefined): PageInstanceLike => {
  const instance: PageInstanceLike = {};

  if (options?.onLoad) void Reflect.apply(options.onLoad, instance, [{}]);

  return instance;
};

describe($Page, () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset singleton emitter listeners between cases
  afterEach(() => {
    // 清理全局 emitter 监听器，避免用例之间互相影响（shuffle-safe）
    appEmitter.all.clear();
    routeEmitter.all.clear();
  });

  const capturePageOptions = (): (() => CapturedPageOptions | undefined) => {
    let pageOptions: CapturedPageOptions | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    return () => pageOptions;
  };

  it("should mark the first page instance as firstOpen", async () => {
    const { $Config: freshConfig, $Page: freshPage } = await loadFreshPage();

    freshConfig({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    freshPage("index", {});

    expect(loadPageState(getOptions()).firstOpen).toBe(true);
  });

  it("should not mark later page instances as firstOpen", async () => {
    const { $Config: freshConfig, $Page: freshPage } = await loadFreshPage();

    freshConfig({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    freshPage("index", {});
    const firstState = loadPageState(getOptions());

    freshPage("channel", {});
    const secondState = loadPageState(getOptions());

    expect(firstState.firstOpen).toBe(true);
    expect(secondState.firstOpen).toBe(false);
  });

  it("should give every page instance its own $state", async () => {
    const { $Config: freshConfig, $Page: freshPage } = await loadFreshPage();

    freshConfig({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    freshPage("index", {});

    const options = getOptions()!;

    // Data written by the pre-instance lifecycles (which run with the page options as `this`) must
    // be inherited by the instance.
    options.$state = { firstOpen: false, preloaded: "yes" };

    const firstState = loadPageState(options);
    const secondState = loadPageState(options);

    expect(firstState).not.toBe(secondState);
    expect(firstState.preloaded).toBe("yes");
    expect(secondState.preloaded).toBe("yes");

    firstState.custom = "first";

    expect(firstState.custom).toBe("first");
    expect(secondState.custom).toBeUndefined();
  });

  it("should inherit synchronous $state written by onPreload", async () => {
    vi.resetModules();

    const [{ $Config: freshConfig }, { $Page: freshPage }, { routeEmitter: freshRouteEmitter }] =
      await Promise.all([
        import("../src/config/index.js"),
        import("../src/page/index.js"),
        import("../src/emitter/index.js"),
      ]);

    freshConfig({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    freshPage("index", {
      onPreload({ id }: PageQuery) {
        this.$state.preloaded = id;
      },
    });

    const options = getOptions()!;

    // 实例创建前的生命周期以页面选项对象作为 this；同步写入会在 onLoad 时继承
    freshRouteEmitter.emit(`${ON_PAGE_PRELOAD}:/pages/index`, { id: "42" });

    expect(loadPageState(options).preloaded).toBe("42");
  });

  it("should call onAppLaunch immediately when app has launched", () => {
    $Config({ defaultPage: "/pages/$name" });

    appState.launch = true;

    const onAppLaunch = vi.fn<(options: WechatMiniprogram.App.LaunchShowOption) => void>();

    $Page("index", { onAppLaunch });

    expect(onAppLaunch).toHaveBeenCalledTimes(1);
  });

  it("should call onAppLaunch when app launches later", () => {
    $Config({ defaultPage: "/pages/$name" });

    appState.launch = false;

    const onAppLaunch = vi.fn<(options: WechatMiniprogram.App.LaunchShowOption) => void>();

    $Page("index", { onAppLaunch });

    expect(onAppLaunch).not.toHaveBeenCalled();

    appEmitter.emit(ON_APP_LAUNCH, {
      path: "/pages/index",
      query: {},
      scene: 1001,
      shareTicket: "",
      referrerInfo: {},
    } as WechatMiniprogram.App.LaunchShowOption);

    expect(onAppLaunch).toHaveBeenCalledTimes(1);
  });

  it("should call onNavigate on route event", () => {
    $Config({ defaultPage: "/pages/$name" });

    const onNavigate = vi.fn<(query: PageQuery) => void>();

    $Page("index", { onNavigate });

    const query: PageQuery = { from: "/pages/home" };

    routeEmitter.emit(`${ON_PAGE_NAVIGATE}:/pages/index`, query);

    expect(onNavigate).toHaveBeenCalledWith(query);
  });

  it("should call onPreload on route event", () => {
    $Config({ defaultPage: "/pages/$name" });

    const onPreload = vi.fn<(query: PageQuery) => void>();

    $Page("index", { onPreload });

    const query: PageQuery = { from: "/pages/home" };

    routeEmitter.emit(`${ON_PAGE_PRELOAD}:/pages/index`, query);

    expect(onPreload).toHaveBeenCalledWith(query);
  });

  it("should emit page ready on onReady", () => {
    $Config({ defaultPage: "/pages/$name" });

    const readyHandler = vi.fn<() => void>();

    appEmitter.on(ON_PAGE_READY, readyHandler);

    const getOptions = capturePageOptions();

    $Page("index", {});

    void getOptions()?.onReady?.();

    expect(readyHandler).toHaveBeenCalledTimes(1);
  });

  it("should emit page unload on onUnload", () => {
    $Config({ defaultPage: "/pages/$name" });

    const unloadHandler = vi.fn<() => void>();

    appEmitter.on(ON_PAGE_UNLOAD, unloadHandler);

    const getOptions = capturePageOptions();

    $Page("index", {});

    void getOptions()?.onUnload?.();

    expect(unloadHandler).toHaveBeenCalledTimes(1);
  });

  it("should unregister onAwake listener on unload", () => {
    $Config({ defaultPage: "/pages/$name" });

    const onAwake = vi.fn<(time: number) => void>();

    const getOptions = capturePageOptions();

    $Page("index", { onAwake });

    // 触发 onLoad，注册 onAwake 监听器
    void getOptions()?.onLoad?.({});

    appEmitter.emit(ON_APP_AWAKE, 1000);
    expect(onAwake).toHaveBeenCalledWith(1000);

    // 触发 onUnload，注销 onAwake 监听器
    void getOptions()?.onUnload?.();

    appEmitter.emit(ON_APP_AWAKE, 2000);
    expect(onAwake).toHaveBeenCalledTimes(1);
  });

  it("should keep onAwake listeners isolated across instances", () => {
    $Config({ defaultPage: "/pages/$name" });

    const onAwakeA = vi.fn<(time: number) => void>();
    const onAwakeB = vi.fn<(time: number) => void>();

    const getOptions = capturePageOptions();

    $Page("index", { onAwake: onAwakeA });
    const optionsA = getOptions();

    $Page("index", { onAwake: onAwakeB });
    const optionsB = getOptions();

    // 两个实例各自 onLoad，注册各自的 onAwake 监听器
    void optionsA?.onLoad?.({});
    void optionsB?.onLoad?.({});

    appEmitter.emit(ON_APP_AWAKE, 1000);
    expect(onAwakeA).toHaveBeenCalledWith(1000);
    expect(onAwakeB).toHaveBeenCalledWith(1000);

    // 卸载实例 A，A 的监听器注销，B 的监听器仍应生效
    void optionsA?.onUnload?.();

    appEmitter.emit(ON_APP_AWAKE, 2000);
    expect(onAwakeA).toHaveBeenCalledTimes(1);
    expect(onAwakeB).toHaveBeenCalledTimes(2);
  });

  it("should log a rejected async onAwake instead of leaving it unhandled", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const error = new Error("onAwake failed");
    const onAwake = vi.fn<() => Promise<void>>().mockRejectedValue(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const getOptions = capturePageOptions();

      $Page("index", { onAwake });

      // 触发 onLoad，注册 onAwake 监听器
      void getOptions()?.onLoad?.({});

      appEmitter.emit(ON_APP_AWAKE, 1000);

      // 等待 rejection 处理器执行
      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith("Page index: onAwake rejected", error);
      });
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("should log a rejected async onAppLaunch instead of leaving it unhandled", async () => {
    $Config({ defaultPage: "/pages/$name" });

    appState.launch = true;

    const error = new Error("onAppLaunch failed");
    const onAppLaunch = vi.fn<() => Promise<void>>().mockRejectedValue(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      $Page("index", { onAppLaunch });

      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith("Page index: onAppLaunch rejected", error);
      });
    } finally {
      errorSpy.mockRestore();
      appState.launch = false;
    }
  });

  it("should not accumulate lifecycle listeners when a page is registered twice", () => {
    $Config({ defaultPage: "/pages/$name" });

    appState.launch = false;

    const onAppLaunch = vi.fn<(options: WechatMiniprogram.App.LaunchShowOption) => void>();
    const onNavigate = vi.fn<(query: PageQuery) => void>();
    const onPreload = vi.fn<(query: PageQuery) => void>();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      $Page("duplicate", { onAppLaunch, onNavigate, onPreload });
      $Page("duplicate", { onAppLaunch, onNavigate, onPreload });

      appEmitter.emit(ON_APP_LAUNCH, {
        path: "/pages/duplicate",
        query: {},
        scene: 1001,
        shareTicket: "",
        referrerInfo: {},
      } as WechatMiniprogram.App.LaunchShowOption);

      routeEmitter.emit(`${ON_PAGE_NAVIGATE}:/pages/duplicate`, { from: "home" });
      routeEmitter.emit(`${ON_PAGE_PRELOAD}:/pages/duplicate`, { from: "home" });

      // 重复注册会先注销旧监听器：每个生命周期只触发一次
      expect(onAppLaunch).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onPreload).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("registered more than once"));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("should run extendPage, injectPage and onRegister around registration", () => {
    const calls: string[] = [];
    let pageOptions: (CapturedPageOptions & { custom?: string }) | undefined;

    (globalThis as any).Page = (options: any): void => {
      calls.push("page");
      pageOptions = options;
    };

    $Config({
      defaultPage: "/pages/$name",
      extendPage: (name, options) => {
        calls.push(`extend:${name}`);

        // 框架扩展之前执行：$name 尚未写入，但可以预置任意选项
        expect((options as CapturedPageOptions).$name).toBeUndefined();
        (options as Record<string, unknown>).custom = "extended";
      },
      injectPage: (name, options) => {
        calls.push(`inject:${name}`);

        // 框架扩展之后执行：页面方法已挂载，可以覆盖
        expect(options.$getPath).toBeTypeOf("function");
        (options as CapturedPageOptions).$getPath = (target: string): string =>
          `/injected/${target}`;
      },
    });

    $Page("hooks", {
      onRegister() {
        calls.push("onRegister");
      },
    });

    // 注册钩子顺序：extendPage → 框架扩展 → injectPage → onRegister → Page()
    expect(calls).toStrictEqual(["extend:hooks", "inject:hooks", "onRegister", "page"]);
    expect(pageOptions?.custom).toBe("extended");

    const injectedGetPath = pageOptions?.$getPath as ((name: string) => string) | undefined;

    expect(injectedGetPath?.("main")).toBe("/injected/main");
  });

  it("should give every page instance its own $refs", async () => {
    const { $Config: freshConfig, $Page: freshPage } = await loadFreshPage();

    freshConfig({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    freshPage("index", {});

    const options = getOptions()!;

    // 页面定义（被所有实例共享）上不再挂载会被共享的 Map
    expect(options).not.toHaveProperty("$refs");

    const first = loadPageInstance(options);
    const second = loadPageInstance(options);

    expect(first.$refs).toBeInstanceOf(Map);
    expect(second.$refs).toBeInstanceOf(Map);
    expect(first.$refs).not.toBe(second.$refs);

    first.$refs?.set("child", { name: "first" });
    second.$refs?.set("child", { name: "second" });

    // 卸载一个实例只清理自己的引用，不影响另一个仍在页面栈中的实例
    void options.onUnload?.call(first);

    expect(first.$refs?.size).toBe(0);
    expect(second.$refs?.get("child")).toStrictEqual({ name: "second" });
  });

  it("should invoke onAwake with the page instance as this", () => {
    $Config({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();
    const contexts: unknown[] = [];

    $Page("index", {
      onAwake(this: unknown): void {
        contexts.push(this);
      },
    });

    const instance = loadPageInstance(getOptions());

    appEmitter.emit(ON_APP_AWAKE, 1000);

    expect(contexts[0]).toBe(instance);
  });

  it("should register the pre-instance lifecycles after mount / injectPage / onRegister", () => {
    const calls: string[] = [];
    let registeredOptions: CapturedPageOptions | undefined;
    let hasEmitter = false;
    let hasGo = false;

    (globalThis as any).Page = (options: any): void => {
      calls.push("page");
      registeredOptions = options;
    };

    $Config({
      defaultPage: "/pages/$name",
      injectPage: (name, options) => {
        calls.push(`inject:${name}`);

        // 模拟分包异步注册：注入的 onAppLaunch 在注册后立即同步触发
        (options as Record<string, unknown>).onAppLaunch = function onAppLaunch(
          this: Record<string, unknown>,
        ): void {
          calls.push("onAppLaunch");
          hasEmitter = typeof this.$emit === "function";
          hasGo = typeof this.$go === "function";
        };
      },
    });

    appState.launch = true;

    try {
      $Page("async", {
        onRegister() {
          calls.push("onRegister");
        },
      });
    } finally {
      appState.launch = false;
    }

    // injectPage → onRegister → onAppLaunch（同步触发）→ Page 注册
    expect(calls).toStrictEqual(["inject:async", "onRegister", "onAppLaunch", "page"]);
    // onAppLaunch 触发时框架方法已挂载
    expect(hasEmitter).toBe(true);
    expect(hasGo).toBe(true);
    expect(registeredOptions?.onAppLaunch).toBeTypeOf("function");
  });
});

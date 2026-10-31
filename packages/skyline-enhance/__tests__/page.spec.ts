import "@mptool/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { ON_APP_AWAKE } from "../src/constant.js";
import { appEmitter } from "../src/emitter/index.js";
import { $Page } from "../src/page/index.js";

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

interface PageInstanceLike {
  $refs?: Map<string, unknown>;
  $state?: PageState;
}

interface CapturedPageOptions extends MyPageOptions {
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

  it("should not mount $preload on the page instance", () => {
    $Config({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    $Page("index", {});

    // $preload 依赖 onPreload，skyline-enhance 不提供
    expect(getOptions()).not.toHaveProperty("$preload");
  });

  it("should not wire onAppLaunch / onNavigate / onPreload lifecycles", () => {
    $Config({ defaultPage: "/pages/$name" });

    const listenerCount = appEmitter.all.size;

    $Page("index", {
      onAppLaunch: vi.fn<() => void>(),
      onNavigate: vi.fn<() => void>(),
      onPreload: vi.fn<() => void>(),
    } as never);

    // skyline-enhance 不注册上述生命周期的任何监听
    expect(appEmitter.all.size).toBe(listenerCount);
  });

  it("should run extendPage before the framework extension", () => {
    const extended: {
      name: string;
      options: CapturedPageOptions;
      hasName: boolean;
      hasGo: boolean;
    }[] = [];

    $Config({
      defaultPage: "/pages/$name",
      extendPage: (name, options) => {
        const raw = options as Record<string, unknown>;

        // 记录调用瞬间的状态：options 在后续步骤中会被就地修改
        extended.push({
          name,
          options,
          hasName: "$name" in raw,
          hasGo: "$go" in raw,
        });
      },
    });

    const getOptions = capturePageOptions();

    $Page("index", {});

    expect(extended).toHaveLength(1);
    expect(extended[0].name).toBe("index");
    expect(extended[0].options).toBe(getOptions());

    // extendPage 早于框架扩展：此时选项上还没有框架注入的字段
    expect(extended[0].hasName).toBe(false);
    expect(extended[0].hasGo).toBe(false);
  });

  it("should run injectPage after the framework extension", () => {
    let injectedOptions: CapturedPageOptions | undefined;

    $Config({
      defaultPage: "/pages/$name",
      injectPage: (name, options) => {
        expect(name).toBe("index");
        injectedOptions = options;
      },
    });

    const getOptions = capturePageOptions();

    $Page("index", {});

    // injectPage 在 mount 之后执行，可以覆盖框架方法
    expect(injectedOptions).toBe(getOptions());
    expect(injectedOptions?.$name).toBe("index");
    expect(injectedOptions?.$go).toBeTypeOf("function");
  });

  it("should call onRegister before registering the page", () => {
    $Config({ defaultPage: "/pages/$name" });

    const calls: string[] = [];

    (globalThis as any).Page = (): void => {
      calls.push("register");
    };

    const onRegister = (): void => {
      calls.push("onRegister");
    };

    $Page("index", { onRegister } as never);

    expect(calls).toStrictEqual(["onRegister", "register"]);
  });

  it("should call the user onReady without a hot reload pattern", () => {
    $Config({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();
    const onReady = vi.fn<() => void>();

    $Page("index", { onReady });

    // 未配置 hotReloadPattern 时 onReady 包装直接放行
    expect(() => getOptions()?.onReady?.()).not.toThrow();
    expect(onReady).toHaveBeenCalledTimes(1);
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

  it("should give every page instance its own $refs", () => {
    $Config({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    $Page("index", {});

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

    // 子组件在 onLoad 之前已经触发 $attached 初始化了 $refs 时，onLoad 不得清空已有的引用
    const preAttached: PageInstanceLike = {
      $refs: new Map([["earlyChild", { name: "early" }]]),
    };

    void options.onLoad?.call(preAttached, {});

    expect(preAttached.$refs?.get("earlyChild")).toStrictEqual({ name: "early" });
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
});

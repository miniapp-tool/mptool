import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { ON_APP_AWAKE } from "../src/constant.js";
import { appEmitter } from "../src/emitter/index.js";
import { $Page } from "../src/page/index.js";

type MyPageOptions = WechatMiniprogram.Page.Options<
  WechatMiniprogram.IAnyObject,
  WechatMiniprogram.IAnyObject
>;

describe($Page, () => {
  const capturePageOptions = (): (() => MyPageOptions | undefined) => {
    let pageOptions: MyPageOptions | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    return () => pageOptions;
  };

  it("should mark the first page as firstOpen", () => {
    $Config({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    $Page("index", {});

    void getOptions()?.onLoad?.({});

    expect(getOptions()?.$state.firstOpen).toBe(true);
  });

  it("should not mark later pages as firstOpen", () => {
    $Config({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    $Page("channel", {});

    void getOptions()?.onLoad?.({});

    expect(getOptions()?.$state.firstOpen).toBe(false);
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
});

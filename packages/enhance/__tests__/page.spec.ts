import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

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

    expect(readyHandler).toHaveBeenCalledWith();
  });

  it("should emit page unload on onUnload", () => {
    $Config({ defaultPage: "/pages/$name" });

    const unloadHandler = vi.fn<() => void>();

    appEmitter.on(ON_PAGE_UNLOAD, unloadHandler);

    const getOptions = capturePageOptions();

    $Page("index", {});

    void getOptions()?.onUnload?.();

    expect(unloadHandler).toHaveBeenCalledWith();
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
});

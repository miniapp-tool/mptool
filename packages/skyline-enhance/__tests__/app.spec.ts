import { frameworkApi } from "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $App, appState } from "../src/app/index.js";
import { ON_APP_AWAKE } from "../src/constant.js";
import { appEmitter } from "../src/emitter/index.js";

describe($App, () => {
  it("should register app options", () => {
    $App({});

    expect(frameworkApi.app).toBeDefined();
  });

  it("should keep the user onLaunch callback untouched", () => {
    const onLaunch = vi.fn<(options: WechatMiniprogram.App.LaunchShowOption) => void>();

    $App({ onLaunch });

    const app = frameworkApi.app as WechatMiniprogram.App.Options<WechatMiniprogram.IAnyObject>;

    app.onLaunch?.({
      path: "/pages/main",
      query: {},
      scene: 1001,
      shareTicket: "",
      referrerInfo: {},
    } as WechatMiniprogram.App.LaunchShowOption);

    // skyline-enhance has no onAppLaunch lifecycle, so onLaunch is not wrapped
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("should register onAwake listener", () => {
    const onAwake = vi.fn<(time: number) => void>();

    $App({ onAwake });

    appEmitter.emit(ON_APP_AWAKE, 1000);

    expect(onAwake).toHaveBeenCalledWith(1000);
  });

  it("should invoke onAwake with the app instance as this", () => {
    const contexts: unknown[] = [];

    const appOptions = {
      onAwake(this: unknown): void {
        contexts.push(this);
      },
    };

    $App(appOptions);

    appEmitter.emit(ON_APP_AWAKE, 1000);

    // 小程序中 app 选项对象就是 app 实例
    expect(contexts[0]).toBe(appOptions);
  });

  it("should record hide timestamp on onHide", () => {
    $App({});

    const app = frameworkApi.app as WechatMiniprogram.App.Options<WechatMiniprogram.IAnyObject>;

    app.onHide?.();

    expect(appState.hide).toBeGreaterThan(0);
  });

  it("should not emit onAwake when the app shows without a hide", () => {
    const onAwake = vi.fn<(time: number) => void>();

    $App({ onAwake });

    const app = frameworkApi.app as WechatMiniprogram.App.Options<WechatMiniprogram.IAnyObject>;

    // 冷启动（未经历 onHide）时不应触发 onAwake
    appState.hide = 0;
    app.onShow?.({
      path: "/pages/main",
      query: {},
      scene: 1001,
      shareTicket: "",
      referrerInfo: {},
    } as WechatMiniprogram.App.LaunchShowOption);

    expect(onAwake).not.toHaveBeenCalled();
    expect(appState.hide).toBe(0);
  });

  it("should emit onAwake when app shows after hide", () => {
    const onAwake = vi.fn<(time: number) => void>();

    $App({ onAwake });

    const app = frameworkApi.app as WechatMiniprogram.App.Options<WechatMiniprogram.IAnyObject>;

    app.onHide?.();
    app.onShow?.({
      path: "/pages/main",
      query: {},
      scene: 1001,
      shareTicket: "",
      referrerInfo: {},
    } as WechatMiniprogram.App.LaunchShowOption);

    expect(onAwake).toHaveBeenCalledTimes(1);
    expect(appState.hide).toBe(0);
  });

  it("should log a rejected async onAwake instead of leaving it unhandled", async () => {
    const error = new Error("app awake failed");
    const onAwake = vi.fn<(time: number) => Promise<void>>().mockRejectedValue(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      $App({ onAwake });

      appEmitter.emit(ON_APP_AWAKE, 1000);

      // 等待 rejection 处理器执行
      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith("App: onAwake rejected after 1000ms", error);
      });
    } finally {
      errorSpy.mockRestore();
    }
  });
});

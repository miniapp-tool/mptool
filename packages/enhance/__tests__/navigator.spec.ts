import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config, getConfig } from "../src/config/index.js";
import { ON_PAGE_NAVIGATE, ON_PAGE_READY, ON_PAGE_UNLOAD } from "../src/constant.js";
import { appEmitter, routeEmitter } from "../src/emitter/index.js";
import { getTrigger } from "../src/navigator/index.js";
import type { PageQuery } from "../src/page/index.js";

describe("navigator", () => {
  // 模拟目标页加载完成 (ON_PAGE_READY)，在 minInterval 后释放导航锁
  const releaseLock = async (): Promise<void> => {
    appEmitter.emit(ON_PAGE_READY);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  // 配置并重置导航锁，避免测试间相互影响
  const setup = async (config: Parameters<typeof $Config>[0]): Promise<void> => {
    $Config({ minInterval: 0, ...config });
    await releaseLock();
  };

  // 重置导航锁：`ON_PAGE_UNLOAD` 不再解锁（旧页会在目标页 ready 前卸载），因此用 `ON_PAGE_READY`
  // 配合 0 延迟的 `minInterval` 立即释放，随后恢复原配置
  const resetNavigationLock = (): void => {
    const config = getConfig();

    $Config({ ...config, minInterval: 0 });
    appEmitter.emit(ON_PAGE_READY);
    $Config(config);
  };

  it("should navigate and release lock when onNavigate handler throws", async () => {
    await setup({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/play`, () => {
      throw new Error("onNavigate error");
    });

    const go = getTrigger("navigateTo");

    // 第一次导航：onNavigate 抛错不应阻塞导航
    await expect(go("play?cid=123")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/play?cid=123" });

    // 模拟目标页加载完成，释放导航锁
    await releaseLock();

    // 导航锁已释放：第二次导航应正常执行
    await expect(go("play")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(2);
  });

  it("should navigate and release lock when onNavigate handler rejects asynchronously", async () => {
    await setup({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/user`, () =>
      Promise.reject(new Error("async onNavigate error")),
    );

    const go = getTrigger("navigateTo");

    await expect(go("user")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/user" });

    // 模拟目标页加载完成，释放导航锁
    await releaseLock();

    await expect(go("user")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(2);
  });

  it("should navigate normally when onNavigate succeeds", async () => {
    await setup({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/main`, () => {
      // normal onNavigate handler
    });

    const go = getTrigger("navigateTo");

    await expect(go("main")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/main" });
  });

  it("should block concurrent navigation while lock is held", async () => {
    await setup({ defaultPage: "/pages/$name", maxDelay: 20 });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    // onNavigate handler 保持 pending，使导航锁在等待期间持续占用
    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/block`, () => new Promise<void>(() => {}));

    const go = getTrigger("navigateTo");

    const first = go("block");
    const second = go("block");

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();

    // 只有第一次导航真正执行了 wx.navigateTo
    expect(navigateTo).toHaveBeenCalledTimes(1);
  });

  it("should navigate after maxDelay when onNavigate is pending", async () => {
    await setup({ defaultPage: "/pages/$name", maxDelay: 20 });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    // onNavigate handler 保持 pending，maxDelay 后应照常导航
    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/slow`, () => new Promise<void>(() => {}));

    const go = getTrigger("navigateTo");

    await expect(go("slow")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/slow" });
  });

  it("should trigger onNavigate when config has no leading slash but call does", async () => {
    await setup({ defaultPage: "pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    // 页面注册 key 归一化为带前导斜杠
    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/play`, () => {});

    const go = getTrigger("navigateTo");

    // 带前导斜杠调用
    await expect(go("/pages/play")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/play" });

    // 模拟目标页加载完成，释放导航锁
    await releaseLock();

    // 不带前导斜杠调用（走 config.getPath）
    await expect(go("play")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(2);
  });

  it("should release the navigate lock when navigation fails", async () => {
    await setup({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>().mockRejectedValue(new Error("navigate fail"));

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    const go = getTrigger("navigateTo");

    // 第一次导航失败，应释放导航锁，避免死锁
    await expect(go("main")).rejects.toThrow("navigate fail");
    expect(navigateTo).toHaveBeenCalledTimes(1);

    // 锁已释放：第二次导航应正常执行
    navigateTo.mockResolvedValue(undefined);

    await expect(go("main")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(2);
  });

  it("should not release the navigate lock when the old page unloads before the target is ready", async () => {
    await setup({ defaultPage: "/pages/$name", minInterval: 0 });

    const redirectTo = vi.fn<() => Promise<{ errMsg: string }>>().mockResolvedValue({
      errMsg: "redirectTo:ok",
    });

    wx.redirectTo = redirectTo as unknown as typeof wx.redirectTo;

    const redirect = getTrigger("redirectTo");

    // 第一次跳转：redirectTo 成功后目标页尚未 ready，旧页已 onUnload
    await expect(redirect("main")).resolves.toStrictEqual({ errMsg: "redirectTo:ok" });
    expect(redirectTo).toHaveBeenCalledTimes(1);

    // 旧页卸载不得提前解锁：目标页 ready 前仍拦截后续导航
    appEmitter.emit(ON_PAGE_UNLOAD);

    await expect(redirect("main")).resolves.toBeUndefined();
    expect(redirectTo).toHaveBeenCalledTimes(1);

    // 目标页 ready（minInterval 为 0）后才解锁
    appEmitter.emit(ON_PAGE_READY);

    await expect(redirect("main")).resolves.toStrictEqual({ errMsg: "redirectTo:ok" });
    expect(redirectTo).toHaveBeenCalledTimes(2);
  });

  it("should not pass query to wx.switchTab", async () => {
    await setup({ defaultPage: "/pages/$name" });

    const switchTab = vi.fn<() => void>();

    wx.switchTab = switchTab as unknown as typeof wx.switchTab;

    const handler = vi.fn<(query: PageQuery) => void>();

    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/main`, handler);

    const go = getTrigger("switchTab");

    await expect(go("main?user=mrhope")).resolves.toBeUndefined();

    // query 只用于触发 onNavigate
    expect(handler).toHaveBeenCalledWith({ user: "mrhope" });
    // wx.switchTab 不允许带参数，仅传路径
    expect(switchTab).toHaveBeenCalledWith({ url: "/pages/main" });
  });

  it("should release the navigate lock after switchTab to an already loaded tab page", async () => {
    await setup({ defaultPage: "/pages/$name", minInterval: 0 });

    const switchTab = vi.fn<() => void>();

    wx.switchTab = switchTab as unknown as typeof wx.switchTab;

    const go = getTrigger("switchTab");

    await expect(go("main")).resolves.toBeUndefined();
    expect(switchTab).toHaveBeenCalledTimes(1);

    // 目标 tab 页已加载：切回时不会再触发 onReady / onUnload，
    // 锁应在 switchTab 成功后由自身释放，否则后续导航会永久失效
    await expect(go("main")).resolves.toBeUndefined();
    expect(switchTab).toHaveBeenCalledTimes(2);
  });

  it("should resolve undefined while the navigate lock is held", async () => {
    await setup({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    const go = getTrigger("navigateTo");

    // 第一次导航取得锁，目标页未 ready，锁保持
    await expect(go("main")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(1);

    const lockedResult = go("main");

    // 被锁的调用仍然返回 Promise（而不是 undefined），解析值为 undefined，调用方可以安全 await / then
    expect(lockedResult).toBeInstanceOf(Promise);
    await expect(lockedResult).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(1);

    // 清理残留的锁，避免影响后续用例
    resetNavigationLock();
  });

  it("should honor a custom lockTimeout", async () => {
    await setup({ defaultPage: "/pages/$name", minInterval: 0, lockTimeout: 30 });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    const go = getTrigger("navigateTo");

    vi.useFakeTimers();

    try {
      await expect(go("main")).resolves.toBeUndefined();
      expect(navigateTo).toHaveBeenCalledTimes(1);

      // 未达到自定义 lockTimeout：锁仍然有效
      await vi.advanceTimersByTimeAsync(29);

      await expect(go("main")).resolves.toBeUndefined();
      expect(navigateTo).toHaveBeenCalledTimes(1);

      // 达到 lockTimeout：锁被强制释放，下一次导航可执行
      await vi.advanceTimersByTimeAsync(1);

      await expect(go("main")).resolves.toBeUndefined();
      expect(navigateTo).toHaveBeenCalledTimes(2);
    } finally {
      resetNavigationLock();
      vi.useRealTimers();
    }
  });

  it("should clear the maxDelay timer once navigation resolves", async () => {
    await setup({ defaultPage: "/pages/$name", minInterval: 0, maxDelay: 1000 });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    const go = getTrigger("navigateTo");

    vi.useFakeTimers();

    try {
      await expect(go("main")).resolves.toBeUndefined();

      // 只剩导航锁的超时定时器：maxDelay 的竞速定时器已在 Promise.race 结束后清理
      expect(vi.getTimerCount()).toBe(1);
    } finally {
      resetNavigationLock();
      vi.useRealTimers();
    }
  });

  it("should force release the navigate lock when the target page never becomes ready", async () => {
    await setup({ defaultPage: "/pages/$name", minInterval: 0, maxDelay: 0 });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    const go = getTrigger("navigateTo");

    vi.useFakeTimers();

    try {
      await expect(go("main")).resolves.toBeUndefined();
      expect(navigateTo).toHaveBeenCalledTimes(1);

      // 页面一直不触发 onReady / onUnload：超时兜底释放锁
      await vi.advanceTimersByTimeAsync(5000);

      await expect(go("main")).resolves.toBeUndefined();
      expect(navigateTo).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      // 清理可能残留的锁，避免影响后续用例
      resetNavigationLock();
    }
  });

  it("should release the navigate lock after the default minInterval when none is configured", async () => {
    // 不配置 minInterval：使用默认值 100ms
    $Config({ defaultPage: "/pages/$name" });

    // 确保用例开始前没有残留的导航锁
    resetNavigationLock();

    const navigateTo = vi
      .fn<() => Promise<{ errMsg: string }>>()
      .mockResolvedValue({ errMsg: "navigateTo:ok" });

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    const go = getTrigger("navigateTo");

    vi.useFakeTimers();

    try {
      await expect(go("main")).resolves.toStrictEqual({ errMsg: "navigateTo:ok" });
      expect(navigateTo).toHaveBeenCalledTimes(1);

      // 目标页 ready 后按默认 minInterval 延迟释放：期间导航仍被拦截
      appEmitter.emit(ON_PAGE_READY);

      await vi.advanceTimersByTimeAsync(99);

      await expect(go("main")).resolves.toBeUndefined();
      expect(navigateTo).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);

      await expect(go("main")).resolves.toStrictEqual({ errMsg: "navigateTo:ok" });
      expect(navigateTo).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      resetNavigationLock();
    }
  });

  it("should use the default minInterval when switchTab succeeds without config", async () => {
    $Config({ defaultPage: "/pages/$name" });

    resetNavigationLock();

    const switchTab = vi
      .fn<() => Promise<{ errMsg: string }>>()
      .mockResolvedValue({ errMsg: "switchTab:ok" });

    wx.switchTab = switchTab as unknown as typeof wx.switchTab;

    const go = getTrigger("switchTab");

    vi.useFakeTimers();

    try {
      await expect(go("main")).resolves.toStrictEqual({ errMsg: "switchTab:ok" });
      expect(switchTab).toHaveBeenCalledTimes(1);

      // 已加载过的 tab 页不会再触发 onReady / onUnload：成功回调按默认 minInterval 释放锁
      await expect(go("main")).resolves.toBeUndefined();
      expect(switchTab).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(100);

      await expect(go("main")).resolves.toStrictEqual({ errMsg: "switchTab:ok" });
      expect(switchTab).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      resetNavigationLock();
    }
  });

  it("should not keep the navigate lock when path resolution fails", async () => {
    await setup({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    const go = getTrigger("navigateTo");

    // 自定义 getPath 抛错：解析目标失败时不应获取导航锁
    $Config({
      minInterval: 0,
      getPath: () => {
        throw new Error("bad route");
      },
    });

    await expect(go("unknown")).rejects.toThrow("bad route");
    expect(navigateTo).not.toHaveBeenCalled();

    // 恢复合法配置：锁没有被占用，下一次导航应立即执行
    $Config({ minInterval: 0, defaultPage: "/pages/$name" });

    await expect(go("main")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/main" });

    // 清理导航锁，避免影响其它用例
    resetNavigationLock();
  });
});

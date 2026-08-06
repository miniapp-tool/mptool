import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
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

  it("should release the navigate lock when the page unloads before onReady", async () => {
    await setup({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    const go = getTrigger("navigateTo");

    // 第一次导航：页面在 onLoad 阶段被强制回退，未触发 onReady，仅触发 onUnload
    await expect(go("main")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(1);

    // 页面卸载，应释放导航锁，避免死锁
    appEmitter.emit(ON_PAGE_UNLOAD);

    // 锁已释放：第二次导航应正常执行
    await expect(go("main")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(2);
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
});

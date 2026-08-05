import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { ON_PAGE_NAVIGATE } from "../src/constant.js";
import { routeEmitter } from "../src/emitter/index.js";
import { getTrigger } from "../src/navigator/index.js";

describe("navigator", () => {
  it("should navigate and release lock when onNavigate handler throws", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/play`, () => {
      throw new Error("onNavigate error");
    });

    const go = getTrigger("navigateTo");

    // 第一次导航：onNavigate 抛错不应阻塞导航
    await expect(go("play?cid=123")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/play?cid=123" });

    // 导航锁已释放：第二次导航应正常执行
    await expect(go("play")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(2);
  });

  it("should navigate and release lock when onNavigate handler rejects asynchronously", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/user`, () =>
      Promise.reject(new Error("async onNavigate error")),
    );

    const go = getTrigger("navigateTo");

    await expect(go("user")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/user" });

    await expect(go("user")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledTimes(2);
  });

  it("should navigate normally when onNavigate succeeds", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    routeEmitter.on(`${ON_PAGE_NAVIGATE}:/pages/main`, () => {
      // normal onNavigate handler
    });

    const go = getTrigger("navigateTo");

    await expect(go("main")).resolves.toBeUndefined();
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/main" });
  });
});

import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { getFullPath, getTrigger } from "../src/navigator/index.js";

describe(getFullPath, () => {
  it("should replace $name in default path", () => {
    $Config({ defaultPage: "/pages/$name" });

    expect(getFullPath("index")).toBe("/pages/index");
  });

  it("should keep absolute path", () => {
    $Config({ defaultPage: "/pages/$name" });

    expect(getFullPath("/custom/path")).toBe("/custom/path");
  });

  it("should keep query string", () => {
    $Config({ defaultPage: "/pages/$name" });

    expect(getFullPath("index?a=1&b=2")).toBe("/pages/index?a=1&b=2");
  });
});

describe(getTrigger, () => {
  it("should call wx.navigateTo with full path", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    wx.navigateTo = navigateTo as unknown as typeof wx.navigateTo;

    await getTrigger("navigateTo")("play?cid=123");

    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/play?cid=123" });
  });

  it("should call wx.redirectTo with full path", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const redirectTo = vi.fn<() => void>();

    wx.redirectTo = redirectTo as unknown as typeof wx.redirectTo;

    await getTrigger("redirectTo")("index");

    expect(redirectTo).toHaveBeenCalledWith({ url: "/pages/index" });
  });

  it("should call wx.switchTab with full path", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const switchTab = vi.fn<() => void>();

    wx.switchTab = switchTab as unknown as typeof wx.switchTab;

    await getTrigger("switchTab")("index");

    expect(switchTab).toHaveBeenCalledWith({ url: "/pages/index" });
  });

  it("should call wx.reLaunch with full path", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const reLaunch = vi.fn<() => void>();

    wx.reLaunch = reLaunch as unknown as typeof wx.reLaunch;

    await getTrigger("reLaunch")("index");

    expect(reLaunch).toHaveBeenCalledWith({ url: "/pages/index" });
  });
});

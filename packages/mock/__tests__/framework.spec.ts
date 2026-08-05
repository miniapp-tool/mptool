import { describe, expect, it } from "vitest";

import { frameworkApi, setFrameworkMock } from "../src/framework.js";
import { wx } from "../src/index.js";

describe("framework mock", () => {
  it("should register pages via global Page", () => {
    setFrameworkMock();

    (globalThis as unknown as { Page: (options: unknown) => void }).Page({
      route: "/pages/main",
    });

    expect(frameworkApi.pages).toContainEqual({ route: "/pages/main" });
  });

  it("should register app via global App", () => {
    setFrameworkMock();

    (globalThis as unknown as { App: (options: unknown) => void }).App({ globalData: { a: 1 } });

    expect(frameworkApi.app).toStrictEqual({ globalData: { a: 1 } });
  });

  it("should register components via global Component", () => {
    setFrameworkMock();

    (globalThis as unknown as { Component: (options: unknown) => void }).Component({});

    expect(frameworkApi.components.length).toBeGreaterThan(0);
  });

  it("should resolve navigation via wx.navigateTo", async () => {
    const result = await (
      wx as unknown as { navigateTo: (option: object) => Promise<unknown> }
    ).navigateTo({ url: "/pages/main" });

    expect(result).toStrictEqual({ errMsg: "navigateTo:ok" });
  });

  it("should resolve wx.navigateBack", async () => {
    const result = await (
      wx as unknown as { navigateBack: (option: object) => Promise<unknown> }
    ).navigateBack({});

    expect(result).toStrictEqual({ errMsg: "navigateBack:ok" });
  });

  it("should resolve wx.redirectTo", async () => {
    const result = await (
      wx as unknown as { redirectTo: (option: object) => Promise<unknown> }
    ).redirectTo({ url: "/pages/main" });

    expect(result).toStrictEqual({ errMsg: "redirectTo:ok" });
  });

  it("should resolve wx.switchTab", async () => {
    const result = await (
      wx as unknown as { switchTab: (option: object) => Promise<unknown> }
    ).switchTab({ url: "/pages/main" });

    expect(result).toStrictEqual({ errMsg: "switchTab:ok" });
  });

  it("should resolve wx.reLaunch", async () => {
    const result = await (
      wx as unknown as { reLaunch: (option: object) => Promise<unknown> }
    ).reLaunch({ url: "/pages/main" });

    expect(result).toStrictEqual({ errMsg: "reLaunch:ok" });
  });

  it("should call success and complete callbacks", () =>
    new Promise<void>((resolve) => {
      (
        wx as unknown as {
          redirectTo: (option: {
            success?: (result: { errMsg: string }) => void;
            complete?: (result: { errMsg: string }) => void;
          }) => void;
        }
      ).redirectTo({
        success: (result): void => {
          expect(result.errMsg).toBe("redirectTo:ok");
        },
        complete: (result): void => {
          expect(result.errMsg).toBe("redirectTo:ok");
          resolve();
        },
      });
    }));

  it("should register behaviors via global Behavior", () => {
    setFrameworkMock();

    (globalThis as unknown as { Behavior: (options: unknown) => void }).Behavior({});

    expect(frameworkApi.behaviors.length).toBeGreaterThan(0);
  });
});

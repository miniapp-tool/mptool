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
});

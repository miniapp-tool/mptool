import { beforeEach, describe, expect, it } from "vitest";

import { frameworkApi, setFrameworkMock } from "../src/framework.js";
import { mockWx, wx } from "../src/index.js";

interface PageOptions {
  $name?: string;
  data?: Record<string, unknown>;
  isTabBar?: boolean;
  route?: string;
  tabBar?: boolean;
  [key: string]: unknown;
}

interface NavigationResult {
  errMsg: string;
}

const navigateTo = (option: { url?: string } = {}): Promise<NavigationResult> =>
  (wx as unknown as { navigateTo: (value: object) => Promise<NavigationResult> }).navigateTo(
    option,
  );

const redirectTo = (url: string): Promise<NavigationResult> =>
  (wx as unknown as { redirectTo: (value: object) => Promise<NavigationResult> }).redirectTo({
    url,
  });

const switchTab = (url: string): Promise<NavigationResult> =>
  (wx as unknown as { switchTab: (value: object) => Promise<NavigationResult> }).switchTab({ url });

const reLaunch = (url: string): Promise<NavigationResult> =>
  (wx as unknown as { reLaunch: (value: object) => Promise<NavigationResult> }).reLaunch({ url });

const navigateBack = (delta?: number): Promise<NavigationResult> =>
  (wx as unknown as { navigateBack: (value: object) => Promise<NavigationResult> }).navigateBack({
    delta,
  });

const registerPage = (route: string, options: PageOptions = {}): PageOptions => {
  const pageOptions: PageOptions = { ...options, route };

  (globalThis as unknown as { Page: (value: PageOptions) => void }).Page(pageOptions);

  return pageOptions;
};

const recordLifecycle = (): { calls: string[]; touch: (name: string) => () => void } => {
  const calls: string[] = [];

  return {
    calls,
    touch: (name) => () => {
      calls.push(name);
    },
  };
};

describe("framework mock", () => {
  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    setFrameworkMock();

    frameworkApi.pages.length = 0;
    frameworkApi.currentPages.length = 0;
    frameworkApi.app = void 0;
    frameworkApi.components.length = 0;
    frameworkApi.behaviors.length = 0;
  });

  describe("registration", () => {
    it("should register pages via global Page", () => {
      registerPage("/pages/main");

      expect(frameworkApi.pages).toContainEqual({ route: "/pages/main" });
    });

    it("should register the app and expose it through getApp", () => {
      (globalThis as unknown as { App: (value: unknown) => void }).App({ globalData: { a: 1 } });

      expect(frameworkApi.app).toStrictEqual({ globalData: { a: 1 } });
      expect((globalThis as unknown as { getApp: () => unknown }).getApp()).toStrictEqual({
        globalData: { a: 1 },
      });
    });

    it("should register components and behaviors", () => {
      (globalThis as unknown as { Component: (value: unknown) => void }).Component({});
      (globalThis as unknown as { Behavior: (value: unknown) => void }).Behavior({});

      expect(frameworkApi.components.length).toBeGreaterThan(0);
      expect(frameworkApi.behaviors.length).toBeGreaterThan(0);
    });

    it("should start with an empty page stack", () => {
      expect(
        (globalThis as unknown as { getCurrentPages: () => unknown[] }).getCurrentPages(),
      ).toStrictEqual([]);
    });
  });

  describe("navigateTo", () => {
    it("should push a page instance and run its lifecycle in order", async () => {
      const lifecycle = recordLifecycle();

      registerPage("/pages/main", {
        data: { value: 1 },
        onLoad: lifecycle.touch("onLoad"),
        onReady: lifecycle.touch("onReady"),
        onShow: lifecycle.touch("onShow"),
      });

      await expect(navigateTo({ url: "/pages/main" })).resolves.toStrictEqual({
        errMsg: "navigateTo:ok",
      });

      expect(frameworkApi.currentPages).toHaveLength(1);
      expect(frameworkApi.currentPages[0]).toMatchObject({ route: "/pages/main" });
      expect(lifecycle.calls).toStrictEqual(["onLoad", "onShow", "onReady"]);
    });

    it("should pass the query to onLoad and expose page data / setData", async () => {
      let loadedQuery: Record<string, string> | undefined;

      registerPage("/pages/detail", {
        data: { count: 0 },
        onLoad(query: Record<string, string>) {
          loadedQuery = query;
        },
      });

      await navigateTo({ url: "/pages/detail?id=3&name=a%20b" });

      const page = frameworkApi.currentPages[0] as {
        data: { count: number };
        setData: (patch: Record<string, unknown>) => void;
      };

      expect(loadedQuery).toStrictEqual({ id: "3", name: "a b" });
      expect(page.data.count).toBe(0);

      page.setData({ count: 2 });
      expect(page.data.count).toBe(2);
    });

    it("should hide the previous page before showing the new one", async () => {
      const calls: string[] = [];

      registerPage("/pages/first", {
        onHide: () => calls.push("first:onHide"),
        onLoad: () => calls.push("first:onLoad"),
        onReady: () => calls.push("first:onReady"),
        onShow: () => calls.push("first:onShow"),
      });
      registerPage("/pages/second", {
        onLoad: () => calls.push("second:onLoad"),
        onReady: () => calls.push("second:onReady"),
        onShow: () => calls.push("second:onShow"),
      });

      await navigateTo({ url: "/pages/first" });
      await navigateTo({ url: "/pages/second" });

      expect(calls).toStrictEqual([
        "first:onLoad",
        "first:onShow",
        "first:onReady",
        "first:onHide",
        "second:onLoad",
        "second:onShow",
        "second:onReady",
      ]);
      expect(frameworkApi.currentPages).toHaveLength(2);
      expect(frameworkApi.currentPages[1]).toMatchObject({ route: "/pages/second" });
    });

    it("should match a page by $name", async () => {
      registerPage("/pages/main", { $name: "main" });

      await expect(navigateTo({ url: "/pages/main" })).resolves.toStrictEqual({
        errMsg: "navigateTo:ok",
      });
    });

    it("should fail when the page is not registered", async () => {
      registerPage("/pages/main");

      await expect(navigateTo({ url: "/pages/missing" })).rejects.toMatchObject({
        errMsg: 'navigateTo:fail page "/pages/missing" is not found',
      });
      expect(frameworkApi.currentPages).toStrictEqual([]);
    });

    it("should call fail and complete on failure", () =>
      new Promise<void>((resolve) => {
        const events: string[] = [];

        (
          wx as unknown as {
            navigateTo: (option: {
              complete?: (result: { errMsg: string }) => void;
              fail?: (result: { errMsg: string }) => void;
              url: string;
            }) => void;
          }
        ).navigateTo({
          url: "/pages/missing",
          fail: (result) => {
            events.push(result.errMsg);
          },
          complete: (result) => {
            events.push(result.errMsg);
            expect(events).toHaveLength(2);
            resolve();
          },
        });
      }));

    it("should fail when the stack reaches 10 pages", async () => {
      registerPage("/pages/limit");

      for (let index = 0; index < 10; index += 1) {
        // oxlint-disable-next-line no-await-in-loop
        await navigateTo({ url: "/pages/limit" });
      }

      await expect(navigateTo({ url: "/pages/limit" })).rejects.toMatchObject({
        errMsg: "navigateTo:fail webview count limit exceed",
      });
      expect(frameworkApi.currentPages).toHaveLength(10);
    });
  });

  describe("redirectTo", () => {
    it("should replace the current page and unload it", async () => {
      const calls: string[] = [];

      registerPage("/pages/old", {
        onUnload: () => calls.push("old:onUnload"),
      });
      registerPage("/pages/new", {
        onLoad: () => calls.push("new:onLoad"),
        onReady: () => calls.push("new:onReady"),
        onShow: () => calls.push("new:onShow"),
      });

      await navigateTo({ url: "/pages/old" });
      await redirectTo("/pages/new");

      expect(calls).toStrictEqual(["old:onUnload", "new:onLoad", "new:onShow", "new:onReady"]);
      expect(frameworkApi.currentPages).toHaveLength(1);
      expect(frameworkApi.currentPages[0]).toMatchObject({ route: "/pages/new" });
    });

    it("should fail for an unknown page", async () => {
      await expect(redirectTo("/pages/missing")).rejects.toMatchObject({
        errMsg: 'redirectTo:fail page "/pages/missing" is not found',
      });
    });
  });

  describe("navigateBack", () => {
    it("should unload the current page and show the previous one", async () => {
      const calls: string[] = [];

      registerPage("/pages/first", {
        onShow: () => calls.push("first:onShow"),
      });
      registerPage("/pages/second", {
        onUnload: () => calls.push("second:onUnload"),
      });

      await navigateTo({ url: "/pages/first" });
      await navigateTo({ url: "/pages/second" });
      await navigateBack();

      expect(calls).toStrictEqual(["first:onShow", "second:onUnload", "first:onShow"]);
      expect(frameworkApi.currentPages).toHaveLength(1);
      expect(frameworkApi.currentPages[0]).toMatchObject({ route: "/pages/first" });
    });

    it("should unload delta pages", async () => {
      for (const route of ["/pages/a", "/pages/b", "/pages/c"]) registerPage(route);

      await navigateTo({ url: "/pages/a" });
      await navigateTo({ url: "/pages/b" });
      await navigateTo({ url: "/pages/c" });
      await navigateBack(2);

      expect(frameworkApi.currentPages).toHaveLength(1);
      expect(frameworkApi.currentPages[0]).toMatchObject({ route: "/pages/a" });
    });

    it("should fail at the first page", async () => {
      registerPage("/pages/main");
      await navigateTo({ url: "/pages/main" });

      await expect(navigateBack()).rejects.toMatchObject({
        errMsg: "navigateBack:fail cannot navigate back at first page",
      });
    });

    it("should reject an invalid delta", async () => {
      await expect(navigateBack(0)).rejects.toMatchObject({
        errMsg: "navigateBack:fail parameter error: delta should be a positive integer",
      });
    });
  });

  describe("switchTab", () => {
    it("should clear the stack and open the tab page", async () => {
      registerPage("/pages/tab", { tabBar: true });
      registerPage("/pages/other");

      await navigateTo({ url: "/pages/other" });

      await expect(switchTab("/pages/tab")).resolves.toStrictEqual({ errMsg: "switchTab:ok" });
      expect(frameworkApi.currentPages).toHaveLength(1);
      expect(frameworkApi.currentPages[0]).toMatchObject({ route: "/pages/tab" });
    });

    it("should fail when the target is not a tabBar page", async () => {
      registerPage("/pages/tab", { tabBar: true });
      registerPage("/pages/no-tab");

      await expect(switchTab("/pages/no-tab")).rejects.toMatchObject({
        errMsg: "switchTab:fail can not switch to no-tabBar page",
      });
    });

    it("should fail for an unknown page", async () => {
      await expect(switchTab("/pages/missing")).rejects.toMatchObject({
        errMsg: 'switchTab:fail page "/pages/missing" is not found',
      });
    });

    it("should keep tab pages alive and only show/hide them", async () => {
      const calls: string[] = [];

      registerPage("/pages/home", {
        tabBar: true,
        onHide: () => calls.push("home:hide"),
        onLoad: () => calls.push("home:load"),
        onReady: () => calls.push("home:ready"),
        onShow: () => calls.push("home:show"),
        onUnload: () => calls.push("home:unload"),
      });
      registerPage("/pages/mine", {
        tabBar: true,
        onHide: () => calls.push("mine:hide"),
        onLoad: () => calls.push("mine:load"),
        onReady: () => calls.push("mine:ready"),
        onShow: () => calls.push("mine:show"),
        onUnload: () => calls.push("mine:unload"),
      });

      await switchTab("/pages/home");

      const [homePage] = frameworkApi.currentPages;

      await switchTab("/pages/mine");
      await switchTab("/pages/home");

      expect(calls).toStrictEqual([
        "home:load",
        "home:show",
        "home:ready",
        "home:hide",
        "mine:load",
        "mine:show",
        "mine:ready",
        "mine:hide",
        "home:show",
      ]);
      expect(frameworkApi.currentPages).toStrictEqual([homePage]);
      expect(calls).not.toContain("home:unload");
      expect(calls).not.toContain("mine:unload");
    });

    it("should accept tab pages configured through mockWx.tabBar()", async () => {
      mockWx.tabBar(["/pages/configured", "/pages/other-tab"]);
      registerPage("/pages/configured");
      registerPage("/pages/other-tab");

      await switchTab("/pages/configured");
      await switchTab("/pages/other-tab");

      expect(frameworkApi.currentPages[0]).toMatchObject({ route: "/pages/other-tab" });
    });

    it("should reject navigateTo / redirectTo for tab pages", async () => {
      mockWx.tabBar(["/pages/home"]);
      registerPage("/pages/home");

      await expect(navigateTo({ url: "/pages/home" })).rejects.toMatchObject({
        errMsg: "navigateTo:fail can not navigateTo a tabbar page",
      });
      await expect(redirectTo("/pages/home")).rejects.toMatchObject({
        errMsg: "redirectTo:fail can not redirectTo a tabbar page",
      });
    });
  });

  describe("reLaunch", () => {
    it("should unload every page and open the target", async () => {
      const calls: string[] = [];

      registerPage("/pages/old", { onUnload: () => calls.push("old:onUnload") });
      registerPage("/pages/new", {
        onLoad: () => calls.push("new:onLoad"),
        onReady: () => calls.push("new:onReady"),
        onShow: () => calls.push("new:onShow"),
      });

      await navigateTo({ url: "/pages/old" });
      await reLaunch("/pages/new");

      expect(calls).toStrictEqual(["old:onUnload", "new:onLoad", "new:onShow", "new:onReady"]);
      expect(frameworkApi.currentPages).toHaveLength(1);
      expect(frameworkApi.currentPages[0]).toMatchObject({ route: "/pages/new" });
    });

    it("should fail for an unknown page", async () => {
      await expect(reLaunch("/pages/missing")).rejects.toMatchObject({
        errMsg: 'reLaunch:fail page "/pages/missing" is not found',
      });
    });
  });

  describe("getCurrentPages", () => {
    it("should return a copy of the stack", async () => {
      registerPage("/pages/main");
      await navigateTo({ url: "/pages/main" });

      const pages = (
        globalThis as unknown as { getCurrentPages: () => unknown[] }
      ).getCurrentPages();

      pages.pop();

      expect(frameworkApi.currentPages).toHaveLength(1);
      expect(
        (globalThis as unknown as { getCurrentPages: () => unknown[] }).getCurrentPages(),
      ).toHaveLength(1);
    });
  });
});

// oxlint-disable vitest/max-expects -- grouped navigation assertions
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { frameworkApi, normalizeRoute, setFrameworkMock } from "../src/framework.js";
import { mockWx, wx } from "../src/index.js";
import {
  createIntersectionResult,
  disconnectObserver,
  takeObserverRecords,
} from "../src/wxmlState.js";

interface PageOptions {
  $name?: string;
  data?: Record<string, unknown>;
  isTabBar?: boolean;
  onUnload?: () => void;
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

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("framework navigation edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    setFrameworkMock();
    frameworkApi.pages.length = 0;
    frameworkApi.currentPages.length = 0;
    frameworkApi.tabBarPages.length = 0;
    frameworkApi.tabPages.clear();
  });

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  it("should fail navigation without a URL", async () => {
    const wxAny = wx as unknown as Record<string, (...args: any[]) => Promise<NavigationResult>>;

    await expect(wxAny.navigateTo()).rejects.toMatchObject({ errMsg: /parameter error/u });
    await expect(wxAny.redirectTo()).rejects.toMatchObject({ errMsg: /parameter error/u });
    await expect(wxAny.switchTab()).rejects.toMatchObject({ errMsg: /parameter error/u });
    await expect(wxAny.reLaunch()).rejects.toMatchObject({ errMsg: /parameter error/u });
    await expect(wxAny.navigateBack()).rejects.toMatchObject({ errMsg: /parameter error/u });

    await expect(navigateTo()).rejects.toMatchObject({ errMsg: /parameter error/u });
    await expect(navigateTo({ url: "" })).rejects.toMatchObject({ errMsg: /parameter error/u });
    await expect(redirectTo("")).rejects.toMatchObject({ errMsg: /parameter error/u });
    await expect(switchTab("")).rejects.toMatchObject({ errMsg: /parameter error/u });
    await expect(reLaunch("")).rejects.toMatchObject({ errMsg: /parameter error/u });
  });

  it("should parse the root URL and unknown query strings", async () => {
    registerPage("/pages/q");

    await expect(navigateTo({ url: "/" })).rejects.toMatchObject({ errMsg: /is not found/u });

    await navigateTo({ url: "/pages/q?flag&bad=%E0%A4%A" });

    expect(frameworkApi.currentPages[0]?.options).toStrictEqual({
      bad: "%E0%A4%A",
      flag: "",
    });
  });

  it("should call the setData callback", async () => {
    registerPage("/pages/set-data");

    await navigateTo({ url: "/pages/set-data" });

    const callback = vi.fn<() => void>();
    const page = frameworkApi.currentPages[0] as unknown as {
      data: Record<string, unknown>;
      setData: (patch: Record<string, unknown>, callback?: () => void) => void;
    };

    page.setData({ value: 1 }, callback);
    await tick();

    expect(page.data.value).toBe(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should keep the tab page when switchTab targets the current route", async () => {
    registerPage("/pages/tab", { tabBar: true });

    await switchTab("/pages/tab");
    const [page] = frameworkApi.currentPages;

    await expect(switchTab("/pages/tab")).resolves.toStrictEqual({ errMsg: "switchTab:ok" });
    expect(frameworkApi.currentPages).toStrictEqual([page]);
  });

  it("should open a tab page through reLaunch and cache it", async () => {
    registerPage("/pages/tab", { tabBar: true });

    await reLaunch("/pages/tab");

    expect(frameworkApi.tabPages.get("/pages/tab")).toMatchObject({ route: "/pages/tab" });
  });

  it("should unload cached tab pages that left the stack", async () => {
    const calls: string[] = [];

    registerPage("/pages/a", {
      onUnload: (): void => {
        calls.push("a:unload");
      },
      tabBar: true,
    });
    registerPage("/pages/b", {
      onUnload: (): void => {
        calls.push("b:unload");
      },
      tabBar: true,
    });
    registerPage("/pages/c", {
      onUnload: (): void => {
        calls.push("c:unload");
      },
    });

    await switchTab("/pages/a");
    await switchTab("/pages/b");
    await reLaunch("/pages/c");

    expect(calls).toContain("a:unload");
    expect(calls).toContain("b:unload");
  });

  it("should default navigateBack delta and accept an empty option", async () => {
    registerPage("/pages/main");
    await navigateTo({ url: "/pages/main" });

    await expect(navigateBack()).rejects.toMatchObject({
      errMsg: /cannot navigate back at first page/u,
    });
  });

  it("should normalize tabBar routes", () => {
    expect(normalizeRoute("/pages/a/")).toBe("/pages/a");
    expect(normalizeRoute("pages/a?x=1")).toBe("/pages/a");
    expect(normalizeRoute("/")).toBe("/");

    mockWx.tabBar(["/", "/pages/a/"]);

    expect(frameworkApi.tabBarPages).toStrictEqual(["/", "/pages/a"]);
  });
});

describe("wxml edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset fixtures and observers after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should fall back to zero width / height and support partial fields", async () => {
    mockWx.node("#only", { id: "only" });

    const query = wx.createSelectorQuery();
    const rect = await new Promise<Record<string, number>>((resolve) => {
      query
        .select("#only")
        .boundingClientRect((value) => {
          resolve(value as Record<string, number>);
        })
        .exec();
    });

    expect(rect).toMatchObject({ bottom: 0, height: 0, width: 0 });

    const fields = await new Promise<Record<string, unknown>>((resolve) => {
      const partial = wx.createSelectorQuery();

      partial
        .select("#only")
        .fields({ id: true }, (value) => {
          resolve(value as Record<string, unknown>);
        })
        .exec();
    });

    expect(fields).toStrictEqual({ id: "only" });
  });

  it("should return node / context / ref values and null fallbacks", async () => {
    const node = { tag: "view" };
    const context = { value: 1 };
    const ref = { value: 2 };

    mockWx.node("#full", { context, fields: { properties: { a: 1 } }, id: "full", node, ref });

    const fields = await new Promise<Record<string, unknown>>((resolve) => {
      const query = wx.createSelectorQuery();

      query
        .select("#full")
        .fields({ context: true, node: true, ref: true }, (value) => {
          resolve(value as Record<string, unknown>);
        })
        .exec();
    });

    expect(fields).toStrictEqual({ context, node, properties: { a: 1 }, ref });

    const properties = await new Promise<Record<string, unknown>>((resolve) => {
      const query = wx.createSelectorQuery();

      query
        .select("#full")
        .fields({ properties: true }, (value) => {
          resolve(value as Record<string, unknown>);
        })
        .exec();
    });

    expect(properties).toStrictEqual({ properties: { a: 1 } });

    const fallbacks = await new Promise<unknown[]>((resolve) => {
      const query = wx.createSelectorQuery();

      query
        .select("#full")
        .node((value) => {
          expect(value).toBe(node);
        })
        .select("#full")
        .context((value) => {
          expect(value).toBe(context);
        })
        .select("#full")
        .ref((value) => {
          expect(value).toBe(ref);
        })
        .exec(resolve);
    });

    expect(fallbacks).toStrictEqual([node, context, ref]);

    mockWx.node("#empty", { id: "empty" });

    const empty = await new Promise<unknown[]>((resolve) => {
      const query = wx.createSelectorQuery();

      query.select("#empty").node().select("#empty").context().select("#empty").ref().exec(resolve);
    });

    expect(empty).toStrictEqual([null, null, null]);

    const emptyFields = await new Promise<Record<string, unknown>>((resolve) => {
      const query = wx.createSelectorQuery();

      query
        .select("#empty")
        .fields({ context: true, node: true, ref: true }, (value) => {
          resolve(value as Record<string, unknown>);
        })
        .exec();
    });

    expect(emptyFields).toStrictEqual({ context: null, node: null, ref: null });
  });

  it("should return null for a selection without a terminal method", async () => {
    mockWx.node("#plain", { id: "plain" });

    const result = await new Promise<unknown>((resolve) => {
      wx.createSelectorQuery()
        .select("#plain")
        .exec((values) => {
          resolve(values[0]);
        });
    });

    expect(result).toBeNull();
  });

  it("should ignore a terminal method without a current selection", async () => {
    const terminal = vi.fn<(value: unknown) => void>();
    const result = await new Promise<unknown[]>((resolve) => {
      wx.createSelectorQuery().boundingClientRect(terminal).exec(resolve);
    });

    expect(result).toStrictEqual([]);
    expect(terminal).not.toHaveBeenCalled();

    expect(() => {
      wx.createSelectorQuery().fields(undefined).exec();
    }).not.toThrow();
  });

  it("should support fields() without a spec and exec() without callbacks", async () => {
    mockWx.node("#plain", { id: "plain" });

    const result = await new Promise<unknown>((resolve) => {
      const query = wx.createSelectorQuery();

      query
        .select("#plain")
        .fields(undefined)
        .exec((values) => {
          resolve(values[0]);
        });
    });

    expect(result).toStrictEqual({});

    expect(() => {
      wx.createSelectorQuery().select("#plain").boundingClientRect().exec();
    }).not.toThrow();
  });

  it("should support every intersection observer mode", async () => {
    const callback = vi.fn<(result: unknown) => void>();
    const observer = wx.createIntersectionObserver();

    observer.relativeTo();
    observer.relativeTo("#list");
    observer.relativeToViewport();
    observer.observe("#item", callback);

    mockWx.intersection("#item", { intersectionRatio: 0.5 });
    await tick();

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ intersectionRatio: 0.5 }));
    expect(observer.takeRecords()).toHaveLength(1);
    expect(observer.takeRecords()).toStrictEqual([]);

    observer.disconnect();
    observer.disconnect();

    expect(() => {
      disconnectObserver(999);
      takeObserverRecords(999);
    }).not.toThrow();
    expect(createIntersectionResult()).toMatchObject({ intersectionRatio: 0 });

    mockWx.node("#plain", null);
  });

  it("should snapshot and restore observers through a scope", async () => {
    const callback = vi.fn<(result: unknown) => void>();
    const observer = wx.createIntersectionObserver();

    observer.relativeTo("#list");
    observer.observe("#item", callback);

    const scope = mockWx.scope();

    observer.disconnect();
    scope.restore();

    mockWx.intersection("#item", { intersectionRatio: 1 });
    await tick();

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

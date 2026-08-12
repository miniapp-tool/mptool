/* oxlint-disable typescript/no-dynamic-delete -- test cleanup of the global hook via dynamic key */
import "@mptool/mock";
import { createFunction } from "@mptool/run";
import { describe, expect, it } from "vitest";

import { $Config } from "../src/config/index.js";
import { HOT_RELOAD_FUNCTION_KEY } from "../src/hotReload.js";
import { $Page } from "../src/page/index.js";

describe("page hot reload", () => {
  /**
   * 模拟 wx.request 立即返回指定代码
   *
   * @param code 返回的响应体代码
   * @param statusCode 响应状态码，默认 200
   */
  const mockRequest = (code: string, statusCode = 200): void => {
    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (option: {
      success?: (result: {
        statusCode: number;
        data: unknown;
        header: Record<string, string>;
        cookies: string[];
      }) => void;
    }): void => {
      option.success?.({
        statusCode,
        data: code,
        header: {},
        cookies: [],
      });
    };
  };

  /**
   * 捕获 wx.request 的 success 回调，返回手动触发回调的闭包（用于模拟异步拉取完成）
   *
   * @returns 返回触发 success 回调的闭包
   */
  const captureRequest = (): ((code: string, statusCode?: number) => void) => {
    let onSuccess: ((result: { statusCode: number; data: unknown }) => void) | undefined;

    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (option: {
      success?: (result: { statusCode: number; data: unknown }) => void;
    }): void => {
      onSuccess = option.success;
    };

    return (code: string, statusCode = 200): void => {
      onSuccess?.({ statusCode, data: code });
    };
  };

  /**
   * 捕获 $Page 注册的页面选项
   *
   * @returns 返回读取注册页面选项的闭包
   */
  const capturePageOptions = (): (() => {
    onLoad?: (...args: unknown[]) => void;
    onReady?: (...args: unknown[]) => void;
  }) => {
    let pageOptions: {
      onLoad?: (...args: unknown[]) => void;
      onReady?: (...args: unknown[]) => void;
    } = {};

    (globalThis as unknown as { Page: unknown }).Page = (options: {
      onLoad?: (...args: unknown[]) => void;
      onReady?: (...args: unknown[]) => void;
    }): void => {
      pageOptions = options;
    };

    return () => pageOptions;
  };

  it("should fetch and apply hot reload methods to the page instance", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    mockRequest("return { hotMethod() { return this.data.n + 1; } };");
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: { n: 41 } };

    try {
      $Page("hotIndex", {});

      // 拉取在注册时同步完成（mock 同步回调），onLoad 时应用到实例
      getOptions().onLoad?.call(instance);

      expect((instance as unknown as { hotMethod: () => number }).hotMethod()).toBe(42);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should apply the returned method object directly", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    mockRequest("return { extra() { return this.data.v; } };");
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: { v: 7 } };

    try {
      $Page("hotDirect", {});

      getOptions().onLoad?.call(instance);

      expect((instance as unknown as { extra: () => number }).extra()).toBe(7);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should not fetch when createFunction is not mounted", () => {
    const spy = {
      calls: 0,
    };

    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (): void => {
      spy.calls += 1;
    };
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    $Page("hotNone", {});

    expect(spy.calls).toBe(0);
  });

  it("should not fetch when hotReloadPattern is not configured", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const spy = {
      calls: 0,
    };

    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (): void => {
      spy.calls += 1;
    };
    $Config({ defaultPage: "/pages/$name" });

    try {
      $Page("hotNoPattern", {});

      expect(spy.calls).toBe(0);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should silently ignore invalid hot reload payloads", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    mockRequest("return 42;");
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: { n: 1 } };

    try {
      $Page("hotInvalid", {});

      // 非法载荷不抛错，onLoad 正常执行
      expect(() => getOptions().onLoad?.call(instance)).not.toThrow();
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should ignore non-200 responses even when success fires", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    mockRequest("return { bad() { return 1; } };", 404);
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotNotFound", {});

      // 非 200 时 success 仍会触发，但不应应用热更新
      getOptions().onLoad?.call(instance);

      expect((instance as { bad?: () => number }).bad).toBeUndefined();
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should ignore empty responses and retry on the next registration", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const spy = { calls: 0 };

    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (option: {
      success?: (result: { statusCode: number; data: unknown }) => void;
    }): void => {
      spy.calls += 1;
      option.success?.({ statusCode: 200, data: "" });
    };
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    try {
      $Page("hotEmpty", {});
      $Page("hotEmpty", {});

      // 200 空响应体（文件不存在）被忽略且不写入缓存，再次注册同一页面会重新拉取
      expect(spy.calls).toBe(2);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should defer onHotReload to onReady when applied during onLoad", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    mockRequest("return { onHotReload() { this.data.applied = true; } };");
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotHookDeferred", {});

      // onLoad 应用热更新：此时尚未 ready，钩子应延迟到 onReady 时触发
      getOptions().onLoad?.call(instance);

      expect((instance.data as { applied?: boolean }).applied).toBeUndefined();

      // onReady 时自动触发钩子（以页面实例作为 this）
      getOptions().onReady?.call(instance);

      expect((instance.data as { applied?: boolean }).applied).toBe(true);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should trigger onHotReload immediately when hot reload resolves after onReady", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const resolveRequest = captureRequest();
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotHookLate", {});

      // 拉取尚未完成：onLoad 仅登记实例；页面随后完成 onReady
      getOptions().onLoad?.call(instance);
      getOptions().onReady?.call(instance);

      // 拉取在 onReady 之后完成：页面已 ready，应立即触发 onHotReload
      resolveRequest("return { onHotReload() { this.data.applied = true; } };");

      expect((instance.data as { applied?: boolean }).applied).toBe(true);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should defer onHotReload to onReady when hot reload resolves after onLoad", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const resolveRequest = captureRequest();
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotHookBetween", {});

      // 拉取在 onLoad 之后、onReady 之前完成：方法已应用，但钩子应挂起到 onReady
      getOptions().onLoad?.call(instance);
      resolveRequest("return { onHotReload() { this.data.applied = true; } };");

      expect((instance.data as { applied?: boolean }).applied).toBeUndefined();

      // onReady 时自动触发钩子
      getOptions().onReady?.call(instance);

      expect((instance.data as { applied?: boolean }).applied).toBe(true);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should not break the page lifecycle when onHotReload throws", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    mockRequest('return { onHotReload() { throw new Error("boom"); } } };');
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };
    let userOnReadyCalled = false;

    try {
      $Page("hotHookThrows", {
        onReady(): void {
          userOnReadyCalled = true;
        },
      });

      getOptions().onLoad?.call(instance);

      // onHotReload 抛异常不应阻断用户 onReady
      expect(() => getOptions().onReady?.call(instance)).not.toThrow();
      expect(userOnReadyCalled).toBe(true);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });
});

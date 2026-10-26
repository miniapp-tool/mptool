/* oxlint-disable typescript/no-dynamic-delete -- test cleanup of the global hook via dynamic key */
import "@mptool/mock";
import { createFunction } from "@mptool/run";
import { afterEach, describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import {
  HOT_RELOAD_FUNCTION_KEY,
  clearHotReloadCache,
  getPendingHotReloadCount,
} from "../src/hotReload.js";
import { $Page } from "../src/page/index.js";

describe("page hot reload", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset hot-reload cache and timers between cases
  afterEach(() => {
    // 清理缓存、定时器与全局钩子，避免用例之间的状态泄漏（shuffle-safe）
    clearHotReloadCache();
    vi.useRealTimers();
    delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
  });

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
   * 捕获 wx.request 的 success / fail 回调，用于手工制造各种终态
   *
   * @returns 触发 success / fail 的闭包
   */
  const captureRequestHandlers = (): {
    success: (code: string, statusCode?: number) => void;
    fail: (errMsg: string) => void;
  } => {
    let onFail: ((result: { errMsg: string }) => void) | undefined,
      onSuccess: ((result: { statusCode: number; data: unknown }) => void) | undefined;

    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (option: {
      success?: (result: { statusCode: number; data: unknown }) => void;
      fail?: (result: { errMsg: string }) => void;
    }): void => {
      onSuccess = option.success;
      onFail = option.fail;
    };

    return {
      success: (code: string, statusCode = 200): void => {
        onSuccess?.({ statusCode, data: code });
      },
      fail: (errMsg: string): void => {
        onFail?.({ errMsg });
      },
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
    onUnload?: (...args: unknown[]) => void;
  }) => {
    let pageOptions: {
      onLoad?: (...args: unknown[]) => void;
      onReady?: (...args: unknown[]) => void;
      onUnload?: (...args: unknown[]) => void;
    } = {};

    (globalThis as unknown as { Page: unknown }).Page = (options: {
      onLoad?: (...args: unknown[]) => void;
      onReady?: (...args: unknown[]) => void;
      onUnload?: (...args: unknown[]) => void;
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

  it("should bound the execution options of remote code", () => {
    const received: unknown[] = [];

    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = (
      args: string[],
      body: string,
      options?: {
        global?: boolean;
        maxSteps?: number;
        maxStack?: number;
        maxSourceLength?: number;
      },
    ): ((...callArgs: unknown[]) => unknown) => {
      received.push(options);

      return createFunction(args, body, options);
    };
    mockRequest("return { bounded() { return 1; } };");
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = {};

    try {
      $Page("hotBounded", {});
      getOptions().onLoad?.call(instance);

      expect(received[0]).toStrictEqual({
        global: true,
        maxSteps: 200_000,
        maxStack: 128,
        maxSourceLength: 512 * 1024,
      });
      expect((instance as unknown as { bounded: () => number }).bounded()).toBe(1);
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

  it("should not keep page instances waiting when createFunction is not mounted", () => {
    delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    $Page("hotReloadNoFunction", {});

    getOptions().onLoad?.call(instance);

    // createFunction 未挂载：代码永远无法执行，实例不应被登记 (否则永久泄漏)
    expect(getPendingHotReloadCount()).toBe(0);
  });

  it("should release waiting instances when the response body is empty", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const handlers = captureRequestHandlers();

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotReloadPendingEmpty", {});

      getOptions().onLoad?.call(instance);
      expect(getPendingHotReloadCount()).toBe(1);

      // nginx 对不存在的文件返回 200 空响应体：确定没有热更新，释放实例
      handlers.success("", 200);
      expect(getPendingHotReloadCount()).toBe(0);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should release waiting instances on non-200 responses", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const handlers = captureRequestHandlers();

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotReloadPending404", {});

      getOptions().onLoad?.call(instance);
      expect(getPendingHotReloadCount()).toBe(1);

      handlers.success("return {};", 404);
      expect(getPendingHotReloadCount()).toBe(0);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should release waiting instances when the payload is not an object", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const handlers = captureRequestHandlers();

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotReloadPendingInvalid", {});

      getOptions().onLoad?.call(instance);
      expect(getPendingHotReloadCount()).toBe(1);

      handlers.success("return 42;", 200);
      expect(getPendingHotReloadCount()).toBe(0);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should release waiting instances when the code fails to execute", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const handlers = captureRequestHandlers();

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotReloadPendingThrow", {});

      getOptions().onLoad?.call(instance);
      expect(getPendingHotReloadCount()).toBe(1);

      handlers.success("return {", 200);
      expect(getPendingHotReloadCount()).toBe(0);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should release waiting instances when the request fails", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const handlers = captureRequestHandlers();

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotReloadPendingFail", {});

      getOptions().onLoad?.call(instance);
      expect(getPendingHotReloadCount()).toBe(1);

      handlers.fail("request:fail timeout");
      expect(getPendingHotReloadCount()).toBe(0);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should clear the pending instance after a successful fetch", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const handlers = captureRequestHandlers();

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotReloadPendingSuccess", {});

      getOptions().onLoad?.call(instance);
      expect(getPendingHotReloadCount()).toBe(1);

      handlers.success("return { method() { return 1; } };");
      expect(getPendingHotReloadCount()).toBe(0);
      expect((instance as { method?: () => number }).method?.()).toBe(1);
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should drop waiting instances when the page unloads", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const handlers = captureRequestHandlers();

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotReloadUnload", {});

      getOptions().onLoad?.call(instance);
      expect(getPendingHotReloadCount()).toBe(1);

      // 页面在拉取完成前卸载：实例不得继续等待，否则晚到的方法会补挂到已关闭页面
      getOptions().onUnload?.call(instance);
      expect(getPendingHotReloadCount()).toBe(0);

      handlers.success("return { onHotReload() { this.data.applied = true; } };");

      expect((instance.data as { applied?: boolean }).applied).toBeUndefined();
      expect((instance as { onHotReload?: unknown }).onHotReload).toBeUndefined();
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should not fire a deferred onHotReload after the page unloads", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    const resolveRequest = captureRequest();

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    try {
      $Page("hotReloadUnloadReady", {});

      // 拉取在 onLoad 之后、onReady 之前完成：方法已应用，钩子挂起到 onReady
      getOptions().onLoad?.call(instance);
      resolveRequest("return { onHotReload() { this.data.applied = true; } };");

      getOptions().onUnload?.call(instance);

      // 即便随后再触发 onReady，也不得执行已卸载页面的钩子
      getOptions().onReady?.call(instance);

      expect((instance.data as { applied?: boolean }).applied).toBeUndefined();
    } finally {
      delete (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY];
    }
  });

  it("should dedupe concurrent fetches for the same page", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    let requestCount = 0;

    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (): void => {
      requestCount += 1;
    };

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    capturePageOptions();

    $Page("hotReloadInflight", {});

    // 拉取未返回时再次注册同一页面：不应重复发请求
    $Page("hotReloadInflight", {});

    expect(requestCount).toBe(1);
  });

  it("should release pending instances and allow a retry when the fetch times out", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    let requestCount = 0;

    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (): void => {
      requestCount += 1;
    };

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
      hotReloadTimeout: 50,
    });

    const getOptions = capturePageOptions();
    const instance = { data: {} };

    vi.useFakeTimers();

    $Page("hotReloadTimeout", {});

    getOptions().onLoad?.call(instance);
    expect(getPendingHotReloadCount()).toBe(1);

    // 超时：等待中的实例被释放，晚到的响应不会再补挂
    vi.advanceTimersByTime(50);
    expect(getPendingHotReloadCount()).toBe(0);

    // 超时后允许重新注册并重新拉取
    $Page("hotReloadTimeout", {});
    expect(requestCount).toBe(2);
  });

  it("should refetch after clearHotReloadCache", () => {
    (globalThis as Record<PropertyKey, unknown>)[HOT_RELOAD_FUNCTION_KEY] = createFunction;
    let requestCount = 0;

    (globalThis as unknown as { wx: Record<string, unknown> }).wx.request = (option: {
      success?: (result: { statusCode: number; data: string }) => void;
    }): void => {
      requestCount += 1;
      option.success?.({ statusCode: 200, data: "return { method() { return 1; } };" });
    };

    $Config({
      defaultPage: "/pages/$name",
      hotReloadPattern: "https://example.com/hotReloadCode/$name",
    });

    capturePageOptions();

    $Page("hotReloadClear", {});
    expect(requestCount).toBe(1);

    // OTA 场景：清掉缓存后重新注册会再次拉取
    clearHotReloadCache("hotReloadClear");

    $Page("hotReloadClear", {});
    expect(requestCount).toBe(2);
  });
});

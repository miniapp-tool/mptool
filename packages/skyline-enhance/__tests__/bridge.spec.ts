import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { $Page } from "../src/page/index.js";

describe("$ (bind)", () => {
  const capturePageOptions = (): (() => { $?: (event: unknown) => void } | undefined) => {
    let pageOptions: { $?: (event: unknown) => void } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    return () => pageOptions;
  };

  it("should not call a truthy non-function property", () => {
    $Config({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    $Page("index", {});

    const instance = { data: { n: 1 }, $state: {}, $refs: new Map() };

    // 事件名命中 data / $state / $refs 等真值非函数属性时不得调用，否则 method.apply 会抛 TypeError
    expect(() =>
      getOptions()?.$?.call(instance, {
        detail: { id: 1, event: "data", args: [] },
      }),
    ).not.toThrow();
  });

  it("should dispatch a method bound to the instance", () => {
    $Config({ defaultPage: "/pages/$name" });

    const getOptions = capturePageOptions();

    $Page("index", {});

    const contexts: unknown[] = [];
    const instance = {
      customMethod(this: unknown, a: number, b: number): void {
        contexts.push(this);
        expect([a, b]).toStrictEqual([1, 2]);
      },
    };

    getOptions()?.$?.call(instance, {
      detail: { id: 1, event: "customMethod", args: [1, 2] },
    });

    expect(contexts[0]).toBe(instance);
  });
});

describe("$back", () => {
  it("should clamp delta to the actual page stack when no home is configured", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateBack = vi.fn<() => void>();

    (wx as any).navigateBack = navigateBack;
    (globalThis as any).getCurrentPages = (): unknown[] => [{}, {}, {}];

    let pageOptions: { $back?: (delta?: number) => Promise<unknown> } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    await pageOptions?.$back?.(3);

    expect(navigateBack).toHaveBeenCalledWith({ delta: 2 });
  });

  it("should reLaunch home when page stack is insufficient", async () => {
    $Config({ defaultPage: "/pages/$name", home: "main" });

    const reLaunch = vi.fn<() => void>();

    (wx as any).reLaunch = reLaunch;
    (globalThis as any).getCurrentPages = (): unknown[] => [{}];

    let pageOptions: { $back?: (delta?: number) => Promise<unknown> } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    await pageOptions?.$back?.();

    expect(reLaunch).toHaveBeenCalledWith({ url: "/pages/main" });
  });

  it("should not call navigateBack when already at the first page without home", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateBack = vi.fn<() => void>();

    (wx as any).navigateBack = navigateBack;
    (globalThis as any).getCurrentPages = (): unknown[] => [{}];

    let pageOptions: { $back?: (delta?: number) => Promise<unknown> } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    await pageOptions?.$back?.();

    expect(navigateBack).not.toHaveBeenCalled();
  });
});

describe("$bindGo", () => {
  it("should call before and after hooks around navigation", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => Promise<{ errMsg: string }>>().mockResolvedValue({
      errMsg: "navigateTo:ok",
    });

    (wx as any).navigateTo = navigateTo;

    let pageOptions:
      | {
          $bindGo?: (event: unknown) => Promise<void>;
          beforeNavigate?: ReturnType<typeof vi.fn>;
          afterNavigate?: ReturnType<typeof vi.fn>;
        }
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    const beforeNavigate = vi.fn<() => void>();
    const afterNavigate = vi.fn<() => void>();

    $Page("index", { beforeNavigate, afterNavigate } as never);

    const event = {
      currentTarget: {
        dataset: {
          before: "beforeNavigate",
          after: "afterNavigate",
          url: "play?cid=123",
        },
      },
    };

    await pageOptions?.$bindGo?.(event);

    expect(beforeNavigate).toHaveBeenCalledWith(event);
    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/play?cid=123" });
    expect(afterNavigate).toHaveBeenCalledWith(event);
  });

  it("should log a failed navigation instead of rejecting", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const error = new Error("navigate fail");
    const navigateTo = vi.fn<() => Promise<{ errMsg: string }>>().mockRejectedValue(error);

    (wx as any).navigateTo = navigateTo;

    let pageOptions:
      | { $bindGo?: (event: unknown) => Promise<void>; afterNavigate?: ReturnType<typeof vi.fn> }
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    const afterNavigate = vi.fn<() => void>();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      $Page("index", { afterNavigate } as never);

      const event = {
        currentTarget: {
          dataset: {
            after: "afterNavigate",
            url: "play",
          },
        },
      };

      // 失败被吞掉（不产生 unhandled rejection），after 不执行
      await expect(pageOptions?.$bindGo?.(event)).resolves.toBeUndefined();

      expect(afterNavigate).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith('Navigation to "play" failed', error);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("should not navigate when url is missing", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    (wx as any).navigateTo = navigateTo;

    let pageOptions:
      | { $bindGo?: (event: unknown) => Promise<void>; beforeNavigate?: ReturnType<typeof vi.fn> }
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    const beforeNavigate = vi.fn<() => void>();

    $Page("index", { beforeNavigate } as never);

    const event = {
      currentTarget: {
        dataset: {
          before: "beforeNavigate",
        },
      },
    };

    await pageOptions?.$bindGo?.(event);

    expect(beforeNavigate).toHaveBeenCalledWith(event);
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("should ignore a missing event", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => void>();

    (wx as any).navigateTo = navigateTo;

    let pageOptions: { $bindGo?: (event: unknown) => Promise<void> } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    // 事件对象缺失（如手动调用）时应直接返回，不触发任何导航
    await expect(pageOptions?.$bindGo?.(undefined)).resolves.toBeUndefined();

    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("should skip after when the navigation resolves to undefined", async () => {
    $Config({ defaultPage: "/pages/$name" });

    // 宿主未真正跳转时 wx.* 可能解析为 undefined，此时不应执行 after
    const navigateTo = vi.fn<() => Promise<undefined>>().mockResolvedValue(undefined);

    (wx as any).navigateTo = navigateTo;

    let pageOptions:
      | { $bindGo?: (event: unknown) => Promise<void>; afterNavigate?: ReturnType<typeof vi.fn> }
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    const afterNavigate = vi.fn<() => void>();

    $Page("index", { afterNavigate } as never);

    const event = {
      currentTarget: {
        dataset: {
          after: "afterNavigate",
          url: "play",
        },
      },
    };

    await pageOptions?.$bindGo?.(event);

    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/play" });
    expect(afterNavigate).not.toHaveBeenCalled();
  });

  it("should navigate without running an after hook", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateTo = vi.fn<() => Promise<{ errMsg: string }>>().mockResolvedValue({
      errMsg: "navigateTo:ok",
    });

    (wx as any).navigateTo = navigateTo;

    let pageOptions: { $bindGo?: (event: unknown) => Promise<void> } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    const event = {
      currentTarget: {
        dataset: {
          url: "play",
        },
      },
    };

    await pageOptions?.$bindGo?.(event);

    expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/play" });
  });
});

describe("$bindBack", () => {
  it("should ignore a missing event", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateBack = vi.fn<() => void>();

    (wx as any).navigateBack = navigateBack;

    let pageOptions: { $bindBack?: (event: unknown) => Promise<void> } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    await expect(pageOptions?.$bindBack?.(undefined)).resolves.toBeUndefined();

    expect(navigateBack).not.toHaveBeenCalled();
  });

  it("should run before / after hooks around navigateBack with a custom delta", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateBack = vi.fn<() => Promise<{ errMsg: string }>>().mockResolvedValue({
      errMsg: "navigateBack:ok",
    });

    (wx as any).navigateBack = navigateBack;
    (globalThis as any).getCurrentPages = (): unknown[] => [{}, {}, {}];

    let pageOptions:
      | {
          $bindBack?: (event: unknown) => Promise<void>;
          beforeBack?: ReturnType<typeof vi.fn>;
          afterBack?: ReturnType<typeof vi.fn>;
        }
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    const beforeBack = vi.fn<() => void>();
    const afterBack = vi.fn<() => void>();

    $Page("index", { beforeBack, afterBack } as never);

    const event = {
      currentTarget: {
        dataset: {
          before: "beforeBack",
          after: "afterBack",
          // dataset values are always strings in the mini-program runtime
          delta: "2",
        },
      },
    };

    await pageOptions?.$bindBack?.(event);

    expect(beforeBack).toHaveBeenCalledWith(event);
    expect(navigateBack).toHaveBeenCalledWith({ delta: 2 });
    expect(afterBack).toHaveBeenCalledWith(event);
  });

  it("should default to a delta of 1", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateBack = vi.fn<() => Promise<{ errMsg: string }>>().mockResolvedValue({
      errMsg: "navigateBack:ok",
    });

    (wx as any).navigateBack = navigateBack;
    (globalThis as any).getCurrentPages = (): unknown[] => [{}, {}, {}];

    let pageOptions: { $bindBack?: (event: unknown) => Promise<void> } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    await pageOptions?.$bindBack?.({ currentTarget: { dataset: {} } });

    expect(navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it("should fall back to home when the page stack is too short", async () => {
    $Config({ defaultPage: "/pages/$name", home: "main" });

    const reLaunch = vi.fn<() => Promise<{ errMsg: string }>>().mockResolvedValue({
      errMsg: "reLaunch:ok",
    });

    (wx as any).reLaunch = reLaunch;
    (globalThis as any).getCurrentPages = (): unknown[] => [{}];

    let pageOptions:
      | { $bindBack?: (event: unknown) => Promise<void>; afterBack?: ReturnType<typeof vi.fn> }
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    const afterBack = vi.fn<() => void>();

    $Page("index", { afterBack } as never);

    await pageOptions?.$bindBack?.({ currentTarget: { dataset: { after: "afterBack" } } });

    expect(reLaunch).toHaveBeenCalledWith({ url: "/pages/main" });
    expect(afterBack).toHaveBeenCalledTimes(1);
  });

  it("should resolve without navigateBack when already at the first page without home", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const navigateBack = vi.fn<() => void>();

    (wx as any).navigateBack = navigateBack;
    (globalThis as any).getCurrentPages = (): unknown[] => [{}];

    let pageOptions:
      | { $bindBack?: (event: unknown) => Promise<void>; afterBack?: ReturnType<typeof vi.fn> }
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    const afterBack = vi.fn<() => void>();

    $Page("index", { afterBack } as never);

    await expect(
      pageOptions?.$bindBack?.({ currentTarget: { dataset: { after: "afterBack" } } }),
    ).resolves.toBeUndefined();

    expect(navigateBack).not.toHaveBeenCalled();
    expect(afterBack).toHaveBeenCalledTimes(1);
  });

  it("should log a failed navigateBack instead of rejecting", async () => {
    $Config({ defaultPage: "/pages/$name" });

    const error = new Error("navigateBack:fail");
    const navigateBack = vi.fn<() => Promise<never>>().mockRejectedValue(error);

    (wx as any).navigateBack = navigateBack;
    (globalThis as any).getCurrentPages = (): unknown[] => [{}, {}, {}];

    let pageOptions:
      | { $bindBack?: (event: unknown) => Promise<void>; afterBack?: ReturnType<typeof vi.fn> }
      | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    const afterBack = vi.fn<() => void>();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      $Page("index", { afterBack } as never);

      // 失败被吞掉（不产生 unhandled rejection），after 不执行
      await expect(
        pageOptions?.$bindBack?.({ currentTarget: { dataset: { after: "afterBack" } } }),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith("Navigation back failed", error);
      expect(afterBack).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("$getPath", () => {
  const capturePageOptions = (): (() => { $getPath?: (name: string) => string } | undefined) => {
    let pageOptions: { $getPath?: (name: string) => string } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    return () => pageOptions;
  };

  it("should add a leading slash for a relative defaultPage", () => {
    $Config({ defaultPage: "pages/$name" });

    const getOptions = capturePageOptions();

    $Page("index", {});

    expect(getOptions()?.$getPath?.("main")).toBe("/pages/main");
  });

  it("should add a leading slash for a relative pages map", () => {
    $Config({ defaultPage: "/pages/$name", pages: { main: "pages/main" } });

    const getOptions = capturePageOptions();

    $Page("index", {});

    expect(getOptions()?.$getPath?.("main")).toBe("/pages/main");
  });
});

describe("$currentPage", () => {
  it("should return the top page", () => {
    $Config({ defaultPage: "/pages/$name" });

    (globalThis as any).getCurrentPages = (): unknown[] => [{ name: "a" }, { name: "b" }];

    let pageOptions: { $currentPage?: () => unknown } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    expect(pageOptions?.$currentPage?.()).toStrictEqual({ name: "b" });
  });

  it("should return undefined when the page stack is empty", () => {
    $Config({ defaultPage: "/pages/$name" });

    (globalThis as any).getCurrentPages = (): unknown[] => [];

    let pageOptions: { $currentPage?: () => unknown } | undefined;

    (globalThis as any).Page = (options: any): void => {
      pageOptions = options;
    };

    $Page("index", {});

    expect(pageOptions?.$currentPage?.()).toBeUndefined();
  });
});

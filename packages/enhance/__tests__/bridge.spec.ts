import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { ON_PAGE_PRELOAD, ON_PAGE_READY, ON_PAGE_UNLOAD } from "../src/constant.js";
import { appEmitter, routeEmitter } from "../src/emitter/index.js";
import { $Page } from "../src/page/index.js";

describe("bridge", () => {
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

  describe("$back", () => {
    it("should clamp delta to the actual page stack when no home is configured", async () => {
      await setup({ defaultPage: "/pages/$name" });

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
      await setup({ defaultPage: "/pages/$name", home: "main" });

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
      await setup({ defaultPage: "/pages/$name" });

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
      await setup({ defaultPage: "/pages/$name" });

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

    it("should skip after when the navigation is locked", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const navigateTo = vi.fn<() => Promise<{ errMsg: string }>>().mockResolvedValue({
        errMsg: "navigateTo:ok",
      });

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

      // 第一次跳转成功：after 执行
      await pageOptions?.$bindGo?.(event);

      expect(navigateTo).toHaveBeenCalledTimes(1);
      expect(afterNavigate).toHaveBeenCalledTimes(1);

      // 导航锁未释放：锁定期间的跳转解析为 undefined，after 不应执行
      await pageOptions?.$bindGo?.(event);

      expect(navigateTo).toHaveBeenCalledTimes(1);
      expect(afterNavigate).toHaveBeenCalledTimes(1);

      // 清理导航锁，避免影响其它用例
      appEmitter.emit(ON_PAGE_UNLOAD);
    });

    it("should log a failed navigation instead of rejecting", async () => {
      await setup({ defaultPage: "/pages/$name" });

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

    it("should ignore a missing touch event", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const navigateTo = vi.fn<() => void>();

      (wx as any).navigateTo = navigateTo;

      let pageOptions: { $bindGo?: (event?: unknown) => Promise<void> } | undefined;

      (globalThis as any).Page = (options: any): void => {
        pageOptions = options;
      };

      $Page("index", {});

      await expect(pageOptions?.$bindGo?.()).resolves.toBeUndefined();

      expect(navigateTo).not.toHaveBeenCalled();
    });

    it("should not run an after hook that is missing", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const navigateTo = vi.fn<() => Promise<{ errMsg: string }>>().mockResolvedValue({
        errMsg: "navigateTo:ok",
      });

      (wx as any).navigateTo = navigateTo;

      let pageOptions: { $bindGo?: (event: unknown) => Promise<void> } | undefined;

      (globalThis as any).Page = (options: any): void => {
        pageOptions = options;
      };

      $Page("index", {});

      await expect(
        pageOptions?.$bindGo?.({ currentTarget: { dataset: { url: "play" } } }),
      ).resolves.toBeUndefined();

      expect(navigateTo).toHaveBeenCalledWith({ url: "/pages/play" });
    });

    it("should not navigate when url is missing", async () => {
      await setup({ defaultPage: "/pages/$name" });

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
  });

  describe("$bindBack", () => {
    interface BackPageOptions {
      $back?: (delta?: number) => Promise<unknown>;
      $bindBack?: (event?: unknown) => Promise<void>;
      $bindGo?: (event: unknown) => Promise<void>;
      afterBack?: ReturnType<typeof vi.fn>;
      beforeBack?: ReturnType<typeof vi.fn>;
    }

    const capturePageOptions = (): (() => BackPageOptions | undefined) => {
      let pageOptions: BackPageOptions | undefined;

      (globalThis as any).Page = (options: any): void => {
        pageOptions = options;
      };

      return () => pageOptions;
    };

    it("should call before and after hooks around navigateBack", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const navigateBack = vi
        .fn<() => Promise<{ errMsg: string }>>()
        .mockResolvedValue({ errMsg: "navigateBack:ok" });

      (wx as any).navigateBack = navigateBack;
      (globalThis as any).getCurrentPages = (): unknown[] => [{}, {}, {}];

      const beforeBack = vi.fn<(event: unknown) => void>();
      const afterBack = vi.fn<(event: unknown) => void>();

      const getOptions = capturePageOptions();

      $Page("index", { afterBack, beforeBack } as never);

      const event = {
        currentTarget: {
          dataset: {
            after: "afterBack",
            before: "beforeBack",
            delta: "2",
          },
        },
      };

      await getOptions()?.$bindBack?.(event);

      expect(beforeBack).toHaveBeenCalledWith(event);
      expect(navigateBack).toHaveBeenCalledWith({ delta: 2 });
      expect(afterBack).toHaveBeenCalledWith(event);
    });

    it("should default delta to 1", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const navigateBack = vi
        .fn<() => Promise<{ errMsg: string }>>()
        .mockResolvedValue({ errMsg: "navigateBack:ok" });

      (wx as any).navigateBack = navigateBack;
      (globalThis as any).getCurrentPages = (): unknown[] => [{}, {}, {}];

      const getOptions = capturePageOptions();

      $Page("index", {});

      await getOptions()?.$bindBack?.({ currentTarget: { dataset: {} } });

      expect(navigateBack).toHaveBeenCalledWith({ delta: 1 });
    });

    it("should ignore a missing touch event", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const navigateBack = vi.fn<() => void>();

      (wx as any).navigateBack = navigateBack;

      const getOptions = capturePageOptions();

      $Page("index", {});

      await expect(getOptions()?.$bindBack?.()).resolves.toBeUndefined();

      expect(navigateBack).not.toHaveBeenCalled();
    });

    it("should ignore a before hook that is not a method", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const navigateBack = vi
        .fn<() => Promise<{ errMsg: string }>>()
        .mockResolvedValue({ errMsg: "navigateBack:ok" });

      (wx as any).navigateBack = navigateBack;
      (globalThis as any).getCurrentPages = (): unknown[] => [{}, {}];

      const getOptions = capturePageOptions();

      $Page("index", {});

      await expect(
        getOptions()?.$bindBack?.({ currentTarget: { dataset: { before: "missing" } } }),
      ).resolves.toBeUndefined();

      expect(navigateBack).toHaveBeenCalledWith({ delta: 1 });
    });

    it("should log a failed back instead of rejecting", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const error = new Error("page stack error");
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (globalThis as any).getCurrentPages = (): unknown[] => {
        throw error;
      };

      const afterBack = vi.fn<() => void>();

      try {
        const getOptions = capturePageOptions();

        $Page("index", { afterBack } as never);

        await expect(
          getOptions()?.$bindBack?.({ currentTarget: { dataset: { after: "afterBack" } } }),
        ).resolves.toBeUndefined();

        expect(afterBack).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith("Navigation back failed", error);
      } finally {
        errorSpy.mockRestore();
      }
    });

    it("should skip after when the home reLaunch is blocked by the navigation lock", async () => {
      await setup({ defaultPage: "/pages/$name", home: "main" });

      (globalThis as any).getCurrentPages = (): unknown[] => [{}];

      const reLaunch = vi
        .fn<() => Promise<{ errMsg: string }>>()
        .mockResolvedValue({ errMsg: "reLaunch:ok" });
      const navigateTo = vi
        .fn<() => Promise<{ errMsg: string }>>()
        .mockResolvedValue({ errMsg: "navigateTo:ok" });

      (wx as any).reLaunch = reLaunch;
      (wx as any).navigateTo = navigateTo;

      const afterBack = vi.fn<() => void>();
      const getOptions = capturePageOptions();

      $Page("index", { afterBack } as never);

      try {
        // 第一次跳转取得导航锁，且目标页不触发 onReady，锁保持
        await getOptions()?.$bindGo?.({ currentTarget: { dataset: { url: "play" } } });

        expect(navigateTo).toHaveBeenCalledTimes(1);

        // 栈内只有当前页且配置了 home：$back 通过 reLaunch 回主页，但被导航锁拦截
        await expect(
          getOptions()?.$bindBack?.({ currentTarget: { dataset: { after: "afterBack" } } }),
        ).resolves.toBeUndefined();

        expect(reLaunch).not.toHaveBeenCalled();
        expect(afterBack).not.toHaveBeenCalled();
      } finally {
        appEmitter.emit(ON_PAGE_UNLOAD);
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

    it("should add a leading slash for a relative defaultPage", async () => {
      await setup({ defaultPage: "pages/$name" });

      const getOptions = capturePageOptions();

      $Page("index", {});

      expect(getOptions()?.$getPath?.("main")).toBe("/pages/main");
    });

    it("should add a leading slash for a relative pages map", async () => {
      await setup({ defaultPage: "/pages/$name", pages: { main: "pages/main" } });

      const getOptions = capturePageOptions();

      $Page("index", {});

      expect(getOptions()?.$getPath?.("main")).toBe("/pages/main");
    });

    it("should keep an absolute path unchanged", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const getOptions = capturePageOptions();

      $Page("index", {});

      expect(getOptions()?.$getPath?.("main")).toBe("/pages/main");
    });
  });

  describe("$currentPage", () => {
    it("should return the top page", async () => {
      await setup({ defaultPage: "/pages/$name" });

      (globalThis as any).getCurrentPages = (): unknown[] => [{ name: "a" }, { name: "b" }];

      let pageOptions: { $currentPage?: () => unknown } | undefined;

      (globalThis as any).Page = (options: any): void => {
        pageOptions = options;
      };

      $Page("index", {});

      expect(pageOptions?.$currentPage?.()).toStrictEqual({ name: "b" });
    });

    it("should return undefined when the page stack is empty", async () => {
      await setup({ defaultPage: "/pages/$name" });

      (globalThis as any).getCurrentPages = (): unknown[] => [];

      let pageOptions: { $currentPage?: () => unknown } | undefined;

      (globalThis as any).Page = (options: any): void => {
        pageOptions = options;
      };

      $Page("index", {});

      expect(pageOptions?.$currentPage?.()).toBeUndefined();
    });
  });

  describe("$preload", () => {
    it("should emit preload route event", async () => {
      await setup({ defaultPage: "/pages/$name" });

      const handler = vi.fn<() => void>();

      routeEmitter.on(`${ON_PAGE_PRELOAD}:/pages/target`, handler);

      let pageOptions: { $preload?: (pageName: string) => void } | undefined;

      (globalThis as any).Page = (options: any): void => {
        pageOptions = options;
      };

      $Page("index", {});

      // $preload is synchronous: it dispatches the event and returns nothing
      expect(pageOptions?.$preload?.("target?a=1")).toBeUndefined();

      expect(handler).toHaveBeenCalledWith({ a: "1" });
    });
  });
});

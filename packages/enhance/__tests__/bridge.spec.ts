import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { ON_PAGE_PRELOAD, ON_PAGE_READY } from "../src/constant.js";
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

      const navigateTo = vi.fn<() => void>();

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

      pageOptions?.$preload?.("target?a=1");

      expect(handler).toHaveBeenCalledWith({ a: "1" });
    });
  });
});

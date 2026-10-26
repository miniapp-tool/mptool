import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config } from "../src/config/index.js";
import { $Page } from "../src/page/index.js";

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

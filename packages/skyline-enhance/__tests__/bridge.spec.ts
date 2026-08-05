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
});

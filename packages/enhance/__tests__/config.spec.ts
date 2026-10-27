import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { $Config, getConfig } from "../src/config/index.js";

describe("$Config()", () => {
  it("should throw an MpError when a component is registered without $Config", async () => {
    // 用全新的模块实例执行，避免依赖用例执行顺序（appConfig 是模块级单例）
    vi.resetModules();

    const [{ $Component }, { getConfig: freshGetConfig }, { MpError: FreshMpError }] =
      await Promise.all([
        import("../src/component/index.js"),
        import("../src/config/index.js"),
        import("@mptool/shared"),
      ]);

    let error: unknown;

    try {
      $Component({});
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(FreshMpError);
    expect((error as Error).name).toBe("MpError");
    expect((error as Error).message).toContain("$Config");
    expect(error).toMatchObject({ code: null });
    expect(() => freshGetConfig()).toThrow(FreshMpError);
  });

  it("should map names through a pages object", () => {
    $Config({ defaultPage: "/pages/$name/$name", pages: { main: "/pages/main/main" } });

    const { getPath } = getConfig();

    expect(getPath("main")).toBe("/pages/main/main");
  });

  it("should fall back to defaultPage for unmapped names", () => {
    $Config({ defaultPage: "/pages/$name/$name", pages: { main: "/pages/main/main" } });

    const { getPath } = getConfig();

    expect(getPath("cart")).toBe("/pages/cart/cart");
  });

  it("should expand a pages array with a single name per entry", () => {
    $Config({
      defaultPage: "/pages/$name/$name",
      pages: [
        ["main", "/home/$name"],
        ["about", "/others/about/about"],
      ],
    });

    const { getPath } = getConfig();

    expect(getPath("main")).toBe("/home/main");
    expect(getPath("about")).toBe("/others/about/about");
  });

  it("should expand a pages array entry listing several names", () => {
    $Config({
      defaultPage: "/pages/$name/$name",
      pages: [
        [["main", "cart", "user"], "/pages/$name/$name"],
        [["search", "details"], "/shop/$name/index"],
      ],
    });

    const { getPath } = getConfig();

    expect(getPath("main")).toBe("/pages/main/main");
    expect(getPath("cart")).toBe("/pages/cart/cart");
    expect(getPath("user")).toBe("/pages/user/user");
    expect(getPath("details")).toBe("/shop/details/index");
  });

  it("should keep the name when the mapped route has no $name placeholder", () => {
    $Config({ defaultPage: "/pages/$name", pages: [["main", "/pages/home/index"]] });

    const { getPath } = getConfig();

    expect(getPath("main")).toBe("/pages/home/index");
    expect(getPath("other")).toBe("/pages/other");
  });

  it("should use a custom getPath and ignore routing options", () => {
    const customGetPath = (name: string): string => `/custom/${name}`;

    $Config({ getPath: customGetPath });

    const config = getConfig();

    expect(config.getPath).toBe(customGetPath);
    expect(config.getPath("main")).toBe("/custom/main");
    expect(config).not.toHaveProperty("defaultPage");
  });
});

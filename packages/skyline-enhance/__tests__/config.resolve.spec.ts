import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { $Config, getConfig } from "../src/config/index.js";

// `$Config` is a module singleton, so the route resolution cases live in their own file:
// `config.spec.ts` asserts the "not configured yet" error and must keep a pristine module state.
describe("$Config route resolution", () => {
  it("should use a custom getPath and keep the other options", () => {
    const getPath = (pageName: string): string => `/custom/${pageName}`;

    $Config({ getPath, home: "main" });

    const config = getConfig();

    expect(config.getPath("index")).toBe("/custom/index");
    expect(config.home).toBe("main");
  });

  it("should expand the $name placeholder for a [name, route] array", () => {
    $Config({
      defaultPage: "/pages/$name",
      pages: [
        ["main", "/pages/main/index"],
        ["user", "/pages/$name/user"],
      ],
    });

    const config = getConfig();

    expect(config.getPath("main")).toBe("/pages/main/index");
    expect(config.getPath("user")).toBe("/pages/user/user");
  });

  it("should expand the $name placeholder for a [names, route] array", () => {
    $Config({
      defaultPage: "/pages/$name",
      pages: [[["main", "cart", "user"], "/shop/$name/$name"]],
    });

    const config = getConfig();

    expect(config.getPath("main")).toBe("/shop/main/main");
    expect(config.getPath("cart")).toBe("/shop/cart/cart");
    expect(config.getPath("user")).toBe("/shop/user/user");
  });

  it("should fall back to defaultPage for an unknown page name", () => {
    $Config({
      defaultPage: "/pages/$name/index",
      pages: [["main", "/pages/main/index"]],
    });

    expect(getConfig().getPath("main")).toBe("/pages/main/index");
    expect(getConfig().getPath("missing")).toBe("/pages/missing/index");
  });

  it("should accept a plain page map", () => {
    $Config({
      defaultPage: "/pages/$name",
      pages: { main: "/pages/main/index", user: "/pages/user/index" },
    });

    const config = getConfig();

    expect(config.getPath("main")).toBe("/pages/main/index");
    expect(config.getPath("user")).toBe("/pages/user/index");
  });

  it("should fall back to defaultPage when pages is omitted", () => {
    $Config({ defaultPage: "/pages/$name/main" });

    expect(getConfig().getPath("cart")).toBe("/pages/cart/main");
  });
});

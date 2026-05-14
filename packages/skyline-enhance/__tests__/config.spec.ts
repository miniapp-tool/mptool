import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { $Config, getConfig } from "../src/config/index.js";

describe($Config, () => {
  it("should work when only have 'defaultPage'", () => {
    $Config({ defaultPage: "/pages/$name" });

    expect(getConfig().getPath("main")).toBe("/pages/main");
    expect(getConfig().getPath("user")).toBe("/pages/user");
  });

  it("should work with multiple $name", () => {
    $Config({ defaultPage: "/pages/$name/$name" });

    expect(getConfig().getPath("main")).toBe("/pages/main/main");
    expect(getConfig().getPath("user")).toBe("/pages/user/user");
  });

  it("should work with object 'pages'", () => {
    $Config({
      pages: {
        user: "/pages/user/user",
        about: "/others/about/about",
      },
      defaultPage: "/pages/$name/$name",
    });

    expect(getConfig().getPath("main")).toBe("/pages/main/main");
    expect(getConfig().getPath("user")).toBe("/pages/user/user");
    expect(getConfig().getPath("about")).toBe("/others/about/about");
  });

  it("should work with array 'pages'", () => {
    $Config({
      pages: [
        [["main", "cart", "user"], "/pages/$name/$name"],
        [["search", "details", "order"], "/shop/$name/$name"],
        ["about", "/others/about/about"],
        ["info", "/others/$name/$name"],
      ],
      defaultPage: "/pages/$name/$name",
    });

    expect(getConfig().getPath("main")).toBe("/pages/main/main");
    expect(getConfig().getPath("cart")).toBe("/pages/cart/cart");
    expect(getConfig().getPath("user")).toBe("/pages/user/user");
    expect(getConfig().getPath("search")).toBe("/shop/search/search");
    expect(getConfig().getPath("details")).toBe("/shop/details/details");
    expect(getConfig().getPath("order")).toBe("/shop/order/order");
    expect(getConfig().getPath("about")).toBe("/others/about/about");
    expect(getConfig().getPath("info")).toBe("/others/info/info");
  });
});

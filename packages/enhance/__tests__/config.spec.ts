import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { $Config, getConfig } from "../src/config/index.js";

describe("$Config Test", () => {
  it("Should work when only have 'defaultRoute'", () => {
    $Config({ defaultPage: "/pages/$name" });

    expect(getConfig().getPath("main")).toEqual("/pages/main");
    expect(getConfig().getPath("user")).toEqual("/pages/user");
  });

  it("Should work with mutiple $name", () => {
    $Config({ defaultPage: "/pages/$name/$name" });

    expect(getConfig().getPath("main")).toEqual("/pages/main/main");
    expect(getConfig().getPath("user")).toEqual("/pages/user/user");
  });

  it("Should work with object 'routes'", () => {
    $Config({
      pages: {
        user: "/pages/user/user",
        about: "/others/about/about",
      },
      defaultPage: "/pages/$name/$name",
    });

    expect(getConfig().getPath("main")).toEqual("/pages/main/main");
    expect(getConfig().getPath("user")).toEqual("/pages/user/user");
    expect(getConfig().getPath("about")).toEqual("/others/about/about");
  });

  it("Should work with array 'routes'", () => {
    $Config({
      pages: [
        [["main", "cart", "user"], "/pages/$name/$name"],
        [["search", "details", "order"], "/shop/$name/$name"],
        ["about", "/others/about/about"],
        ["info", "/others/$name/$name"],
      ],
      defaultPage: "/pages/$name/$name",
    });

    expect(getConfig().getPath("main")).toEqual("/pages/main/main");
    expect(getConfig().getPath("cart")).toEqual("/pages/cart/cart");
    expect(getConfig().getPath("user")).toEqual("/pages/user/user");
    expect(getConfig().getPath("search")).toEqual("/shop/search/search");
    expect(getConfig().getPath("details")).toEqual("/shop/details/details");
    expect(getConfig().getPath("order")).toEqual("/shop/order/order");
    expect(getConfig().getPath("about")).toEqual("/others/about/about");
    expect(getConfig().getPath("info")).toEqual("/others/info/info");
  });
});

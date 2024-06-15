import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { $Config, getConfig } from "../src/config/index.js";

describe("$Config Test", () => {
  it("Should work when only have 'defaultRoute'", () => {
    $Config({ defaultRoute: "/pages/$name" });

    expect(getConfig().getPath("main")).toEqual("/pages/main");
    expect(getConfig().getPath("user")).toEqual("/pages/user");
  });

  it("Should work with mutiple $name", () => {
    $Config({ defaultRoute: "/pages/$name/$name" });

    expect(getConfig().getPath("main")).toEqual("/pages/main/main");
    expect(getConfig().getPath("user")).toEqual("/pages/user/user");
  });

  it("Should work with object 'routes'", () => {
    $Config({
      routes: {
        user: "/pages/user/user",
        about: "/others/about/about",
      },
      defaultRoute: "/pages/$name/$name",
    });

    expect(getConfig().getPath("main")).toEqual("/pages/main/main");
    expect(getConfig().getPath("user")).toEqual("/pages/user/user");
    expect(getConfig().getPath("about")).toEqual("/others/about/about");
  });

  it("Should work with array 'routes'", () => {
    $Config({
      routes: [
        [["main", "cart", "user"], "/pages/$name/$name"],
        [["search", "details", "order"], "/shop/$name/$name"],
        ["about", "/others/about/about"],
        ["info", "/others/$name/$name"],
      ],
      defaultRoute: "/pages/$name/$name",
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

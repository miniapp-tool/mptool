import "@mptool/mock";
import { describe, expect, it } from "vitest";
import { $Config, getConfig } from "../src/config/index.js";

describe("$Config Test", () => {
  it("Should work when only have 'defaultRoute'", () => {
    $Config({ defaultRoute: "/pages/$name" });

    expect(getConfig().getRoute("main")).toEqual("/pages/main");
    expect(getConfig().getRoute("user")).toEqual("/pages/user");
    expect(getConfig().getName("/pages/main")).toEqual("main");
    expect(getConfig().getName("/pages/user")).toEqual("user");
  });

  it("Should work with mutiple $name", () => {
    $Config({ defaultRoute: "/pages/$name/$name" });

    expect(getConfig().getRoute("main")).toEqual("/pages/main/main");
    expect(getConfig().getRoute("user")).toEqual("/pages/user/user");
    expect(getConfig().getName("/pages/main/main")).toEqual("main");
    expect(getConfig().getName("/pages/user/user")).toEqual("user");
  });

  it("Should work with object 'routes'", () => {
    $Config({
      routes: {
        user: "/pages/user/user",
        about: "/others/about/about",
      },
      defaultRoute: "/pages/$name/$name",
    });

    expect(getConfig().getRoute("main")).toEqual("/pages/main/main");
    expect(getConfig().getRoute("user")).toEqual("/pages/user/user");
    expect(getConfig().getRoute("about")).toEqual("/others/about/about");
    expect(getConfig().getName("/pages/main/main")).toEqual("main");
    expect(getConfig().getName("/pages/user/user")).toEqual("user");
    expect(getConfig().getName("/others/about/about")).toEqual("about");
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

    expect(getConfig().getRoute("main")).toEqual("/pages/main/main");
    expect(getConfig().getRoute("cart")).toEqual("/pages/cart/cart");
    expect(getConfig().getRoute("user")).toEqual("/pages/user/user");
    expect(getConfig().getRoute("search")).toEqual("/shop/search/search");
    expect(getConfig().getRoute("details")).toEqual("/shop/details/details");
    expect(getConfig().getRoute("order")).toEqual("/shop/order/order");
    expect(getConfig().getRoute("about")).toEqual("/others/about/about");
    expect(getConfig().getRoute("info")).toEqual("/others/info/info");
    expect(getConfig().getName("/pages/main/main")).toEqual("main");
    expect(getConfig().getName("/pages/cart/cart")).toEqual("cart");
    expect(getConfig().getName("/pages/user/user")).toEqual("user");
    expect(getConfig().getName("/shop/search/search")).toEqual("search");
    expect(getConfig().getName("/shop/details/details")).toEqual("details");
    expect(getConfig().getName("/shop/order/order")).toEqual("order");
    expect(getConfig().getName("/others/about/about")).toEqual("about");
    expect(getConfig().getName("/others/info/info")).toEqual("info");
  });
});

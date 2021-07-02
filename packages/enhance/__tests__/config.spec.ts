import "@mptool/mock";
import { $Config, getConfig } from "../src/config";

describe("$Config Test", () => {
  it("Should work when only have 'defaultRoute'", () => {
    $Config({ defaultRoute: "/pages/$page/$page" });

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
      defaultRoute: "/pages/$page/$page",
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
        [["main", "cart", "user"], "/pages/$page/$page"],
        [["search", "details", "order"], "/shop/$page/$page"],
        ["about", "/others/about/about"],
        ["info", "/others/$page/$page"],
      ],
      defaultRoute: "/pages/$page/$page",
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

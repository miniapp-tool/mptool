import { assertType, expectTypeOf, it } from "vitest";

import { $Page } from "../src/index.js";

it("$Page", () => {
  // oxlint-disable-next-line typescript/no-confusing-void-expression
  expectTypeOf($Page("example", {})).toEqualTypeOf<void>();

  // oxlint-disable-next-line typescript/no-explicit-any
  expectTypeOf(getCurrentPages()[0].data).toEqualTypeOf<Record<string, any>>();

  const app = getApp<{
    globalData: {
      userInfo?: WechatMiniprogram.UserInfo;
    };
    userInfoReadyCallback(userInfo: WechatMiniprogram.UserInfo): void;
  }>();

  $Page("example", {
    data: {
      motto: "点击 “编译” 以构建",
      userInfo: {},
      hasUserInfo: false,
      canIUse: wx.canIUse("button.open-type.getUserInfo"),
    },
    bindViewTap() {
      void wx.navigateTo({
        url: "../logs/logs",
      });
    },
    onLoad() {
      if (app.globalData.userInfo)
        this.setData({
          userInfo: app.globalData.userInfo,
          hasUserInfo: true,
        });
      else if (this.data.canIUse)
        app.userInfoReadyCallback = (res): void => {
          this.setData({
            userInfo: res,
            hasUserInfo: true,
          });
        };
      else
        wx.getUserInfo({
          success: (res) => {
            app.globalData.userInfo = res.userInfo;
            this.setData({
              userInfo: res.userInfo,
              hasUserInfo: true,
            });
          },
        });
    },

    // oxlint-disable-next-line typescript/no-explicit-any
    getUserInfo(event: any) {
      this.selectComponent("test");
      // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
      app.globalData.userInfo = event.detail.userInfo;
      this.setData({
        // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
        userInfo: event.detail.userInfo,
        hasUserInfo: true,
      });
    },
  });

  $Page("example", {
    data: {
      text: "init data",
      array: [{ msg: "1" }, { msg: "2" }],
      logs: [] as string[],
    },
    onLoad(options) {
      expectTypeOf(options).toEqualTypeOf<Record<string, string | undefined>>();
      expectTypeOf(options.from).toEqualTypeOf<string | undefined>();
      const app = getApp<{
        globalData: { userInfo: WechatMiniprogram.UserInfo };
      }>();

      expectTypeOf(app.globalData.userInfo).toEqualTypeOf<WechatMiniprogram.UserInfo>();
      expectTypeOf(app.globalData.userInfo.nickName).toEqualTypeOf<string>();
    },
    onReady() {
      this.setData({
        // oxlint-disable-next-line typescript/prefer-nullish-coalescing, typescript/strict-boolean-expressions, typescript/no-unsafe-assignment, typescript/no-unsafe-member-access, typescript/no-unsafe-call
        logs: (wx.getStorageSync("logs") || []).map((log: number) => new Date(log).toString()),
      });
    },
    onShow() {},
    onUnload() {},
    onPullDownRefresh() {},
    onShareAppMessage(res) {
      expectTypeOf(res).toEqualTypeOf<WechatMiniprogram.Page.IShareAppMessageOption>();
      expectTypeOf(res.from).toEqualTypeOf<"button" | "menu">();

      if (res.from === "button") {
        expectTypeOf(res.webViewUrl).toEqualTypeOf<string | undefined>();
      }

      return {
        title: "自定义转发标题",
        path: "/page/user?id=123",
      };
    },
    onPageScroll() {},
    onResize() {},
    onTabItemTap(item) {
      expectTypeOf(item).toEqualTypeOf<WechatMiniprogram.Page.ITabItemTapOption>();
      expectTypeOf(item.index).toEqualTypeOf<string>();
      expectTypeOf(item.pagePath).toEqualTypeOf<string>();
      expectTypeOf(item.text).toEqualTypeOf<string>();
    },
    viewTap() {
      this.setData(
        {
          text: "Set some data for updating view.",
          "array[0].text": "changed data",
          "object.text": "changed data",
          "newField.text": "new data",
        },
        function viewTap() {},
      );
      expectTypeOf(this.data.text).toEqualTypeOf<string>();
      expectTypeOf(this.route).toEqualTypeOf<string>();
      this.viewTap();

      const p = getCurrentPages()[1] as WechatMiniprogram.Page.Instance<
        { a: number },
        { customData: { b: number } }
      >;

      p.customData.b = p.data.a;
    },
    customData: {
      hi: "MINA",
    },
  });

  $Page("example", {
    data: {
      a: 1,
    },
    onLoad(q) {
      expectTypeOf(q).toEqualTypeOf<Record<string, string | undefined>>();
      expectTypeOf(this.data.a).toEqualTypeOf<number>();

      // @ts-expect-error: a does not exist
      assertType(this.a);
    },
    jump() {
      const query = wx.createSelectorQuery();

      query.select("#a").boundingClientRect((res) => {
        expectTypeOf(res).toEqualTypeOf<WechatMiniprogram.BoundingClientRectCallbackResult>();
      });
      query.selectViewport().scrollOffset((res) => {
        expectTypeOf(res).toEqualTypeOf<WechatMiniprogram.ScrollOffsetCallbackResult>();
      });
      query.exec((res) => {
        // oxlint-disable-next-line typescript/no-explicit-any
        expectTypeOf(res).toEqualTypeOf<any>();
      });
    },
    jumpBack() {
      void wx.navigateBack({});
    },
  });

  $Page("example", {
    f() {
      // oxlint-disable-next-line typescript/no-explicit-any
      expectTypeOf(this.data).toEqualTypeOf<Record<string, any>>();
    },
  });

  $Page("example", {
    data: {},
    f() {
      expectTypeOf(this.data).toEqualTypeOf<Record<never, never>>();
      this.setData({ a: 1 });
    },
  });

  $Page("example", {
    onLoad(query) {
      console.log(query);
    },
    f() {
      void this.onLoad();
    },
  });

  interface DataType {
    logs: string[];
  }
  interface CustomOption {
    getLogs(): string[];
  }

  $Page<DataType, CustomOption>("example", {
    data: {
      logs: [],
    },
    getLogs() {
      return (wx.getStorageSync<number[] | undefined>("logs") ?? []).map((log: number) =>
        new Date(log).toString(),
      );
    },
    onLoad() {
      const logs = this.getLogs();

      assertType<string[]>(logs);
      this.setData({ logs });

      // @ts-expect-error: log doesn't exist
      assertType(this.logs);
      assertType<string[]>(this.data.logs);
    },
  });

  $Page("example", {
    test() {
      const channel = this.getOpenerEventChannel();

      assertType<WechatMiniprogram.EventChannel | WechatMiniprogram.EmptyEventChannel>(channel);
      channel.emit?.("test", {});
      channel.on?.("xxx", () => {});

      // @ts-expect-error: key should not be number
      assertType(channel.emit?.(1, 2));
    },
  });

  $Page("example", {
    onAddToFavorites(res) {
      // webview 页面返回 webviewUrl
      if (res.webviewUrl) console.log("WebviewUrl:", res.webviewUrl);

      return {
        title: "自定义标题",
        imageUrl: "http://demo.png",
        query: "name=xxx&age=xxx",
      };
    },
  });

  $Page("example", {
    data: { a: "123" },
    onShow() {
      // oxlint-disable-next-line typescript/unbound-method
      expectTypeOf(this.fn).toEqualTypeOf<() => number>();
    },
    fn() {
      const a = Math.random();

      return a;
    },
    onShareAppMessage(): WechatMiniprogram.Page.ICustomShareContent {
      return { title: this.data.a, imageUrl: "", path: "" };
    },
  });
});

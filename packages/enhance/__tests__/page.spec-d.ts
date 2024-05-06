import { assertType, it } from "vitest";

import { $Page } from "../src/index.js";

it("$Page", () => {
  assertType<void>($Page("example", {}));

  assertType<Record<string, any>>(getCurrentPages()[0].data);

  const app = getApp<{
    globalData: {
      userInfo: WechatMiniprogram.UserInfo;
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

    getUserInfo(e: any) {
      this.selectComponent("test");
      app.globalData.userInfo = e.detail.userInfo;
      this.setData({
        userInfo: e.detail.userInfo,
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
      assertType<string | undefined>(options.from);
      const app = getApp<{
        globalData: { userInfo: WechatMiniprogram.UserInfo };
      }>();

      assertType<string>(app.globalData.userInfo.nickName);
    },
    onReady() {
      this.setData({
        logs: (wx.getStorageSync("logs") || []).map((log: number) => {
          return new Date(log).toString();
        }),
      });
    },
    onShow() {},
    onUnload() {},
    onPullDownRefresh() {},
    onShareAppMessage(res) {
      assertType<"button" | "menu">(res.from);
      if (res.from === "button") assertType<string | undefined>(res.webViewUrl);

      return {
        title: "自定义转发标题",
        path: "/page/user?id=123",
      };
    },
    onPageScroll() {},
    onResize() {},
    onTabItemTap(item) {
      assertType<string>(item.index);
      assertType<string>(item.pagePath);
      assertType<string>(item.text);
    },
    viewTap() {
      this.setData(
        {
          text: "Set some data for updating view.",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "array[0].text": "changed data",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "object.text": "changed data",
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "newField.text": "new data",
        },
        function () {},
      );
      assertType<string>(this.route);
      assertType<string>(this.data.text);
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
      assertType<Record<string, string | undefined>>(q);
      assertType<number>(this.data.a);
      // @ts-expect-error: a does not exist
      assertType(this.a);
    },
    jump() {
      const query = wx.createSelectorQuery();

      query.select("#a").boundingClientRect((res) => {
        assertType<WechatMiniprogram.BoundingClientRectCallbackResult>(res);
      });
      query.selectViewport().scrollOffset((res) => {
        assertType<WechatMiniprogram.ScrollOffsetCallbackResult>(res);
      });
      query.exec((res) => {
        assertType<any>(res);
      });
    },
    jumpBack() {
      void wx.navigateBack({});
    },
  });

  $Page("example", {
    f() {
      assertType<Record<string, any>>(this.data);
    },
  });

  $Page("example", {
    data: {},
    f() {
      assertType<{}>(this.data);
      this.setData({
        a: 1,
      });
    },
  });

  $Page("example", {
    onLoad(q) {
      q;
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
      return (wx.getStorageSync<number[]>("logs") || []).map((log: number) => {
        return new Date(log).toString();
      });
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

      assertType<WechatMiniprogram.EventChannel>(channel);
      channel.emit("test", {});
      channel.on("xxx", () => {});

      // @ts-expect-error: key should not be number
      assertType(channel.emit(1, 2));
    },
  });

  $Page("example", {
    onAddToFavorites(res) {
      // webview 页面返回 webviewUrl
      if (res.webviewUrl) console.log("WebviewUrl: ", res.webviewUrl);

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
      assertType<() => number>(this.fn);
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

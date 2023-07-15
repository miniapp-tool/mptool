import { expectType, expectError } from "tsd";
import { $Page } from "../../src";

expectType<void>($Page("example", {}));

expectType<Record<string, any>>(getCurrentPages()[0].data);

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
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true,
      });
    } else if (this.data.canIUse) {
      app.userInfoReadyCallback = (res): void => {
        this.setData({
          userInfo: res,
          hasUserInfo: true,
        });
      };
    } else {
      wx.getUserInfo({
        success: (res) => {
          app.globalData.userInfo = res.userInfo;
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true,
          });
        },
      });
    }
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
    expectType<string | undefined>(options.from);
    const app = getApp<{
      globalData: { userInfo: WechatMiniprogram.UserInfo };
    }>();
    expectType<string>(app.globalData.userInfo.nickName);
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
    expectType<"button" | "menu">(res.from);
    if (res.from === "button") {
      expectType<string | undefined>(res.webViewUrl);
    }
    return {
      title: "自定义转发标题",
      path: "/page/user?id=123",
    };
  },
  onPageScroll() {},
  onResize() {},
  onTabItemTap(item) {
    expectType<string>(item.index);
    expectType<string>(item.pagePath);
    expectType<string>(item.text);
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
    expectType<string>(this.route);
    expectType<string>(this.data.text);
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
    expectType<Record<string, string | undefined>>(q);
    expectType<number>(this.data.a);
    expectError(this.a);
  },
  jump() {
    const query = wx.createSelectorQuery();
    query.select("#a").boundingClientRect((res) => {
      expectType<WechatMiniprogram.BoundingClientRectCallbackResult>(res);
    });
    query.selectViewport().scrollOffset((res) => {
      expectType<WechatMiniprogram.ScrollOffsetCallbackResult>(res);
    });
    query.exec((res) => {
      expectType<any>(res);
    });
  },
  jumpBack() {
    void wx.navigateBack({});
  },
});

$Page("example", {
  f() {
    expectType<Record<string, any>>(this.data);
  },
});

$Page("example", {
  data: {},
  f() {
    expectType<{}>(this.data);
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
    expectType<string[]>(logs);
    this.setData({ logs });
    expectError(this.logs);
    expectType<string[]>(this.data.logs);
  },
});

$Page("example", {
  test() {
    const channel = this.getOpenerEventChannel();
    expectType<WechatMiniprogram.EventChannel>(channel);
    channel.emit("test", {});
    channel.on("xxx", () => {});
    expectError(channel.emit(1, 2));
  },
});

$Page("example", {
  onAddToFavorites(res) {
    // webview 页面返回 webviewUrl
    if (res.webviewUrl) {
      console.log("WebviewUrl: ", res.webviewUrl);
    }
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
    expectType<() => number>(this.fn);
  },
  fn() {
    const a = Math.random();

    return a;
  },
  onShareAppMessage(): WechatMiniprogram.Page.ICustomShareContent {
    return { title: this.data.a, imageUrl: "", path: "" };
  },
});

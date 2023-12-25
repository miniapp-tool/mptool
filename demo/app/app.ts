import { $App, $Config } from "@mptool/all";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
wx.env.DEBUG = true;

$Config({
  defaultRoute: "/pages/$name",
});

$App({
  globalData: {
    test: "mptool",
  },
  onLaunch(opts) {
    console.log("APP launch:", opts);
    this.$on("message to app", (msg: string) => {
      console.log(`Receive message:${msg}`);
    });
  },
  onAwake(time) {
    console.log(`App awake after ${time}ms`, this);
  },
});

import { $App, $Config, request } from "@mptool/all";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: DEBUG is not standard
wx.env.DEBUG = true;

$Config({
  defaultPage: "/pages/$name",
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
    void request("https://authserver.nenu.edu.cn/authserver/info", {
      redirect: "manual",
    }).then((res) => console.log(res));
  },
  onAwake(time) {
    console.log(`App awake after ${time}ms`, this);
  },
});

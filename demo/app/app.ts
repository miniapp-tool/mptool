import { $App, $Config, request } from "@mptool/all";

// oxlint-disable-next-line typescript/ban-ts-comment, typescript/prefer-ts-expect-error
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
    void (async (): Promise<void> => {
      try {
        console.log(
          await request("https://authserver.nenu.edu.cn/authserver/info", {
            redirect: "manual",
          }),
        );
      } catch (err) {
        console.error(err);
      }
    })();
  },
  onAwake(time) {
    console.log(`App awake after ${time}ms`, this);
  },
});

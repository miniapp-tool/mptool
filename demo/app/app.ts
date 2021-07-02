import { $App } from "@mptool/enhance";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
wx.env.DEBUG = true;

$App({
  config: {
    routes: ["test/pages/$page", "/pages/$page"],
    getRoute: (name: string) => `/pages/${name}`,
  },
  onLaunch(opts) {
    console.log("APP launch:", opts);
    this.$emitter.on("message to app", (msg: string) => {
      console.log(`Receive message:${msg}`);
    });
  },
  onAwake(time) {
    console.log(`App awake after ${time}ms`);
  },
});

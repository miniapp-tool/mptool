import { $Page } from "@mptool/enhance";

$Page("channel", {
  data: {},
  onRegister() {
    console.log("[pages/channel] page register");
  },
  onAppLaunch(opts) {
    console.log("[pages/channel] appLaunch:", opts);
  },
  onPreload(res) {
    console.log("[pages/channel] preload:", res, this);

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("finish");
        resolve();
      }, 150);
    });
  },
  onNavigate(res) {
    console.log("[pages/channel] navigating:", res, this);

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("finish");
        resolve();
      }, 150);
    });
  },
  onLoad(res) {
    console.log("[pages/channel] onLoad:", res);
  },
});

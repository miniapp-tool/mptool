import { $Page } from "@mptool/enhance";

$Page("channel", {
  data: {},
  onPageLaunch() {
    console.log("[pages/channel] page launch");
  },
  onAppLaunch(opts) {
    console.log("[pages/channel] appLaunch:", opts);
  },
  onLoad(res) {
    console.log("[pages/channel] onLoad:", res);
  },
});

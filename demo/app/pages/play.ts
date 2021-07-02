import { take } from "@mptool/file";
import { $Page } from "@mptool/enhance";

$Page("play", {
  data: {},
  onPageLaunch() {
    console.log("[pages/play] page launch");
  },
  onAppLaunch(opts) {
    console.log("[pages/play] appLaunch:", opts);
  },
  onPreload(res) {
    console.log("[pages/play] preload:", res);
  },
  onNavigate(res) {
    console.log("[pages/play] navigating:", res);
  },
  onLoad(res) {
    console.log("[pages/play] onLoad:", res);

    console.log("Get data", take("mpfile"));
    console.log("Cannot get data again", take("mpfile"));
  },
});

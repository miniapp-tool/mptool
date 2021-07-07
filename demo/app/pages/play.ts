import { take } from "@mptool/file";
import { $Page } from "@mptool/enhance";

$Page("play", {
  data: {
    test: "play",
  },
  onPageLaunch() {
    console.log("[pages/play] page launch", this);
  },
  onAppLaunch(opts) {
    console.log("[pages/play] appLaunch:", opts, this);
  },
  onPreload(res) {
    console.log("[pages/play] preload:", res, this);
  },
  onNavigate(res) {
    console.log("[pages/play] navigating:", res, this);
  },
  onLoad(res) {
    console.log("[pages/play] onLoad:", res);

    console.log("Get data", take("mpfile"));
    console.log("Cannot get data again", take("mpfile"));
  },
});

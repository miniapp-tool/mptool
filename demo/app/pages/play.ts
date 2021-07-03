import { take } from "@mptool/file";
import { $Page } from "@mptool/enhance";

$Page("play", {
  data: {
    test: "play",
  },
  onPageLaunch() {
    console.log("[pages/play] page launch");
    console.log("This", this);
  },
  onAppLaunch(opts) {
    console.log("[pages/play] appLaunch:", opts);
    console.log("This", this);
  },
  onPreload(res) {
    console.log("[pages/play] preload:", res);
    console.log("This", this);
  },
  onNavigate(res) {
    console.log("[pages/play] navigating:", res);
    console.log("This", this);
  },
  onLoad(res) {
    console.log("[pages/play] onLoad:", res);

    console.log("Get data", take("mpfile"));
    console.log("Cannot get data again", take("mpfile"));
  },
});

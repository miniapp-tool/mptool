import { $Page, take } from "@mptool/all";

$Page("play", {
  data: {
    test: "play",
  },
  onRegister() {
    console.log("[pages/play] page register", this);
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

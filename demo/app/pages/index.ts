import { put } from "@mptool/file";
import { $Page } from "@mptool/enhance";

const date = new Date().getTime();

$Page("index", {
  data: {},
  onPageLaunch() {
    console.log(
      `from [pages/index] Page Launch：${new Date().getTime() - date}ms`
    );
  },
  onAppLaunch(opts) {
    console.log("from [pages/index] APP Launch:", opts);
  },
  onLoad() {
    console.log("[pages/index] Components refs:", this.$refs);
    console.log(`[pages/index] Page name: ${this.$name}`);
    console.log(`[pages/index] Page route: ${this.route}`);
    console.log("[pages/index] CurrentPage", this.$currentPage());

    put("mpfile", "Content");
  },

  onShow() {
    void this.$preload("play?cid=456");
  },

  onReady() {
    setTimeout(() => {
      this.$emitter.emit("message to app", "I am index!");
    }, 100);
  },

  onPlay() {
    void this.$go("play?cid=123");
  },

  onChannel() {
    void this.$redirect("channel?cid=123");
  },

  onPlayNavigateTo() {
    void wx.navigateTo({ url: "/pages/play?cid=abcd" });
  },

  onAwake(time) {
    console.log("[pages/index] Awake after:", time);
    console.log("This:", this);
  },

  onClickBefore() {
    console.log("[pages/index] On click before");
  },

  onClickAfter() {
    console.log("[pages/index] On click after");
  },

  callFromComponent(name: string) {
    console.log("[pages/index] Call from component:", name);
  },
});

import { $Component } from "@mptool/all";

$Component({
  data: {},
  lifetimes: {
    created() {
      console.log("[Component/Nav] created");
      console.log("[Component/Nav] data:", this.data);
      console.log("[Component/Nav] is:", this.is);
    },
    attached() {
      console.log("[Component/Nav] attached");
      console.log("[Component/Nav] $root:", this.$root);
      console.log("[Component/Nav] $parent:", this.$parent);
    },
    ready() {
      // 调用父组件方法
      this.$call("callFromComponent", "nav");
      console.log("[Component/Nav] ready");
    },
  },
});

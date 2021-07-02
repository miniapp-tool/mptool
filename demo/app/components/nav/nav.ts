import { $Component } from "@mptool/enhance";

$Component({
  data: {},
  lifetimes: {
    created() {
      console.log("[Component/Nav] created");
      console.log("[Component/Nav] properties:", this.properties);
      console.log("[Component/Nav] is:", this.properties);
    },
    attached() {
      console.log("[Component/Nav] attached");
      console.log("[Component/Nav] properties:", this.properties);
      console.log("[Component/Nav] is:", this.properties);
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

import { $Component } from "@mptool/all";

$Component({
  data: {},
  lifetimes: {
    created(): void {
      console.log("[Component/Header] created");
      console.log("[Component/Header] data:", this.data);
      console.log("[Component/Header] is:", this.is);
    },
    attached(): void {
      console.log("[Component/Header] attached");
      console.log("[Component/Header] $root:", this.$root);
      console.log("[Component/Header] $parent:", this.$parent);
    },
    ready(): void {
      // 调用父组件方法
      this.$call("callFromComponent", "header");
      console.log("[Component/Header] ready", this.data, this.is);
    },
  },
  methods: {
    callFromComponent(from: string): void {
      console.log("[Component/Header] call from:", from);
    },
  },
});

import { $Component } from "@mptool/enhance";

$Component({
  data: {},
  lifetimes: {
    created(): void {
      console.log("[Component/Header] created");
      console.log("[Component/Header] properties:", this.properties);
      console.log("[Component/Header] is:", this.properties);
    },
    attached(): void {
      console.log("[Component/Header] attached");
      console.log("[Component/Header] properties:", this.properties);
      console.log("[Component/Header] is:", this.properties);
      console.log("[Component/Header] $root:", this.$root);
      console.log("[Component/Header] $parent:", this.$parent);
    },
    ready(): void {
      // 调用父组件方法
      this.$call("callFromComponent", "header");
      console.log("[Component/Header] ready", this.properties, this.is);
    },
  },
  methods: {
    callFromComponent(from: string): void {
      console.log("[Component/Header] call from:", from);
    },
  },
});

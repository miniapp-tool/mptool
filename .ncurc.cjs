// oxlint-disable-next-line typescript/no-unsafe-call
const { defineConfig } = require("npm-check-updates");

module.exports = defineConfig({
  peer: true,
  upgrade: true,
  timeout: 360000,
  workspaces: true,
  target: (name) => {
    if (name === "vuepress" || name.startsWith("@vuepress/")) return "@next";
    if (name === "@types/node") return "minor";

    return "latest";
  },
});

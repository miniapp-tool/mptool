// oxlint-disable-next-line typescript/no-unsafe-call
const { defineConfig } = require("npm-check-updates");

module.exports = defineConfig({
  peer: true,
  upgrade: true,
  timeout: 360000,
  target: (name) => {
    if (name === "@types/node") return "minor";

    return "latest";
  },
});

module.exports = {
  peer: true,
  upgrade: true,
  timeout: 360000,
  workspaces: true,
  target: (name) => {
    if (name === "vuepress" || name.startsWith("@vuepress/")) return "@next";
    if (name === "@types/node") return "minor";

    return "latest";
  },
};

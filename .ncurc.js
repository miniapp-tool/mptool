export default {
  cooldown: (pkg) => {
    if (
      ["@mdit/", "@mptool/", "@mr-hope/", "@oxfmt/", "@oxlint/", "@vuepress/", "vuepress-"].some(
        (prefix) => pkg.startsWith(prefix),
      ) ||
      ["oxc-config-hope", "oxfmt", "oxlint", "vuepress"].includes(pkg)
    )
      return 0;

    return 1;
  },
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

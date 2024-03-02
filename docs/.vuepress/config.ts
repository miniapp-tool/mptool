import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  lang: "zh-CN",
  title: "MP Tool",
  description: "极其轻量的小程序框架",

  bundler: viteBundler(),

  theme: hopeTheme({
    hostname: "https://miniapp-tool.github.io",
    favicon: "/logo.png",
    author: {
      name: "Mr.Hope",
      url: "https://mister-hope.com",
    },
    iconAssets: "fontawesome",

    logo: "/logo.svg",
    repo: "miniapp-tool/mptool",
    docsDir: "docs",

    navbar: ["/enhance/", "/net/", "/file/"],
    sidebar: "structure",
    footer: "MIT Licensed | Copyright 2020 - present by Mr.Hope",
    displayFooter: true,

    plugins: {
      mdEnhance: {
        codetabs: true,
        tasklist: true,
      },
      searchPro: true,
    },
  }),
});

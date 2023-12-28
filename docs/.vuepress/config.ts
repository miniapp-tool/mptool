import { cut } from "nodejs-jieba";
import { defineUserConfig } from "vuepress";
import { searchProPlugin } from "vuepress-plugin-search-pro";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  lang: "zh-CN",
  title: "MP Tool",
  description: "极其轻量的小程序框架",

  theme: hopeTheme({
    hostname: "https://miniapp-tool.github.io",

    favicon: "/logo.png",

    author: {
      name: "Mr.Hope",
      url: "https://mrhope.site",
    },

    iconAssets: "fontawesome",

    logo: "/logo.svg",

    repo: "miniapp-tool/mptool",

    docsDir: "docs",

    navbar: ["/guide/", "/api/"],

    sidebar: [
      {
        text: "介绍",
        icon: "info-circle",
        prefix: "/guide/",
        children: ["", "enhance", "file", "net"],
      },
      {
        text: "API",
        icon: "microchip",
        prefix: "/api/",
        children: "structure",
      },
    ],

    footer: "MIT Licensed | Copyright 2020 - present by Mr.Hope",

    displayFooter: true,

    plugins: {
      mdEnhance: {
        codetabs: true,
        tasklist: true,
      },
    },
  }),

  plugins: [
    searchProPlugin({
      indexContent: true,
      indexOptions: {
        tokenize: (text, fieldName) =>
          fieldName === "id" ? [text] : cut(text, true),
      },
    }),
  ],

  shouldPrefetch: false,
});

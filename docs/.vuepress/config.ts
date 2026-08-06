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

    logo: "/logo.svg",
    repo: "miniapp-tool/mptool",
    docsDir: "docs",

    navbar: [
      { text: "enhance", link: "/enhance/" },
      { text: "net", link: "/net/" },
      { text: "file", link: "/file/" },
      { text: "api", link: "/api/" },
      { text: "parser", link: "/parser/" },
      { text: "run", link: "/run/" },
      { text: "mock", link: "/mock/" },
    ],
    sidebar: "structure",
    footer: "MIT Licensed | Copyright 2020 - present by Mr.Hope",
    displayFooter: true,

    markdown: {
      codeTabs: true,
      tasklist: true,
    },

    plugins: {
      icon: {
        assets: "fontawesome",
      },
      meilisearch: {
        host: "https://meilisearch.mister-hope.com",
        apiKey: "d20925d3e008db806140a8ba74ba942506a66497ac817291033f54cc76df79cb",
        indexUid: "miniapp-tool",
      },
    },
  }),
});

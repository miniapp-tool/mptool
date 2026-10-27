import { viteBundler } from "@vuepress/bundler-vite";
import type { UserConfig } from "vuepress";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

const config: UserConfig = defineUserConfig({
  lang: "zh-CN",
  title: "MP Tool",
  description: "极其轻量的小程序框架",
  locales: {
    "/": {
      lang: "zh-CN",
      title: "MP Tool",
      description: "极其轻量的小程序框架",
    },
    "/en/": {
      lang: "en-US",
      title: "MP Tool",
      description: "A lightweight framework for WeChat mini-programs",
    },
  },

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

    locales: {
      "/": {
        navbar: [
          {
            text: "全量包",
            icon: "box",
            children: [
              { text: "@mptool/all", link: "/all/" },
              { text: "@mptool/skyline", link: "/skyline/" },
            ],
          },
          { text: "enhance", link: "/enhance/" },
          { text: "skyline-enhance", link: "/skyline-enhance/" },
          { text: "net", link: "/net/" },
          { text: "file", link: "/file/" },
          { text: "api", link: "/api/" },
          { text: "parser", link: "/parser/" },
          { text: "run", link: "/run/" },
          { text: "encoder", link: "/encoder/" },
          { text: "shared", link: "/shared/" },
          { text: "mock", link: "/mock/" },
        ],
        sidebar: "structure",
        footer: "MIT Licensed | Copyright 2020 - present by Mr.Hope",
        displayFooter: true,
      },
      "/en/": {
        navbar: [
          { text: "Guide", link: "/en/" },
          { text: "Packages", link: "/en/#packages" },
          { text: "Mock", link: "/en/mock/" },
        ],
        sidebar: false,
        footer: "MIT Licensed | Copyright 2020 - present by Mr.Hope",
        displayFooter: true,
      },
    },

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

export default config;

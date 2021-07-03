import { defineUserConfig } from "@vuepress/cli";
import taskLists = require("markdown-it-task-lists");

import type { DefaultThemeOptions } from "@vuepress/theme-default";

export default defineUserConfig<DefaultThemeOptions>({
  title: "MP Tool",
  description: "极其轻量的小程序框架",

  head: [
    ["link", { rel: "icon", href: `/logo.svg` }],
    // ["link", { rel: "manifest", href: "/manifest.webmanifest" }],
    ["meta", { name: "application-name", content: "MP Tool" }],
    ["meta", { name: "apple-mobile-web-app-title", content: "MP Tool" }],
    [
      "meta",
      { name: "apple-mobile-web-app-status-bar-style", content: "white" },
    ],
    // [
    //   "link",
    //   { rel: "apple-touch-icon", href: `/assets/icon/apple-touch-icon.png` },
    // ],
    ["meta", { name: "msapplication-TileColor", content: "#07C160" }],
    ["meta", { name: "theme-color", content: "#07C160" }],
  ],

  locales: {
    "/": {
      lang: "zh-CN",
      title: "MP Tool",
      description: "极其轻量的小程序框架",
    },
  },

  themeConfig: {
    logo: "/logo.svg",
    repo: "miniapp-tool/mptool",
    docsDir: "docs",
    docsBranch: "main",
    locales: {
      "/": {
        navbar: [
          {
            text: "指南",
            link: "/guide/get-started.html",
          },
          {
            text: "框架",
            link: "/guide/enhance.html",
          },
          {
            text: "缓存增强",
            link: "/guide/file.html",
          },
        ],
        sidebar: {
          "/guide/": [
            {
              text: "介绍",
              children: [
                "/guide/get-started.md",
                "/guide/enhance.md",
                "/guide/file.md",
              ],
            },
          ],
          "/": ["/readme.md", "/guide/get-started.md"],
        },
        selectLanguageName: "简体中文",
        selectLanguageText: "选择语言",
        selectLanguageAriaLabel: "选择语言",
        contributorsText: "贡献者",
        editLinkText: "在 GitHub 上编辑此页",
        lastUpdatedText: "上次更新于",
        tip: "提示",
        warning: "注意",
        danger: "警告",
        notFound: ["未找到页面"],
        backToHome: "返回主页",
        openInNewWindow: "在新窗口打开",
      },
    },
  },

  plugins: [
    ["@vuepress/pwa"],
    [
      "@vuepress/pwa-popup",
      {
        locales: {
          "/": {
            message: "发现新内容可用",
            buttonText: "刷新",
          },
        },
      },
    ],
    [
      "@vuepress/plugin-search",
      {
        locales: {
          "/": {
            placeholder: "搜索文档",
          },
        },
      },
    ],
    {
      name: "mptool",
      extendsMarkdown: (md) => {
        md.use(taskLists, { label: true, labelAfter: true });
      },
    },
  ],
});

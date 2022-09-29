import { searchPlugin } from "@vuepress/plugin-search";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  locales: {
    "/": {
      lang: "zh-CN",
      title: "MP Tool",
      description: "极其轻量的小程序框架",
    },
  },

  theme: hopeTheme({
    hostname: "https://miniapp-tool.github.io",

    author: {
      name: "Mr.Hope",
      url: "https://mrhope.site",
    },

    iconAssets: "//at.alicdn.com/t/font_2410206_njbtaif35kf.css",

    logo: "/logo.svg",

    repo: "miniapp-tool/mptool",

    docsDir: "docs",

    locales: {
      "/": {
        navbar: [
          "/guide/",
          {
            text: "框架",
            icon: "frame",
            prefix: "/guide/",
            children: ["enhance", "file"],
          },
          {
            text: "API",
            icon: "api",
            prefix: "/api/",
            children: ["enhance/", "file/"],
          },
        ],
        sidebar: {
          "/": [
            {
              text: "介绍",
              icon: "creative",
              prefix: "/guide/",
              children: ["", "enhance", "file"],
            },
            {
              text: "API",
              children: [
                {
                  text: "Enhance",
                  icon: "tool",
                  prefix: "/api/enhance/",
                  children: ["config", "app", "page", "component", "emitter"],
                },
                {
                  text: "File",
                  icon: "folder",
                  prefix: "/api/file/",
                  children: ["file", "storage"],
                },
              ],
            },
          ],
        },

        footer: "MIT Licensed | Copyright 2020 - present by Mr.Hope",

        displayFooter: true,
      },
    },

    plugins: {
      mdEnhance: {
        codetabs: true,
        tasklist: true,
      },

      pwa: {
        favicon: "/logo.png",
        cachePic: true,
        themeColor: "#07C160",
        manifest: {
          icons: [
            {
              src: "/logo.png",
              sizes: "200x200",
              type: "image/png",
            },
          ],
        },
      },
    },
  }),

  plugins: [
    searchPlugin({
      locales: {
        "/": {
          placeholder: "搜索文档",
        },
      },
    }),
  ],

  shouldPrefetch: false,
});

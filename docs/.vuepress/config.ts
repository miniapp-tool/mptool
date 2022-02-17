import { defineHopeConfig } from "vuepress-theme-hope";

export default defineHopeConfig({
  head: [
    ["link", { rel: "icon", href: `/logo.svg` }],
    ["meta", { name: "application-name", content: "MP Tool" }],
    ["meta", { name: "apple-mobile-web-app-title", content: "MP Tool" }],
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
    hostname: "https://miniapp-tool.github.io",
    author: {
      name: "Mr.Hope",
      url: "https://mrhope.site",
    },
    logo: "/logo.svg",
    repo: "miniapp-tool/mptool",
    docsDir: "docs",
    docsBranch: "main",
    locales: {
      "/": {
        navbar: [
          {
            text: "指南",
            link: "/guide/get-started",
          },
          {
            text: "框架",
            prefix: "/guide/",
            children: ["enhance", "file"],
          },
          {
            text: "API",
            prefix: "/api/",
            children: ["enhance/", "file/"],
          },
        ],
        sidebar: {
          "/": [
            {
              text: "介绍",
              prefix: "/guide/",
              children: ["get-started", "enhance", "file"],
            },
            {
              text: "API",
              children: [
                {
                  text: "Enhance",
                  prefix: "/api/enhance/",
                  children: ["config", "app", "page", "component", "emitter"],
                },
                {
                  text: "File",
                  prefix: "/api/file/",
                  children: ["file", "storage"],
                },
              ],
            },
          ],
        },
      },
    },
  },

  plugins: [
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
  ],
});

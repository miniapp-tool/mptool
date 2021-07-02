# @mptool/enhance

::: tip

小程序增强框架，大小仅 6.63KB。

目前支持跨组件、页面通信，页面组件间引用和生命周期扩展

后续将支持 JS 解析与热更新。

:::

## 介绍

你需要使用 `@mptool/enhance` 导出的 `$App` `$Component` 和 `$Page` 进行组件注册。

## $App

为了使框架正常工作，我们保留了 `$App` 中的 `config` 属性以放置全局配置。

由于小程序 JS 端没有读取 app.json 中配置路由的能力，你需要将小程序页面的所有路由传递至 `config.routes` 中。

如果你的页面放置在

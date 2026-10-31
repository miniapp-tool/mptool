---
title: "@mptool/skyline"
icon: cubes
---

面向微信 [Skyline 渲染引擎](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/introduction.html)（基础库 3.0+）的全量包：汇总 `@mptool/net`、`@mptool/skyline-enhance`、`@mptool/file`、`@mptool/parser`，并额外提供 `installMptoolGlobals` / `mptoolGlobals`。

与 [`@mptool/all`](/all/) 的区别：使用 `skyline-enhance` 替代 `enhance`，且**不包含** `@mptool/api`。`@mptool/run` 同样不包含在内。

::: tip 运行环境要求

Skyline 需要客户端 8.0.40+（基础库 3.0.2+）；开发者工具调试时需把调试基础库切到 3.0.0+，并在 `app.json` / `page.json` 中配置 `"renderer": "skyline"`。

:::

## 安装

```bash
npm i @mptool/skyline
# 等价写法：pnpm add @mptool/skyline
```

## 使用

```ts
// app.ts
import { $App, $Config } from "@mptool/skyline";

$Config({
  home: "/pages/index/index",
});

$App({});
```

```ts
// pages/index/index.ts
import { $Page } from "@mptool/skyline";

$Page("index", { data: {} });
```

## 包含的包

| 包                        | 内容                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `@mptool/skyline-enhance` | Skyline 版 `$App` / `$Page` / `$Component`、Emitter、热更新 |
| `@mptool/net`             | `request` / `createRequest`、`Headers`、Cookie 等           |
| `@mptool/file`            | 文件操作与带有效期的 storage                                |
| `@mptool/parser`          | HTML → rich-text 节点解析                                   |
| `@mptool/shared`          | `Emitter`、`logger`、`query`、`MpError`、`lock` 等工具      |

## 与 @mptool/all 的选择

| 场景                                  | 选择              |
| ------------------------------------- | ----------------- |
| 常规渲染引擎，需要 `@mptool/api` 封装 | `@mptool/all`     |
| Skyline 渲染引擎（基础库 3.0+）       | `@mptool/skyline` |

生命周期与导航能力的差异见 [`@mptool/skyline-enhance`](/skyline-enhance/)。

## 全局命名空间

`installMptoolGlobals()` 会把 `file` / `net` / `parser` 的导出聚合到 `globalThis.mptool`，供热更新下发的代码使用。

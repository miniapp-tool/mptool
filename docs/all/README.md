---
title: "@mptool/all"
icon: box
---

全量包：把 `@mptool/api`、`@mptool/enhance`、`@mptool/file`、`@mptool/net`、`@mptool/parser` 与 `@mptool/shared` 的常用工具打成一个 ESM 文件，并额外提供 `installMptoolGlobals` / `mptoolGlobals`。

::: tip

`@mptool/run`（自定义 JS 解释器）**不包含**在全量包中，需要热更新时请单独引入并调用 `installGlobal()`。

:::

## 安装

```bash
npm i @mptool/all
# 等价写法：pnpm add @mptool/all
```

`miniprogram-api-typings` 是可选 peer 依赖，只提供小程序的全局类型（`.d.ts` 用），需要类型提示时再自行安装。

## 使用

```ts
// app.ts
import { $App, $Config, installMptoolGlobals } from "@mptool/all";

$Config({
  home: "/pages/index/index",
  defaultPage: "/pages/$name",
});

// 需要热更新代码通过 globalThis.mptool 访问 api / file / net / parser 时调用
installMptoolGlobals();

$App({});
```

页面与组件分别使用全量包导出的 `$Page` / `$Component`。`$Page(name, options)` 的第一个参数是页面简称；`$Component` 用 `props` 声明组件属性（注册时会转换为 `properties`，并覆盖传入的 `properties`）：

```ts
// pages/index/index.ts
import { $Page } from "@mptool/all";

$Page("index", { data: {} });

// components/card/card.ts
import { $Component } from "@mptool/all";

$Component({
  props: {
    // 组件属性
  },
});
```

## 包含的包

| 包                | 内容                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `@mptool/api`     | 剪贴板、权限、页面信息、媒体、网络、UI、更新等 wx API 封装        |
| `@mptool/enhance` | `$App` / `$Page` / `$Component`、Emitter、导航锁、页面热更新      |
| `@mptool/file`    | 文件操作与带有效期的 storage                                      |
| `@mptool/net`     | `request` / `createRequest`、`Headers`、`URLSearchParams`、Cookie |
| `@mptool/parser`  | HTML → rich-text 节点解析                                         |
| `@mptool/shared`  | `Emitter`、`logger`、`query`、`env`、`MpError`、`lock` 等工具     |

## 全局命名空间

`installMptoolGlobals()` 会把 `api` / `file` / `net` / `parser` 的导出聚合到不可枚举的 `globalThis.mptool` 上，供热更新下发的代码使用：

```ts
import { installMptoolGlobals } from "@mptool/all";

installMptoolGlobals();

// 之后热更新代码里可以这样写
// globalThis.mptool.request("https://example.com/api");
```

## 微信开发者工具

包内已声明 `"miniprogram": "dist"`，在开发者工具中对该包执行「构建 npm」即可；产物为单文件 ESM，不包含 workspace 内部依赖。

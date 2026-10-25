---
title: MP Tool
icon: lightbulb
---

轻量的小程序增强框架。

## 安装

所有包都以 ESM 单文件发布，直接用包管理器安装即可：

```bash
# 需要全部能力（api + enhance + file + net + parser + shared 工具）
npm i @mptool/all

# 使用 Skyline 渲染引擎（基础库 3.0+）
npm i @mptool/skyline

# 只要增强框架本身
npm i @mptool/enhance
```

也可以使用 `pnpm add` / `yarn add` 代替 `npm i`。

`miniprogram-api-typings` 是可选 peer 依赖，只提供小程序的全局类型定义，需要类型提示时再安装：

```bash
npm i -D miniprogram-api-typings
```

## 在微信开发者工具中引入

1. 在项目根目录执行上面的安装命令；
2. 打开微信开发者工具，选择「工具 → 构建 npm」；
3. 在代码里通过包名引入：

```ts
import { $App, $Config, $Page, request } from "@mptool/all";
```

各包已在 `package.json` 中声明 `"miniprogram": "dist"`，构建 npm 时会把单文件产物打包进 `miniprogram_npm`。

## 选择包

| 需求                                     | 推荐                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| 一次拿到全部能力                         | [`@mptool/all`](/all/)                                                           |
| Skyline 渲染引擎                         | [`@mptool/skyline`](/skyline/) 或 [`@mptool/skyline-enhance`](/skyline-enhance/) |
| 只要框架（生命周期、通信、导航、热更新） | [`@mptool/enhance`](/enhance/)                                                   |
| 需要 `eval` / `new Function` 的替代品    | [`@mptool/run`](/run/)                                                           |
| 测试中模拟 `wx`                          | [`@mptool/mock`](/mock/)                                                         |
| 编码转换（GBK / GB18030）                | [`@mptool/encoder`](/encoder/)                                                   |

## 功能

- [x] @mptool/mock: wx API 模拟 <Badge text="W.I.P" type="warning" />
- [x] @mptool/enhance: 通信框架 <Badge text="Stable" />
  - 打通任意页面和组件之间的通信
  - 额外的生命周期，支持页面间互相调用进行预加载处理
  - 组件与页面之间的相互引用
  - 支持热更新页面逻辑（配合 `@mptool/run` 与 `@mptool/all` 使用）
  - Skyline 渲染引擎请使用 slim 版本：`@mptool/skyline-enhance`（见 [文档](/skyline-enhance/)）

- [x] @mptool/file: 文件与存储 API <Badge text="Stable" />
  - 为缓存数据设置有效期
  - Node.js 风格的创建文件夹
  - 解压文件接口
  - 保存在线文件

- [x] @mptool/api: 通用 API 封装 <Badge text="Stable" />

- [x] @mptool/encoder: UTF-8 / GBK / GB18030 的编码支持 <Badge text="Stable" />

- [x] @mptool/net: 小程序网络 API <Badge text="Stable" />
  - Headers
  - URLSearchParams
  - 自动解析并携带 Cookie

- [x] @mptool/parser: HTML 解析器 <Badge text="Stable" />

- [x] @mptool/run: 自定义 JS 解释器，替代被禁用的 `eval` 与 `new Function` <Badge text="Stable" />
  - 不包含在 `@mptool/all` / `@mptool/skyline` 全量包中，需单独引入

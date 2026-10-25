---
title: "@mptool/skyline-enhance"
icon: toolbox
---

`@mptool/enhance` 的 slim 版本，面向微信 [Skyline 渲染引擎](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/introduction.html)（基础库 3.0+）。

跨组件、页面通信，页面组件间引用，生命周期扩展和 TypeScript 支持。

::: tip

Skyline 渲染对运行环境有要求：客户端 8.0.40+（对应基础库 3.0.2+），开发者工具调试时需将调试基础库切到 3.0.0+，并在 `app.json` / `page.json` 中配置 `"renderer": "skyline"`。

:::

## 与 @mptool/enhance 的差异

| 能力                       | `@mptool/enhance`                                                     | `@mptool/skyline-enhance` |
| -------------------------- | --------------------------------------------------------------------- | ------------------------- |
| 额外生命周期               | `onRegister` / `onAppLaunch` / `onNavigate` / `onPreload` / `onAwake` | `onRegister` / `onAwake`  |
| `$preload`                 | ✅                                                                    | ❌                        |
| 导航锁                     | ✅（`onReady` + `minInterval` 后释放）                                | ❌                        |
| `maxDelay` / `minInterval` | 生效                                                                  | ❌（配置项已移除）        |
| 路由事件                   | `routeEmitter` + `onNavigate` / `onPreload`                           | ❌                        |

具体原因：Skyline 模式下页面在**首次跳转时**才现场注册（不是启动时调用 `Page()`），因此没有 `onPreload` 生命周期，也没有 `$preload` 实例方法；同时框架没有可等待的页面准备周期，所以 `onNavigate` 与导航锁一并移除。

除上表外，`$Config`、`$App`、`$Page`、`$Component`、Emitter 与页面热更新均与 `@mptool/enhance` 一致。

> 需要预加载、跳转前准备或导航锁时，请使用 `@mptool/enhance`。

## 安装

```bash
npm i @mptool/skyline-enhance
# 使用热更新时还需要解释器
npm i @mptool/run
```

## 使用

框架要求你使用 `@mptool/skyline-enhance` 导出的 `$App`，`$Component` 和 `$Page` 进行应用、页面与组件注册。

### $Config

用于配置小程序框架，请在 `app.js` 中于 `$App` 之前调用。

::: code-tabs#language

@tab TypeScript

```ts
// app.ts
import { $App, $Config } from "@mptool/skyline-enhance";

$Config({
  // your config here
});

$App({
  // your app options here
});
```

@tab JavaScript

```js
// app.js
const { $App, $Config } = require("@mptool/skyline-enhance");

$Config({
  // your config here
});

$App({
  // your app options here
});
```

:::

`$Config` 的 `defaultPage` / `pages` / `getPath` / `home` / `extendPage` / `injectPage` / `extendComponent` / `injectComponent` / `hotReloadPattern` 与 enhance 相同，详见 [$Config API](./api/config.md)。

::: warning 仅 enhance 生效的选项

Skyline 版本没有 `onNavigate` 与导航锁，`$Config` 不提供 `maxDelay` / `minInterval`，传入这两个选项会类型报错。

:::

### $App

框架提供的应用注册器。

- 生命周期扩展：`onAwake(time: number)`，在小程序从后台唤醒时调用，`time` 为本次休眠时间，单位 ms
- 方法扩展：`$on` / `$off` / `$emit` / `$emitAsync`

详见 [$App API](./api/app.md)。

### $Page

框架提供的页面注册器，结构为 `$Page(name, options)`：`name` 为页面简称，`options` 为页面选项。

```ts
// pages/index/index.ts
import { $Page } from "@mptool/skyline-enhance";

$Page("main", {
  // your config here
});
```

额外生命周期：

- `onRegister()`：在页面即将注册时调用（此时 `this` 上尚未挂载小程序原生方法）
- `onAwake(time: number)`：在小程序从后台唤醒且该页面存活时调用

页面实例上可用的属性与方法（详细说明见 [$Page API](./api/page.md)）：

- 属性：`$name`、`$state.firstOpen`、`$refs`
- 导航：`$go` / `$redirect` / `$switch` / `$reLaunch` / `$back`
- 信息：`$currentPage` / `$getPath`
- 通信：`$`（父子组件沟通器）、`$on` / `$off` / `$emit` / `$emitAsync`

::: warning skyline 版本不提供

- `onAppLaunch` / `onNavigate` / `onPreload` 生命周期
- `$preload` 实例方法

:::

### $Component

框架提供的组件注册器，与 enhance 完全一致：类型化 `props`、基于 `$refs` 的父子引用、`$call(method, ...args)`、`$id` / `$refID` / `$root` / `$parent` 等，详见 [$Component API](./api/component.md)。

## 导航

框架包装了四个顶部跳转函数与对应的页面实例方法：

- `go` / `$go`：`wx.navigateTo` 的封装
- `redirect` / `$redirect`：`wx.redirectTo` 的封装（替换页面，不产生历史）
- `switchTab` / `$switch`：`wx.switchTab` 的封装
- `reLaunch` / `$reLaunch`：`wx.reLaunch` 的封装

```js
import { go } from "@mptool/skyline-enhance";

this.$go("play?vid=xxx&cid=xxx");
go("/pages/play?vid=xxx");
```

此外还提供：

- `$back(delta = 1)`：`wx.navigateBack` 的简单封装；页面栈不足时会回退到 `$Config` 的 `home`
- 视图层代理：`$bindGo` / `$bindRedirect` / `$bindSwitch` / `$bindRelaunch` / `$bindBack`，通过 `data-url`、`data-delta`、`data-before`、`data-after` 配置

::: warning 没有导航锁

Skyline 版本不维护导航锁，连续快速触发的跳转都会执行。如果你的页面存在重复点击风险，请自行做防抖或按钮 `disabled` 处理。

:::

::: warning `wx.switchTab` 不支持参数

与 enhance 一样，`switchTab` 只使用路径。区别是 enhance 会把 query 用于触发 `onNavigate`，而 Skyline 版本没有该生命周期，query 会被直接忽略。

:::

::: tip 相对路径

框架不支持相对路径跳转，请一律使用页面简称或绝对路径。

:::

## Emitter

框架导出了 `Emitter` 与一个全局 `emitter` 实例，用于任意模块之间的通信；实例方法 `$on` / `$off` / `$emit` / `$emitAsync` 会挂载到 `$App` / `$Page` / `$Component` 实例上。

```ts
import { Emitter, emitter } from "@mptool/skyline-enhance";

const bus = Emitter();

bus.on("foo", (payload) => console.log(payload));
bus.emit("foo", { a: "b" });
await bus.emitAsync("bar", { data: "content" });

// 全局实例
emitter.on("user-login", () => {});
```

详见 [Emitter API](./api/emitter.md)。

## 页面热更新

页面热更新与 `@mptool/enhance` 共用同一实现：设置 `$Config({ hotReloadPattern })` 后，页面注册时会异步拉取远程代码并合并到页面实例。

```ts
$Config({
  hotReloadPattern: "https://example.com/hotReloadCode/$name",
});
```

需要先在小程序 `app.js` 中挂载 `createFunction`：

```ts
import { installGlobal } from "@mptool/run";

installGlobal();
```

拉取时机、`onHotReload` 钩子、服务端部署（返回 200 空响应体避免 404）等细节与 enhance 完全一致，请参阅 [enhance 的「页面热更新」章节](../enhance/README.md)。

## 从 @mptool/enhance 迁移

将包名替换为 `@mptool/skyline-enhance` 后，按以下清单调整：

1. 删除 `onAppLaunch` / `onNavigate` / `onPreload` 生命周期及 `this.$preload(...)` 调用；
2. 依赖 `onNavigate` 的跳转前准备逻辑，改为在目标页 `onLoad` / `onRegister` 中处理；
3. 依赖导航锁的防重复跳转，改为调用方自行防抖；
4. 删除 `maxDelay` / `minInterval` 配置：Skyline 没有 `onNavigate` 与导航锁，`$Config` 不再接受这两个选项；
5. 页面热更新、Emitter、`$Component`、`$refs` 等用法不变。

## API

- [配置（$Config）](./api/config.md)
- [应用（$App）](./api/app.md)
- [页面（$Page）](./api/page.md)
- [组件（$Component）](./api/component.md)
- [事件（Emitter）](./api/emitter.md)

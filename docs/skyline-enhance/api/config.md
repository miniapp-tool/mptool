---
title: $Config
order: 2
---

全局配置器，必须放置在应用主脚本中、在 `$App` 前调用。

`$Page` / `$Component` 的注册同样依赖全局配置：在调用 `$Config` 之前注册页面或组件会抛出 `MpError`。

与 `@mptool/enhance` 相比，Skyline 版本没有 `onNavigate` 生命周期与导航锁，因此**不接受** `maxDelay` / `minInterval` 配置（传入会类型报错）。

## defaultPage

- 类型: `string`
- 必填: 是（使用 `getPath` 时可不填）

默认路径模式。

当你给出的页面路径或简称无法通过 `pages` 解析时，会回退到此路径。

填入小程序路径模式：一个路径字符串，用 `$name` 表示页面简称的位置。

::: tip

你可以填入 `/pages/$name/$name` 来表达：

- `main` → `/pages/main/main`
- `user` → `/pages/user/user`

:::

## pages

- 类型: `Record<string, string> | Array<[string, string] | [string[], string]>`
- 必填: 否

小程序页面简称与路径映射。

你可以直接以对象形式表示简称到路径的映射，如：

```js
{
  main: "/pages/main/main",
  cart: "/pages/cart/cart",
  user: "/pages/user/user",
}
```

也可以使用数组格式，数组元素有两种填写方式：

- `[页面简称, 小程序路径]`
- `[页面简称数组, 小程序路径模式]`（路径模式中用 `$name` 表示页面简称的位置）

如：

```js
[
  [["main", "cart", "user"], "/pages/$name/$name"],
  [["search", "details", "order"], "/shop/$name/$name"],
  ["about", "/others/about/about"],
];
```

等效于：

```js
{
  main: "/pages/main/main",
  cart: "/pages/cart/cart",
  user: "/pages/user/user",
  search: "/shop/search/search",
  details: "/shop/details/details",
  order: "/shop/order/order",
  about: "/others/about/about",
}
```

::: tip

无法解析的路径会回退到 `defaultPage`。

:::

## getPath

- 类型: `(pageName: string) => string`
- 必填: 否

自定义页面简称到页面路径的解析函数，作为 `defaultPage` / `pages` 的替代方案。配置了 `getPath` 后，`defaultPage` 可以不填。

## home

- 类型: `string`
- 必填: 否

主页页面名称（简称或路径）。

当页面栈不足以支持 `$back` 回退时，会 `reLaunch` 到此页面。

## extendComponent

- 类型: `(options: TrivialComponentOptions) => void`
- 必填: 否

自定义扩展组件。时机在框架执行扩展之前，可为每个组件挂载实例方法。

## injectComponent

- 类型: `(options: TrivialComponentOptions) => void`
- 必填: 否

自定义注入组件。时机在框架执行扩展之后、组件注册之前，仅执行一次，这意味着你可以覆盖框架的方法。

## extendPage

- 类型: `(name: string, options: TrivialPageOptions) => void`
- 必填: 否

自定义扩展页面，在框架执行扩展之前。

## injectPage

- 类型: `(name: string, options: TrivialPageOptions) => void`
- 必填: 否

自定义注入页面。在框架执行扩展之后，这意味着你可以覆盖框架的方法。

## hotReloadPattern

- 类型: `string`
- 必填: 否

页面热更新代码地址模板，`$name` 会被替换为页面名称。

开启后，框架会在页面注册时检测 `globalThis` 上由 `@mptool/run` 的 `installGlobal()` 挂载的 `createFunction`；若存在，则异步拉取该地址的代码并执行，将返回的方法对象（对象属性即页面方法）合并到页面实例上。

热更新是尽力而为的，不阻塞页面注册与加载；拉取或执行失败时静默跳过。

@example `https://example.com/hotReloadCode/$name`

## hotReloadTimeout

- 类型: `number`
- 默认: `10000`

页面热更新拉取的超时时间，单位 ms。

超时后视为该页面没有可用热更新，并释放等待中的页面实例，避免请求永不返回时页面实例一直滞留；超时之后才到达的响应会被忽略。

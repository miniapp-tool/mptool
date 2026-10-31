---
title: $Config
order: 2
---

全局配置器，必须放置在应用主脚本中在 `$App` 前调用。

`$Page` / `$Component` 的注册同样依赖全局配置：在调用 `$Config` 之前注册页面或组件会抛出 `MpError`。

## defaultPage

- 类型: `string`
- 必填: 是

默认路径模式。

当你给出的页面路径或简称无法通过 routeMap 解析时，会回退到此路径

填入小程序路径模式，小程序路径模式是一个路径字符串，用 `$name` 表示小程序简称的位置

::: tip

你可以填入 `/pages/$name/$name` 来表达:

- `main': '/pages/main/main`
- `user': '/pages/user/user`

:::

## pages

- 类型: `Record<string, string> | Array<[string, string] | [string[], string]>`
- 必填: 否

小程序页面简称与路径映射。

你可以直接以对象形式表示简称到路径的映射。如:

```js
{
  main: '/pages/main/main',
  cart: '/pages/cart/cart',
  user: '/pages/user/user',
}
```

也支持以在页面复杂的情况下数组格式表示小程序路径映射，数组的元素有两种填写方式:

- `[页面简称, 小程序路经]`

- `[页面简称数组, 小程序路经模式]`

  小程序路径模式是一个路径字符串，用 `$name` 表示小程序简称的位置

如:

```js
[
  [["main", "cart", "user"], "/pages/$name/$name"],
  [["search", "details", "order"], "/shop/$name/$name"],
  ["about", "/others/about/about"],
];
```

等效于:

```js
{
  'main': '/pages/main/main',
  'cart': '/pages/cart/cart',
  'user': '/pages/user/user',
  'search': '/shop/search/search',
  'details': '/shop/details/details',
  'order': '/shop/order/order',
  'about': '/others/about/about',
}
```

::: tip

无法解析的路径会回退到 `defaultPage`

:::

## getPath

- 类型: `(pageName: string) => string`
- 必填: 否

自定义页面简称到页面路径的解析函数，作为 `defaultPage`/`pages` 的替代方案。配置了 `getPath` 后，`defaultPage` 可以不填。

## home

- 类型: `string`
- 必填: 否

主页页面名称

## maxDelay

- 类型: `number`
- 默认: `200`

跳转延迟执行的最长时间，单位 ms

## minInterval

- 类型: `number`
- 默认: `100`

允许进行跳转据页面首屏渲染后的最小间隔时间，单位 ms

## lockTimeout

- 类型: `number`
- 默认: `5000`

导航锁的最长持有时间，单位 ms。

正常情况下导航锁只在目标页 `onReady`（并与 `minInterval` 一起延迟）后释放；`onUnload` 不是释放时机——`redirectTo` / `reLaunch` / 从非 tab 页 `switchTab` 时旧页会在目标页 ready 之前卸载，此时释放会让后续点击在目标页仍在加载时发起新的导航。若目标页始终没有触发 `onReady`（例如 `switchTab` 回到已加载的 tab 页、在 `onLoad` 内被强制返回），锁会在 `lockTimeout` 后强制释放，避免导航永久失效。

## hotReloadPattern

- 类型: `string`

- 必填: 否

页面热更新代码地址模板，`$name` 会被替换为页面名称。

设置后，框架会在页面**注册**时异步请求该地址，用 `globalThis.createFunction` 执行返回的代码（`global: true`），并把返回的方法对象合并到页面实例上。拉取只在注册时发生一次，不会阻塞页面注册与加载；同一页面的在途请求会去重；拉取或执行失败会静默跳过。需要获取新部署的代码时，重启小程序即可（或调用 `clearHotReloadCache()`）。

```ts
$Config({
  hotReloadPattern: "https://example.com/hotReloadCode/$name",
});
```

::: tip

热更新代码需要先在 `app.js` 中调用 `@mptool/run` 的 `installGlobal()` 挂载 `createFunction`，否则热更新会被跳过。详见「页面热更新」。

:::

## hotReloadTimeout

- 类型: `number`
- 默认: `10000`

页面热更新拉取的超时时间，单位 ms。

超时后视为该页面没有可用热更新，并释放等待中的页面实例，避免请求永不返回时页面实例（及其闭包）一直滞留；超时之后才到达的响应会被忽略。

## extendComponent

- 类型: `(options: TrivialComponentOptions): void`

- 参数:
  - `options`: 组件选项

- 必填: 否

自定义扩展组件

时机在框架执行扩展之前，可为每个组件挂载实例方法

## injectComponent

- 类型: `(options: TrivialComponentOptions): void`

- 参数:
  - `options`: 组件选项

- 必填: 否

自定义扩展组件

时机在框架执行扩展之后、组件注册之前，仅执行一次，这意味着你可以覆盖框架的方法

## extendPage

- 类型: `(name: string, options: TrivialPageOptions): void`

- 参数:
  - `name`: 页面名称
  - `options`: 页面选项

- 必填: 否

自定义扩展页面，在框架执行扩展之前

## injectPage

- 类型: `(name: string, options: TrivialPageOptions): void`

- 参数:
  - `name`: 页面名称
  - `options`: 页面选项

- 必填: 否

自定义注入页面

在框架执行扩展之后，这意味着你可以覆盖框架的方法

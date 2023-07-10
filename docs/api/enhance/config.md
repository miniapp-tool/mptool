# $Config

全局配置器，必须放置在应用主脚本中在 `$App` 前调用。

## defaultRoute

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

## routes

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

无法解析的路径会回退到 `defaultRoute`

:::

## maxDelay

- 类型: `number`
- 默认: `200`

跳转延迟执行的最长时间，单位 ms

## minInterval

- 类型: `number`
- 默认: `100`

允许进行跳转据页面首屏渲染后的最小间隔时间，单位 ms

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

时机在框架执行扩展之后，这意味着你可以覆盖框架的方法

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

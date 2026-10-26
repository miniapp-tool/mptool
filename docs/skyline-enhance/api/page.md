---
title: $Page
order: 4
---

- 类型:

  ```ts
  function $Page<Data extends Record<string, any>, Custom extends Record<string, any>>(
    name: string,
    options: PageOptions<Data, Custom>,
  ): void;
  ```

  参数:
  - `name`: 页面简称
  - `options`: 页面选项

框架提供的页面注册器。

```ts
// pages/index/index.ts
import { $Page } from "@mptool/skyline-enhance";

$Page("main", {
  // your config here
});
```

## 扩展

### onRegister

- 类型: `(): void`

在页面即将注册时调用。

::: warning

此时 `this` 上尚未挂载小程序原生方法。

:::

### onAwake

- 类型: `onAwake(time: number): void | Promise<void>`

- 参数:
  - `time`: 为本次休眠时间，单位 ms

在小程序从后台唤醒且该页面存活时调用。

::: warning

框架不会检测与等待异步方法返回。

:::

### 不支持的生命周期

Skyline 模式下页面在**首次跳转时**才现场注册，因此本包不提供以下生命周期（使用 `@mptool/enhance` 才可用）：

- `onAppLaunch`
- `onNavigate`
- `onPreload`

## 注入

### $name

- 类型: `string`

当前页面名称。

### $state

- 类型: `PageState & Record<string, unknown>`

框架生成的页面状态。

::: tip 每个实例独立

每个页面实例都会在 `onLoad` 时得到一份独立的 `$state`（以页面定义上的状态为初始值），因此可以安全地读写业务数据，同一页面的多个实例之间不会互相影响。

Skyline 版本没有 `onAppLaunch` / `onPreload` / `onNavigate`，实例创建前不会由框架写入任何状态。

:::

- `$state.firstOpen`: 是否是第一个打开的页面

### 事件派发

事件派发相关，均为 [Emitter](./emitter.md) 实例属性或方法：

- `$on(type: string, handler: (event?: any) => void | Promise<void>): void`: 监听 `type` 事件

- `$emit(type: string, event?: any): void`: 同步触发 `type` 事件

- `$emitAsync(type: string, event?: any): Promise<void>`: 异步触发 `type` 事件并接受回调

- `$off(type: string, handler?: (event?: any) => void | Promise<void>): void`: 取消监听 `type` 的 `handler` 事件或全部事件（当未传入 `handler`）

### $refs

- 类型: `Map<string, ComponentInstance>`

指定了 `ref` 的子组件实例 Map，可用于获取子组件引用。

::: tip 示例

```html
<custom-component binding="$" ref="customComp1" />
```

```js
$Page({
  onLoad() {
    this.$refs.get("customComp1"); // custom-component1 子组件的实例引用
  },
});
```

:::

### $

父子组件沟通器，提供了通过 `binding="$"` 形式建立父子组件 / 页面与组件沟通的能力。

### 页面信息

#### $currentPage

- 类型: `(): PageInstance | undefined`

获取当前页面实例。

::: warning

页面栈为空时（例如冷启动阶段或所有页面均已关闭）返回 `undefined`，调用方需要判空。

:::

#### $getPath

- 类型: `(name: string): string`

获取传入页面简称的页面路径。返回值始终是带前导 `/` 的绝对路径（例如配置为 `pages/main` 时返回 `/pages/main`），与 `$go` 保持一致的规范化。

## 导航方法

以下方法与 enhance 相同：`pageName` 为页面简称，可以带上 `queryString`，也可以传入带参数的绝对路径。

::: warning

由于相对 URL 的写法会和页面简称混淆，框架不支持相对路径跳转，请一律使用页面简称或绝对路径。

:::

::: tip

Skyline 版本没有导航锁，跳转总是立即执行。为与 `@mptool/enhance` 共享类型，以下方法的返回类型包含 `undefined`，但实际总是解析为导航结果。

:::

### $go

- 类型: `(pageName: string) => Promise<WechatMiniprogram.NavigateToSuccessCallbackResult | undefined>`

导航到指定页面，是 `wx.navigateTo` 的封装。

```js
this.$go("play?vid=xxx&cid=xxx");
```

### $redirect

- 类型: `(pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult | undefined>`

重定向到指定页面，即**替换页面，不产生历史**，是 `wx.redirectTo` 的封装。

```js
this.$redirect("about?year=2021");
```

### $switch

- 类型: `(pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult | undefined>`

跳转到指定 tabBar 页面，并关闭其他所有非 tabBar 页面，是 `wx.switchTab` 的封装。

::: warning

`wx.switchTab` 不支持参数：enhance 中 query 只用于触发 `onNavigate`，Skyline 版本没有该生命周期，**query 会被直接忽略**。

:::

```js
this.$switch("main");
```

### $reLaunch

- 类型: `(pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult | undefined>`

关闭所有页面，之后打开到应用内的某个页面，是 `wx.reLaunch` 的封装。

```js
this.$reLaunch("main?user=mrhope");
```

### $back

- 类型: `(delta = 1) => Promise<WechatMiniprogram.GeneralCallbackResult | undefined>`

`wx.navigateBack` 的简单封装，`delta` 为返回的层数，默认为 `1`。页面栈不足且配置了 `home` 时，会 `reLaunch` 到 `home`。

## 视图层代理

在元素上使用 data-set 绑定跳转配置：

- `data-url`：跳转到的页面简称或绝对路径，可带参数
- `data-delta`：`$bindBack` 的回退层数
- `data-before`：跳转前执行
- `data-after`：跳转后执行

可用的代理方法：`$bindGo`、`$bindRedirect`、`$bindSwitch`、`$bindRelaunch`、`$bindBack`。

::: warning

只有跳转真正发生（`wx` 跳转 API 成功返回）时才会执行 `data-after`；跳转失败或未真正跳转（解析为 `undefined`）时不会执行。跳转失败会被捕获并记录错误日志，不会产生未处理的 Promise rejection。

:::

::: tip

```html
<button catch:tap="$bindGo" data-url="play" data-before="onClickBefore">click go</button>
```

:::

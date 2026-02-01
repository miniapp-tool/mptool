---
title: $Component
order: 5
---

- 类型: `$Component(options: ComponentOPtions): string`

框架提供的组件注册器。

## 注入

### $id

- 类型: `number`

当前组件的唯一标识

### $refID

- 类型: `string`

当前组件上用于索引的 ref ID 值

### $root

- 类型: `PageInstance`

当前组件所属的页面实例

::: warning

只在 `attached`, `ready` 生命周期后生效

:::

### $parent

- 类型: `PageInstance | ComponentInstance`

当前组件所属的父组件或父页面实例

::: warning

只在 `attached`, `ready` 生命周期后生效

:::

### $refs

- 类型: `Record<string, ComponentInstance>`

指定了 ref 的子组件实例 Map，可用于获取子组件引用

::: tip 示例

```html
<custom-component binding="$" ref="customRef1" />
```

```js
$Component({
  lifetimes: {
    attached() {
      this.$refs.customComp; // 根据 ref 属性获取子组件的实例引用
    },
  },
});
```

:::

### $call

- 类型:

  ```ts
  function $call(method: string, ...args: unknown[]): void;
  ```

- 参数:
  - `method`: 需要调用的方法名称
  - `args`: 为需要传递的参数

通过消息的方式调用父组件方法，即使父组件方法不存在也不会报错

### 事件派发

事件派发相关，均为 [$Emitter](./emitter.md) 实例属性或方法

- `$on(type:string, handler: (event?:any) => void | Promise<void>): void`: 监听 `type` 事件

- `$emit(type:string, event?:any): void`: 同步触发 `type` 事件

- `$emitAsync(type:string, event?:any): Promise<void>`: 异步触发 `type` 事件并接受回调

- `$off(type:string, handler: (event?:any) => void | Promise<void>): Promise<void>`: 取消监听 `type` 的 `handler` 事件或全部事件 (当未传入 `handler`)

- `$all`: 事件名称到已注册处理函数的映射

### $

父子组件沟通器

提供了通过 `binding="$"` 形式建立父子组件/页面与组件沟通的能力

### $preload

- 类型:

  ```ts
  function $preload(pageName: string): void | Promise<void>;
  ```

- 参数:
  - `pageName`: 页面简称，可以带上 `queryString`

提前预加载指定页面，即触发对应页面的 `onPreload` 生命周期

### $go

- 类型:

  ```ts
  function $go(pageName: string): Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>;
  ```

- 参数:
  - `pageName`: 页面简称，可以带上 `queryString`

导航到指定页面

本函数是 `wx.navigateTo` 的封装

::: tip 示例

```js
this.$go("play?vid=xxx&cid=xxx");
```

:::

### $redirect

- 类型:

  ```ts
  function $redirect(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- 参数:
  - `pageName`: 页面简称，可以带上 `queryString`

重定向到指定页面, 即**替换页面，不产生历史**。

本函数是 `wx.redirectTo` 的封装

::: tip 示例

```js
this.$redirect("about?year=2021");
```

:::

### $switch

- 类型:

  ```ts
  function $switch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- 参数:
  - `pageName`: 页面简称，可以带上 `queryString`

跳转到指定 tabBar 页面，并关闭其他所有非 tabBar 页面

本函数是 `wx.switchTab` 的封装

::: warning

路径参数只用于触发 `onNavigate` (`wx.switchTab` 不支持参数)

:::

::: tip 示例

```js
this.$switch("main?user=mrhope");
```

:::

### $reLaunch

- 类型:

  ```ts
  function $reLaunch(pageName: string): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- 参数:
  - `pageName`: 页面简称，可以带上 `queryString`

关闭所有页面，之后打开到应用内的某个页面

本函数是 `wx.reLaunch` 的封装

::: tip 示例

```js
this.$launch("main?user=mrhope");
```

:::

### $back

- 类型:

  ```ts
  function $back(delta = 1): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- 参数:
  - `delta`: 后退的层级数，默认为 `1`

本函数是 `wx.navigateBack` 的简单封装

### $bindGo

`$go` 的视图层代理方法，你需要在视图层使用 dataset 来绑定跳转配置:

- `data-url` 跳转到的页面简称或绝对路径，可带参数
- `data-before` 跳转前执行
- `data-after` 跳转后执行

::: tip

```html
<button catch:tap="$bindGo" data-url="play" data-before="onClickBefore">click go</button>
```

:::

### $bindRedirect

`$redirect` 的视图层代理方法，你需要在视图层使用 dataset 来绑定跳转配置:

- `data-url` 跳转到的页面简称或绝对路径，可带参数
- `data-before` 跳转前执行
- `data-after` 跳转后执行

::: tip

```html
<button catch:tap="$bindRedirect" data-url="/pages/play" data-after="onClickAfter">
  click redirect
</button>
```

:::

### $bindSwitch

`$switch` 的视图层代理方法，你需要在视图层使用 dataset 来绑定跳转配置:

- `data-url` 跳转到的页面简称或绝对路径，可带参数

  ::: warning

  由于 `wx.switchTab()` 不支持参数，参数仅用于触发对应页面的 `onNavigate` 生命周期

  :::

- `data-before` 跳转前执行
- `data-after` 跳转后执行

### $bindRelaunch

`$reLaunch` 的视图层代理方法，你需要在视图层使用 dataset 来绑定跳转配置:

- `data-url` 跳转到的页面简称或绝对路径，可带参数
- `data-before` 跳转前执行
- `data-after` 跳转后执行

### $bindBack

`$back` 的视图层代理方法，你需要在视图层使用 dataset 来绑定跳转配置:

- `data-delta` 回退层数
- `data-before` 跳转前执行
- `data-after` 跳转后执行

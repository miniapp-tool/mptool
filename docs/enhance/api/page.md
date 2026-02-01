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

框架提供的页面注册器

## 扩展

### onRegister

- 类型: `(): void`

在页面即将注册时调用

::: warning

此时 this 上尚未挂载小程序原生方法

:::

### onAppLaunch

- 类型: `onAppLaunch(options: WechatMiniprogram.App.LaunchShowOption): void | Promise<void>`

- 参数:
  - `options`: App 启动时的 `onLaunch` 参数

在 `App.onLaunch` 触发时调用

::: warning

框架在 App 启动时仅触发此方法，不会检测与等待异步方法返回。

:::

### onAwake

- 类型: `onAwake(time: number): void | Promise<void>`

- 参数:
  - `time`: 为本次休眠时间，单位 ms

在小程序从后台唤醒时调用

::: warning

框架在 App 启动时仅触发此方法，不会检测与等待异步方法返回。

:::

### onPreload

- 类型: `onPreload(options: PageQuery): void | Promise<void>`

- 参数:
  - `options`: 为通过触发预加载携带参数生成的参数对象

预加载生命周期，可在其他页面中使用 `this.$preload(pageNameWithArgs | pageUrlWIthArgs)` 触发特定页面的预加载周期。

你可以在用户特定行为后根据用户行为漏斗特点预加载对应界面准备数据。

::: warning 小程序分包

由于小程序每个分包下页面会在首次请求跳转到某个分包页面时注册，所以此时进入的首个页面无法触发 `onPreload` 周期。

:::

### onNavigate

- 类型: `onNavigate(options: PageQuery): void | Promise<void>`

- 参数:
  - `options`: 为通过触发预加载携带参数生成的参数对象

页面即将被跳转时触发。

在进行页面间跳转时吗，会先执行对应页面的 `onNavigate` 再进行跳转。

建议将低耗时 (< 150ms) 的操作放入 `onNavigate` 周期，并在 `onLoad` 时判断 `onNavigate` 是否成功触发。

::: tip

为触发 `onNavigate` 生命周期，跳转必须使用框架包装的方法:

- `$go`
- `$redirect`
- `$switch`
- `$reLaunch`
- `$bindGo`
- `$bindRedirect`
- `$bindSwitch`
- `$bindReLaunch`

:::

::: warning

由于同步或异步的 `onNavigate` 均受到支持，为了避免执行时间较长的方法阻塞跳转、迷惑用户，在达到 `maxDelay` 时长后框架会强制进行跳转，而不再等待 `onNavigate` 完成。

另外由于小程序每个分包下页面会在首次请求跳转到某个分包页面时注册，所以此时进入的首个页面无法触发 `onNavigate` 周期。

:::

## 注入

### $name

- 类型: `string`

当前页面名称

### $state

- 类型: `Record<string, any>`

框架生成的页面状态

::: tip

你可以考虑将部分自定义扩展的数据注入到此处

:::

- `$state.firstOpen`: 是否是第一个打开的页面

### 事件派发

事件派发相关，均为 [$Emitter](./emitter.md) 实例属性或方法

- `$on(type:string, handler: (event?:any) => void | Promise<void>): void`: 监听 `type` 事件

- `$emit(type:string, event?:any): void`: 同步触发 `type` 事件

- `$emitAsync(type:string, event?:any): Promise<void>`: 异步触发 `type` 事件并接受回调

- `$off(type:string, handler: (event?:any) => void | Promise<void>): Promise<void>`: 取消监听 `type` 的 `handler` 事件或全部事件 (当未传入 `handler`)

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

`$go` 的视图层代理方法，你需要在视图层使用 data-set 来绑定跳转配置:

- `data-url` 跳转到的页面简称或绝对路径，可带参数
- `data-before` 跳转前执行
- `data-after` 跳转后执行

::: tip

```html
<button catch:tap="$bindGo" data-url="play" data-before="onClickBefore">click go</button>
```

:::

### $bindRedirect

`$redirect` 的视图层代理方法，你需要在视图层使用 data-set 来绑定跳转配置:

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

`$switch` 的视图层代理方法，你需要在视图层使用 data-set 来绑定跳转配置:

- `data-url` 跳转到的页面简称或绝对路径，可带参数

  ::: warning

  由于 `wx.switchTab()` 不支持参数，参数仅用于触发对应页面的 `onNavigate` 生命周期

  :::

- `data-before` 跳转前执行
- `data-after` 跳转后执行

### $bindRelaunch

`$reLaunch` 的视图层代理方法，你需要在视图层使用 data-set 来绑定跳转配置:

- `data-url` 跳转到的页面简称或绝对路径，可带参数
- `data-before` 跳转前执行
- `data-after` 跳转后执行

### $bindBack

`$back` 的视图层代理方法，你需要在视图层使用 dataset 来绑定跳转配置:

- `data-delta` 回退层数
- `data-before` 跳转前执行
- `data-after` 跳转后执行

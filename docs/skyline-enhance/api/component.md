---
title: $Component
order: 5
---

- 类型: `$Component(options: ComponentOptions): string`

框架提供的组件注册器，与 `@mptool/enhance` 的 `$Component` 完全一致。

::: warning 前置条件

`$Component` 依赖全局配置：必须先在小程序入口（`app.js`）调用 `$Config`（在 `$App` 前），否则注册组件时会抛出 `MpError`。

:::

```ts
import { $Component } from "@mptool/skyline-enhance";

$Component({
  props: {
    // typed props
  },
  lifetimes: {
    attached() {
      // ...
    },
  },
});
```

## 注入

### $id

- 类型: `number`

当前组件的唯一标识。

### $refID

- 类型: `string`

当前组件上用于索引的 ref ID 值。

### $root

- 类型: `PageInstance`

当前组件所属的页面实例。

::: warning

只在 `attached` / `ready` 生命周期后生效。

:::

### $parent

- 类型: `PageInstance | ComponentInstance`

当前组件所属的父组件或父页面实例。

::: warning

只在 `attached` / `ready` 生命周期后生效。

:::

### $refs

- 类型: `Map<string, ComponentInstance>`

指定了 `ref` 的子组件实例 Map，可用于获取子组件引用。

::: tip 示例

```html
<custom-component binding="$" ref="customRef1" />
```

```js
$Component({
  lifetimes: {
    attached() {
      this.$refs.get("customRef1"); // 根据 ref 属性获取子组件的实例引用
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
  - `args`: 需要传递的参数

通过消息的方式调用父组件方法，即使父组件方法不存在也不会报错。

### $getRef

- 类型:

  ```ts
  function $getRef(id: number): TrivialComponentInstance | undefined;
  ```

- 参数:
  - `id`: 组件的唯一标识（`$id`）

根据组件 ID 获取组件实例引用。

### 事件派发

事件派发相关，均为 [Emitter](./emitter.md) 实例属性或方法：

- `$on(type: string, handler: (event?: any) => void | Promise<void>): void`: 监听 `type` 事件

- `$emit(type: string, event?: any): void`: 同步触发 `type` 事件

- `$emitAsync(type: string, event?: any): Promise<void>`: 异步触发 `type` 事件并接受回调

- `$off(type: string, handler?: (event?: any) => void | Promise<void>): void`: 取消监听 `type` 的 `handler` 事件或全部事件（当未传入 `handler`）

### $

父子组件沟通器，提供了通过 `binding="$"` 形式建立父子组件 / 页面与组件沟通的能力。

## 导航方法

组件实例同样挂载了导航方法（`$go` / `$redirect` / `$switch` / `$reLaunch` / `$back`）与视图层代理（`$bindGo` / `$bindRedirect` / `$bindSwitch` / `$bindRelaunch` / `$bindBack`），行为与 [$Page](./page.md#导航方法) 相同。

::: warning

Skyline 版本的组件实例**没有** `$preload` 方法（依赖 `onPreload` 生命周期）。

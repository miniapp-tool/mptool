---
title: Emitter
order: 1
---

- 类型:

  ```ts
  function Emitter<Events extends Record<EventType, unknown>>(
    all?: EventHandlerMap<Events>,
  ): EmitterInstance<Events>;
  ```

框架中使用的事件派发器。

## 创建实例

你需要通过调用 `Emitter()` 返回一个 Emitter 实例。

::: tip

`Emitter` 支持在调用时通过泛型传入一个 `Events` 对象来在 TypeScript 下进行类型推导。

例子

```ts
import { Emitter } from "@mptool/enhance";

type Events = {
  foo: string;
  bar?: number;
  baz: void;
};

const emitter = Emitter<Events>(); // inferred as EmitterInstance<Events>

emitter.on("foo", (e) => {}); // 'e' has inferred type 'string'

emitter.emit("foo", 42); // Error: Argument of type 'number' is not assignable to parameter of type 'string'. (2345)

emitter.on("baz"); // 'baz' should not contain event object
```

:::

## emitterInstance.all

- 类型: `all: EventHandlerMap<Events>`

事件名称到已注册处理函数的映射。

## emitterInstance.on

为给定类型注册事件处理程序。

- 类型:

  ```ts
  function on<Key extends keyof Events>(type: Key, handler: GenericEventHandler): void;
  ```

- 参数:
  - type: `string | symbol` 要侦听的事件类型，或使用 `'*'` 监听所有事件
  - handler: `Function` 响应给定事件时调用的函数

## emitterInstance.off

移除给定类型的事件处理程序。如果未传入 `handler`，则删除给定类型的所有处理程序。

- 类型:

  ```ts
  function off<Key extends keyof Events>(type: Key, handler?: GenericEventHandler): void;
  ```

- 参数:
  - type: `string | symbol` 要取消监听事件类型，或使用 `'*'` 取消所有事件
  - handler: `Function` 要删除的处理程序函数

## emitterInstance.emit

调用给定类型的所有处理函数。如果存在 `'*'`，则会在所有处理函数调用结束后调用它。

::: warning

不支持手动触发 `*`

:::

- 类型:

  ```ts
  function emit<Key extends keyof Events>(type: Key, event?: Events[Key]): void;
  ```

- 参数:
  - type: `string | symbol` 要取消监听事件类型，或使用 `'*'` 取消所有事件
  - event: `任何值`，推荐传入对象

## emitterInstance.emitAsync

异步调用给定类型的所有处理函数。如果存在 `'*'`，则会在所有处理函数调用结束后调用它。

全部处理函数调用完成后，触发自身回调

::: warning

不支持手动触发 `*`

:::

- 类型:

  ```ts
  function emitAsync<Key extends keyof Events>(type: Key, event?: Events[Key]): Promise<void>;
  ```

- 参数:
  - type: `string | symbol` 要取消监听事件类型，或使用 `'*'` 取消所有事件
  - event: `任何值`，推荐传入对象

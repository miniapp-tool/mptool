---
title: $Component
order: 5
---

- Type: `$Component(options: ComponentOptions): string`

Component registrar provided by the framework, fully consistent with `$Component` in `@mptool/enhance`.

::: warning Prerequisite

`$Component` depends on the global configuration: you must first call `$Config` in the mini-program entry (`app.js`), before `$App`; otherwise registering a component throws `MpError`.

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

## Injected properties

### $id

- Type: `number`

Unique identifier of the current component.

### $refID

- Type: `string`

The ref ID value used to index the current component.

### $root

- Type: `PageInstance`

Page instance that owns the current component.

::: warning

Only takes effect after the `attached` / `ready` lifecycles.

:::

### $parent

- Type: `PageInstance | ComponentInstance`

Parent component or parent page instance that owns the current component.

::: warning

Only takes effect after the `attached` / `ready` lifecycles.

:::

### $refs

- Type: `Map<string, ComponentInstance>`

Map of child component instances that have a `ref`; can be used to access child component references.

::: tip Example

```html
<custom-component binding="$" ref="customRef1" />
```

```js
$Component({
  lifetimes: {
    attached() {
      this.$refs.get("customRef1"); // get the child component instance by its ref attribute
    },
  },
});
```

:::

### $call

- Type:

  ```ts
  function $call(method: string, ...args: unknown[]): void;
  ```

- Parameters:
  - `method`: name of the method to call
  - `args`: arguments to pass

Call a parent component method through a message; no error is thrown even if the parent method does not exist.

### $getRef

- Type:

  ```ts
  function $getRef(id: number): TrivialComponentInstance | undefined;
  ```

- Parameters:
  - `id`: unique component identifier (`$id`)

Get a component instance by its component ID.

### Event dispatch

The event dispatch members are all instance properties or methods of [Emitter](/en/skyline-enhance/api/emitter/):

- `$on(type: string, handler: (event?: any) => void | Promise<void>): void`: listen for the `type` event

- `$emit(type: string, event?: any): void`: emit the `type` event synchronously

- `$emitAsync(type: string, event?: any): Promise<void>`: emit the `type` event asynchronously and accept a callback

- `$off(type: string, handler?: (event?: any) => void | Promise<void>): void`: remove the `handler` for `type`, or all handlers when `handler` is omitted

### $

Parent-child component communicator, providing the ability to establish communication between parent and child components, or between pages and components, through `binding="$"`.

## Navigation methods

Component instances also have navigation methods (`$go` / `$redirect` / `$switch` / `$reLaunch` / `$back`) and view-layer proxies (`$bindGo` / `$bindRedirect` / `$bindSwitch` / `$bindRelaunch` / `$bindBack`), with the same behavior as [$Page](/en/skyline-enhance/api/page/#navigation-methods).

::: warning

Component instances in the Skyline version do **not** have a `$preload` method (it depends on the `onPreload` lifecycle).

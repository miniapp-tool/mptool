---
title: $App
order: 3
---

App registrar provided by the framework, with the same behavior as `$App` in `@mptool/enhance`.

```ts
import { $App } from "@mptool/skyline-enhance";

$App({
  // your app options here
});
```

## Configuration

### onAwake

- Type:

  ```ts
  function onAwake(time: number): void | Promise<void>;
  ```

- Parameters:
  - `time`: duration of this sleep, in ms

Called when the mini-program is brought back from the background.

::: tip

`onAwake` relies on `onShow` and `onHide` to calculate the sleep duration. The framework wraps `onLaunch` / `onShow` / `onHide`; do not override these lifecycles after registration.

:::

## Injected properties

### Event dispatch

The event dispatch members are all instance properties or methods of [Emitter](/en/skyline-enhance/api/emitter/):

- `$on(type: string, handler: (event?: any) => void | Promise<void>): void`: listen for the `type` event

- `$emit(type: string, event?: any): void`: emit the `type` event synchronously

- `$emitAsync(type: string, event?: any): Promise<void>`: emit the `type` event asynchronously and accept a callback

- `$off(type: string, handler?: (event?: any) => void | Promise<void>): void`: remove the `handler` for `type`, or all handlers when `handler` is omitted

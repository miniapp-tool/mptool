---
title: $App
order: 3
---

## Configuration

### onAwake

- Type:

  ```ts
  function onAwake(time: number): void | Promise<void>;
  ```

- Parameters:
  - `time`: duration of this sleep, in ms

Called when the mini-program is brought back from the background.

## Injected properties

### Event dispatch

The event dispatch members are all instance properties or methods of [$Emitter](/en/enhance/api/emitter/).

- `$on(type:string, handler: (event?:any) => void | Promise<void>): void`: listen for the `type` event

- `$emit(type:string, event?:any): void`: emit the `type` event synchronously

- `$emitAsync(type:string, event?:any): Promise<void>`: emit the `type` event asynchronously and accept a callback

- `$off(type:string, handler?: (event?:any) => void | Promise<void>): void`: remove the `handler` for `type`, or all handlers when `handler` is omitted

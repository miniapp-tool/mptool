---
title: Emitter
order: 1
---

- Type:

  ```ts
  function Emitter<Events extends Record<EventType, unknown>>(
    all?: EventHandlerMap<Events>,
  ): EmitterInstance<Events>;
  ```

Event dispatcher used by the framework, fully consistent with `@mptool/enhance`.

## Creating an instance

Call `Emitter()` to get an Emitter instance.

::: tip

`Emitter` accepts an `Events` object as a generic argument so TypeScript can infer event types.

```ts
import { Emitter } from "@mptool/skyline-enhance";

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

- Type: `all: EventHandlerMap<Events>`

Map from event names to registered handlers.

## emitterInstance.on

Register an event handler for the given type.

- Type:

  ```ts
  function on<Key extends keyof Events>(type: Key, handler: GenericEventHandler): void;
  ```

- Parameters:
  - type: `string | symbol` event type to listen for, or `'*'` to listen for all events
  - handler: `Function` function called in response to the given event

## emitterInstance.off

Remove the event handler for the given type. If `handler` is omitted, all handlers for the given type are removed.

- Type:

  ```ts
  function off<Key extends keyof Events>(type: Key, handler?: GenericEventHandler): void;
  ```

- Parameters:
  - type: `string | symbol` event type to remove the listener for, or `'*'` to remove all listeners
  - handler: `Function` handler function to remove

## emitterInstance.emit

Invoke all handlers for the given type. If `'*'` exists, it is called after all other handlers have finished.

::: warning

Manually emitting `'*'` is not supported

:::

- Type:

  ```ts
  function emit<Key extends keyof Events>(type: Key, event?: Events[Key]): void;
  ```

- Parameters:
  - type: `string | symbol` event type to emit
  - event: `any value`; passing an object is recommended

## emitterInstance.emitAsync

Invoke all handlers for the given type asynchronously. If `'*'` exists, it is called after all other handlers have finished; after all handlers have completed, its own callback is triggered.

::: warning

Manually emitting `'*'` is not supported

:::

- Type:

  ```ts
  function emitAsync<Key extends keyof Events>(type: Key, event?: Events[Key]): Promise<void>;
  ```

- Parameters:
  - type: `string | symbol` event type to emit
  - event: `any value`; passing an object is recommended

::: tip Global instance

The framework exports a global `emitter` instance (`userEmitter`) that can be used for communication between any modules:

```ts
import { emitter } from "@mptool/skyline-enhance";

emitter.on("user-login", () => {});
emitter.emit("user-login");
```

:::

# 存储 API

## 非持久化数据

存入的数据只能取出一次，且仅在当次小程序启动中有效

### put

- 类型:

  ```ts
  function put<T = unknown>(key: string, data: unknown): void;
  ```

- 参数:

  - `key`: 存入的键值
  - `data`: 存入的数据，可为任意值。

存数据。该数据只能取出一次，且仅在当次小程序启动中有效。

### take

- 类型:

  ```ts
  function take<T = unknown>(key: string): T;
  ```

- 参数:

  - `path`: 传入的路径

取出在本次小程序启动后设置的数据。

当数据已经被取过一次后，后续返回 `undefined`。

## 可持久化数据

`get` 和 `set` 设置的数据可持久化，且可以设置过期时间。

::: warning

请注意由于微信小程序底层上的问题，自动清除只发生在下一次读取并发现已经失效时，如果你没有后续读取对应的存储，它们会一直保存 (即使已经过期)。

所以如果你使用了大量临时的键值去存入数据，你可能需要定期通过 `check` 手动检查并清除过期数据。

:::

### set

- 类型:

  ```ts
  function set<T = unknown>(
    key: string,
    value: T,
    expire: number | "keep" | "once" = "once"
  ): void;
  ```

- 参数:

  - `key`: 设置的键名

  - `value`: 存入的值

  - `expire`: 过期时间

    - `'once'`: 仅本次启动有效
    - `'keep'`: 表示保持上一次缓存时间
    - 数字: 代表过期时间，单位为毫秒

  ::: tip

  请注意，如果传入 `'keep'` 时，存储中不存在同名键值，则该值也不会被写入。

  :::

存储数据。

### setAsync

- 类型:

  ```ts
  function setAsync<T = unknown>(
    key: string,
    value: T,
    expire: number | "keep" | "once"
  ): Promise<WechatMiniprogram.GeneralCallbackResult | void>;
  ```

`set` 的异步版本，在设置大量数据时可考虑使用。

### get

- 类型:

  ```ts
  function get<T = unknown>(key: string): T;
  ```

- 参数:

  - `key`: 设置的键名

读取数据。

当数据已经过期或不存在时，返回 `undefined`。

### getAync

- 类型:

  ```ts
  function getAync<T = unknown>(key: string): Promise<T | undefined>;
  ```

- 参数:

  - `key`: 设置的键名

`get` 的异步版本，在读取大量数据避免阻塞线程时可考虑使用。

### remove

- 类型:

  ```ts
  function remove(key: string): void;
  ```

- 参数:

  - `key`: 删除的键名

删除某个键名对应的数据。

### removeAsync

- 类型:

  ```ts
  function removeAsync(
    key: string
  ): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- 参数:

  - `key`: 删除的键名

`remove` 的异步版本，在删除大量数据避免阻塞线程时可考虑使用。

### check

- 类型:

  ```ts
  function check(): void;
  ```

- 参数:

  - `key`: 删除的键名

检查所有数据暂存，并清理已过期数据。

### checkAsync

- 类型:

  ```ts
  function checkAsync(): Promise<void[]>;
  ```

- 参数:

  - `key`: 删除的键名

`check` 的异步版本

# Storage API

## Non-persistent data

Stored data can be taken only once and is valid only during the current mini-program launch

### put

- Type:

  ```ts
  function put<T = unknown>(key: string, data: unknown): void;
  ```

- Parameters:
  - `key`: the key to store
  - `data`: the data to store; can be any value.

Stores data. The data can be taken only once and is valid only during the current mini-program launch.

### take

- Type:

  ```ts
  function take<T = unknown>(key: string): T | undefined;
  ```

- Parameters:
  - `key`: the key to take

Takes data that was set during the current mini-program launch.

Once data has been taken, subsequent calls return `undefined`.

## Persistent data

Data set with `get` and `set` is persistent and can have an expiration time.

::: warning

Due to an issue in the underlying WeChat mini-program implementation, automatic cleanup happens only on the next read that discovers the data has expired. If there is no subsequent read of the corresponding storage, the data stays there forever (even after it expires).

Therefore, if you use a large number of temporary keys, you may need to manually check and clear expired data periodically with `check`.

:::

### set

- Type:

  ```ts
  function set<T = unknown>(key: string, value: T, expire: number | "keep" | "once" = 0): void;
  ```

- Parameters:
  - `key`: the key name to set

  - `value`: the value to store

  - `expire`: expiration time
    - `'once'`: valid only for the current launch
    - `'keep'`: keeps the previous cache time
    - number: the expiration time in milliseconds
    - 0: valid forever

  ::: tip

  Note that when `'keep'` is passed and no key with the same name exists in storage, the value is not written either.

  :::

Stores data.

### setAsync

- Type:

  ```ts
  function setAsync<T = unknown>(
    key: string,
    value: T,
    expire: number | "keep" | "once" = 0,
  ): Promise<WechatMiniprogram.GeneralCallbackResult | void>;
  ```

The asynchronous version of `set`; consider using it when setting large amounts of data.

### get

- Type:

  ```ts
  function get<T = unknown>(key: string): T | undefined;
  ```

- Parameters:
  - `key`: the key name to read

Reads data.

Returns `undefined` when the data has expired or does not exist.

### getAsync

- Type:

  ```ts
  function getAsync<T = unknown>(key: string): Promise<T | undefined>;
  ```

- Parameters:
  - `key`: the key name to read

The asynchronous version of `get`; consider using it when reading large amounts of data to avoid blocking the thread.

### remove

- Type:

  ```ts
  function remove(key: string): void;
  ```

- Parameters:
  - `key`: the key name to delete

Deletes the data for a key.

### removeAsync

- Type:

  ```ts
  function removeAsync(key: string): Promise<WechatMiniprogram.GeneralCallbackResult>;
  ```

- Parameters:
  - `key`: the key name to delete

The asynchronous version of `remove`; consider using it when deleting large amounts of data to avoid blocking the thread.

### check

- Type:

  ```ts
  function check(): void;
  ```

Checks all cached data and clears expired data.

### checkAsync

- Type:

  ```ts
  function checkAsync(): Promise<void>;
  ```

The asynchronous version of `check`

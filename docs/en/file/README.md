---
title: "@mptool/file"
icon: folder
---

## File API

::: tip

The framework automatically prepends `USER_DATA_PATH`, so you do not need to handle it yourself.

All `path` arguments are normalized first (leading `/` removed, repeated `/` collapsed, `.` and `..` resolved). If a path escapes the user directory through `..` (for example `../secret` or `a/../../b`), an `MpError` is thrown directly instead of treating the path as "file not found".

:::

### Utilities

- `dirname(path: string): string`

  Returns the directory part of a path

- `exists(path: string): boolean`

  Returns whether a file or directory exists. Returns `false` only when the file genuinely does not exist; other errors such as permission or I/O errors throw an `MpError` instead of being disguised as "not found".

  ::: tip

  Read APIs (`exists` / `ls` / `readFile` / `readJSON`) return the default value only when "the target does not exist"; all other errors throw an `MpError`.
  :::

- `isDir(path: string): boolean`

  Returns whether the path is a directory

- `isFile(path: string): boolean`

  Returns whether the path is a file

## Reading

- `ls(path: string): string[]`

  Lists all contents of a directory as an array

- `readFile(path: string, encoding?: string): string | ArrayBuffer | undefined`

  Reads and returns the contents of the file at the specified path. Returns `undefined` when the file does not exist.

  `encoding` is the file encoding; optional, defaults to `"utf-8"`

- `readJSON(path: string, encoding = 'utf-8'): any | undefined`

  Reads serializable file data and returns the parsed result.

  Returns `undefined` when the JSON file does not exist or parsing fails
  - `path`: the file path to read; it should not include the `.json` suffix
  - `encoding`: the file encoding; optional, defaults to `utf-8`

### Operations

- `mkdir(path: string, recursive = true): void`

  Creates a directory. The optional second argument, `recursive`, controls whether parent directories are created recursively; by default they are.

- `rm(path: string, type?: "dir" | "file"): void`

  Deletes the specified path.

  The optional second argument, `type`, can be `"dir"` or `"file"`; providing it improves deletion performance

- `writeFile(path: string, data: any, encoding?: string): void`

  Writes a file
  - `path`: the file path to write; the file or its parent directory is created automatically if missing
  - `data`: the data to write. Strings are written as-is (not JSON-serialized), `ArrayBuffer` / `TypedArray` / `DataView` are written as raw binary, and other data is JSON-serialized
  - `encoding`: file encoding option; optional, defaults to `binary` for binary data and `utf-8` otherwise

- `writeJSON(path: string, data: any, encoding = 'utf-8'): void`

  Writes serializable data as JSON
  - `path`: the file path to write; the parent directory is created automatically if missing
  - `data`: the data to write; it must be JSON-serializable
  - `encoding`: file encoding option; defaults to `utf-8`

  ::: warning

  `undefined`, functions, Symbols and circular references cannot be represented correctly by `JSON.stringify`; `writeJSON` throws an `MpError` instead of silently writing `undefined`/`null`.
  :::

- `saveFile(tempFilePath: string, path: string): string`

  Saves a temporary file to local file storage and returns the saved path provided by `wx.saveFileSync`; throws an `MpError` when saving fails.
  - `tempFilePath`: the temporary file path
  - `path`: the saved file path

- `saveOnlineFile(onlinePath: string, localPath: string): Promise<string> & { task: DownloadTask }`

  Saves an online file to the specified local location and returns the saved local file path; `task` on the return value is the underlying `DownloadTask`, so for large downloads you can call `task.abort()` to cancel or `task.onProgressUpdate()` to monitor progress.
  - `onlinePath`: the online file path
  - `localPath`: the local file path

  ::: tip

  The destination directory is created automatically.

  :::

- `unzip(zipFilePath: string, targetPath: string): Promise<void>`

  Extracts an archive
  - `zipFilePath`: the archive path to extract
  - `targetPath`: the destination directory

  ::: tip

  The destination directory is created automatically.

  :::

## Storage API

### Put and take

`put` and `take` can store any data, but stored data can be taken only once and is valid only during the current mini-program launch.

They use separate in-memory storage (the exported `storage` Map) that is not connected to the persistent storage of `set` / `get` below. To ensure there are no leftovers where a value has been removed but can still be taken, `remove` / `removeAsync` / `check` / `checkAsync` also clear the in-memory value with the same name.

::: tip

For performance, and because mini-programs handle `Function` specially, stored data is not deep-copied.

:::

- `put<T = unknown>(key: string, data: T): void`: stores data.
- `take<T = unknown>(key: string): T | undefined`: takes data

  ::: tip

  Once data has been taken, subsequent calls return `undefined`.

  :::

### Persistent data

Data set with `get` and `set` is persistent and can have an expiration time.

::: warning

Due to an issue in the underlying WeChat mini-program implementation, automatic cleanup happens only on the next read that discovers the data has expired. If there is no subsequent read of the corresponding storage, the data stays there forever (even after it expires).

Therefore, if you use a large number of temporary keys, you may need to manually check and clear expired data periodically with `check`.

:::

- `set(key: string, value: any, expire?: number | 'once' | 'keep' = 0): void`

  Sets data synchronously.
  - `key`: the key name to set
  - `value`: the value to store
  - `expire`: expiration time; optional, defaults to `0`
    - `0`: default, valid forever
    - `'once'`: valid only for the current launch
    - `'keep'`: keeps the previous expiration time
    - number: validity period in milliseconds

  ::: tip

  Note that when `'keep'` is passed and no key with the same name exists in storage, the value is not written either.

  :::

  ::: warning

  `'keep'` is implemented as "read the old expiration time, then write the new value" and is not atomic. If other writes to the same key happen concurrently (especially `setAsync` writes that have not completed), the retained expiration time may not be the one from the latest write. Do not rely on the expiration time of `'keep'` in concurrent scenarios.

  :::

  ::: warning

  If the write fails (for example because the storage quota is full), `set` throws an `MpError` whose `message` contains the `errMsg` returned by WeChat. Callers should use `try/catch`.

  :::

- `setAsync(key: string, value: any, expire?: number | 'once' | 'keep' = 0): Promise<WechatMiniprogram.GeneralCallbackResult | void>`

  The asynchronous version of `set`; consider using it when setting large amounts of data. Returns a Promise.

  `expire` accepts the same values as `set` and defaults to `0` (valid forever).

  When the write fails, the returned Promise rejects with an `MpError` (consistent with `set` throwing); callers should use `try/catch` or `.catch()`.

- `get<T = unknown>(key: string): T | undefined`

  Reads and returns data synchronously.

  Returns `undefined` when the data has expired.

  `'once'` data is valid only for the current launch; a numeric expiration time is calculated from the write time.
  - `key`: the key name to read

- `getAsync<T = unknown>(key: string): Promise<T | undefined>`

  The asynchronous version of `get`; consider using it when reading large amounts of data to avoid blocking the thread. Returns a Promise.
  - `key`: the key name to read

  It resolves to `undefined` only when the key does not exist (`getStorage:fail data not found` from WeChat); other read errors (permission, corrupted storage, etc.) reject with an `MpError` and are not treated as "no cache".

- `remove(key: string): void`

  Deletes data synchronously.
  - `key`: the key name to delete

- `removeAsync(key: string): Promise<void>`

  Deletes data asynchronously. Returns a Promise.
  - `key`: the key name to delete

- `check(): void`

  Checks and clears expired data synchronously.

- `checkAsync(): Promise<void>`

  Checks and clears expired data asynchronously. Returns a Promise.

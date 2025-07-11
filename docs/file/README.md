---
title: "@mptool/file"
icon: folder
---

## 文件 API

::: tip

请注意，框架会自动帮你添加 `USER_DATA_PATH` 作为前缀，因此你无需关注它。

:::

### 工具类

- `dirname(path: string): string`

  返回路径的文件夹部分

- `exists(path: string): boolean`

  返回布尔值，代表文件或文件夹是否存在

- `isDir(path: string): boolean`

  返回布尔值，代表路径是否是文件夹

- `isFile(path: string): boolean`

  返回布尔值，代表路径是否是文件

## 读取类

- `ls(path: string): string[]`

  以数组形式列出目录下所有内容

- `readFile(path: string, encoding?: string): string | ArrayBuffer | undefined`

  读取指定路径的文件内容并返回。当文件不存在时，返回 `undefined`。

  `encoding` 为文件的编码格式，可选，当文件为文本文件时默认 `"utf-8"`，为二进制文件时默认为 `'buffer'`

- `readJSON(path: string, encoding = 'utf-8'): any | undefined`

  读取可序列化文件数据并返回解析结果。

  当 JSON 文件不存在或解析失败时，返回 `undefined`
  - `path`: 读取的文件路径，不应含有 `.json` 后缀
  - `encoding`: 文件的编码格式，可选，默认 `utf-8`

### 操作类

- `mkdir(path: string, recursive = false): void`

  创建目录。第二个参数 `recursive`可选，代表是否递归父目录。

- `rm(path: string, type?: "dir" | "file"): void`

  删除指定路径。

  第二个参数 `type` 是可选的，可填入 `"dir"` 或 `"file"`，填入可提升删除性能

- `writeFile(path: string, data: any, encoding?: string): void`

  写入文件
  - `path`: 待写入的文件路径，若文件或其父文件夹不存在会自动创建
  - `data`: 待写入的数据，可接受任意可序列化的数据或 Buffer
  - `encoding`: 文件编码选项，可选，默认 `utf-8` (数据) 或 `binary` (Buffer)

- `writeJSON(path: string, data: any, encoding = 'utf-8'): void`

  写入可序列化数据为 JSON
  - `path`: 写入文件的路径，若父文件夹不存在会自动创建
  - `data`: 写入文件的数据，可接受任意可序列化的数据
  - `encoding`: 文件编码选项，默认 `utf-8`

- `saveFile(tempFilePath: string, path: string): void`

  将缓存文件保存到本地文件存储。
  - `tempFilePath`: 缓存文件路径
  - `path`: 保存文件路径

- `saveOnlineFile(onlinePath: string, localPath: string): Promise<void>`

  将在线文件保存到本地指定位置
  - `onlinePath`: 在线文件路径
  - `localPath`: 本地文件路径

  ::: tip

  保存目录会自动创建。

  :::

- `unzip(zipFilePath: string, targetPath: string): Promise<void>`

  解压文件
  - `zipFilePath`: 待解压的压缩文件路径
  - `targetPath`: 解压到的目录

  ::: tip

  解压目录会自动创建。

  :::

## 存储 API

### 存取

`put` 和 `take` 可以存入任何数据，但存入的数据只能取出一次，且仅在当次小程序启动中有效。

::: tip

为了保证性能，以及由于小程序对 `Function` 进行了特殊处理，我们不会对存入的数据进行深拷贝。

:::

- `put<T = unknown>(key: string, data: T): void`: 存数据。
- `take<T = unknown>(key: string): T | undefined`: 取数据

  ::: tip

  当数据已经被取过一次后，后续返回 `undefined`。

  :::

### 可持久化数据

`get` 和 `set` 设置的数据可持久化，且可以设置过期时间。

::: warning

请注意由于微信小程序底层上的问题，自动清除只发生在下一次读取并发现已经失效时，如果你没有后续读取对应的存储，它们会一直保存 (即使已经过期)。

所以如果你使用了大量临时的键值去存入数据，你可能需要定期通过 `check` 手动检查并清除过期数据。

:::

- `set(key: string, value: any, expire?: number | 'once' | 'keep' = 'once'): void`

  同步设置数据。
  - `key`: 设置的键名
  - `value`: 存入的值
  - `expire`: 过期时间，可选，默认为 `'once'`
    - `'once'`: 默认，表示仅本次启动有效
    - `'keep'`: 表示保持上一次有效时间
    - 数字: 已毫秒为单位的有效时间
    - 0: 永久有效

  ::: tip

  请注意，如果传入 `'keep'` 时，存储中不存在同名键值，则该值也不会被写入。

  :::

- `setAsync(key: string, value: any, expire?: number | 'once' | 'keep' = 'once'): Promise<void>`

  `set` 的异步版本，在设置大量数据时可考虑使用，返回一个 Promise。

- `get<T = unknown>(key: string): T | undefined`

  同步读取数据并返回。

  当数据已经过期时，返回 `undefined`。
  - `key`: 设置的键名

- `getAsync<T = unknown>(key: string): Promise<T | undefined>`

  `get` 的异步版本，在读取大量数据避免阻塞线程时可考虑使用，返回一个 Promise。
  - `key`: 设置的键名

- `remove(key: string): void`

  同步删除数据。
  - `key`: 删除的键名

- `removeAsync(key: string): Promise<void>`

  异步删除数据，返回一个 Promise。
  - `key`: 删除的键名

- `check(): void`

  同步检查并清理过期数据。

- `checkAsync(): Promise<void>`

  异步检查并清理过期数据，返回一个 Promise。

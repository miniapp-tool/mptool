# 文件 API

::: tip

所有路径以绝对路径开头即可，框架会自动帮你添加 `USER_DATA_PATH`。

:::

## dirname

- 类型:

  ```ts
  function dirname(path: string): string;
  ```

- 参数:
  - `path`: 传入的路径

获得路径的文件夹部分

## exists

- 类型:

  ```ts
  function exists(path: string): boolean;
  ```

- 参数:
  - `path`: 传入的路径

判断文件或文件夹是否存在

## isDir

- 类型:

  ```ts
  function isDir(path: string): boolean;
  ```

- 参数:
  - `path`: 传入的路径

判断路径是否是文件夹

## isFile

- 类型:

  ```ts
  function isFile(path: string): boolean;
  ```

- 参数:
  - `path`: 传入的路径

判断路径是否是文件

## ls

- 类型:

  ```ts
  function ls(path: string): string[];
  ```

- 参数:
  - `path`: 传入的路径

列出目录下内容

## readFile

- 类型:

  ```ts
  function readFile<T = unknown>(path: string, encoding = "utf-8"): T | undefined;
  ```

- 参数:
  - `path`: 所读取文件的路径

  - `encoding`: 文件的编码格式，默认 `utf-8`

- 返回值:
  - 当文件不存在时，返回 `undefined`

读取文件内容

## readJSON

- 类型:

  ```ts
  function readJSON<T = unknown>(path: string, encoding = "utf-8"): T | undefined;
  ```

- 参数:
  - `path`: 所读取文件的路径，实际读取会自动添加 `.json` 后缀名

  - `encoding`: 文件的编码格式，默认 `utf-8`

- 返回值:
  - 当 JSON 文件不存在或解析失败时，返回 `undefined`

读取 JSON 文件内容并解析。

## mkdir

- 类型:

  ```ts
  function mkdir(path: string, recursive = true): void;
  ```

- 参数:
  - `path`: 待创建的文件夹

  - `recursive`: 是否递归创建可能不存在的父目录

创建目录

## rm

- 类型:

  ```ts
  function rm(path: string, type?: "dir" | "file"): void;
  ```

- 参数:
  - `path`: 待删除内容的路径

  - `type`: 所删除内容的类型，可选，传入明确的 `type` 可提升性能

删除文件或文件夹

## writeFile

- 类型:

  ```ts
  function writeFile(path: string, data: T, encoding = "utf-8"): void;
  ```

- 参数:
  - `path`: 待写入的文件路径，若文件或其父文件夹不存在会自动创建

  - `data`: 写入文件的数据，可接受任意可序列化的数据或
  - `encoding`: 文件编码选项，默认 `utf-8` (数据) 或 `binary` (Buffer)

向指定文件写入内容

## writeJSON

- 类型:

  ```ts
  function writeJSON(path: string, data: T, encoding = "utf-8"): void;
  ```

- 参数:
  - `path`: 带写入文件的路径，若文件和父文件夹不存在会自动创建，实际写入会自动添加 `.json` 后缀名
  - `data`: 写入文件的数据，可接受任意可序列化的数据
  - `encoding`: 文件编码选项，默认 `utf-8` (数据)

向指定文件写入可序列化数据

## saveFile

- 类型:

  ```ts
  function saveFile(tempFilePath: string, path: string): void;
  ```

- 参数:
  - `tempFilePath`: 缓存文件路径
  - `path`: 保存文件路径

将缓存文件保存到本地文件存储。

## saveOnlineFile

- 类型:

  ```ts
  function saveOnlineFile(onlinePath: string, targetPath: string): Promise<void>;
  ```

- 参数:
  - `onlinePath`: 在线文件路径
  - `targetPath`: 目标文件路径

- 返回值:

  当保存失败时，`err` 为文字格式的失败消息或数字格式的非 `200` 状态码

将在线文件保存到本地指定位置 (会自动创建本地保存文件夹与文件)。

## unzip

- 类型:

  ```ts
  function unzip(zipFilePath: string, targetPath: string): Promise<void>;
  ```

- 参数:
  - `zipFilePath`: 待解压的压缩文件路径
  - `targetPath`: 解压到的目录 (你无需关注它是否已经存在)

- 返回值:

  当解压失败时，`err` 为文字格式的失败消息

将缓存文件保存到本地文件存储。

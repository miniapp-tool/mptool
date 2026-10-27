# File API

::: tip

All paths can simply start with an absolute path; the framework automatically prepends `USER_DATA_PATH`.

:::

## dirname

- Type:

  ```ts
  function dirname(path: string): string;
  ```

- Parameters:
  - `path`: the input path

Returns the directory part of the path

## exists

- Type:

  ```ts
  function exists(path: string): boolean;
  ```

- Parameters:
  - `path`: the input path

Checks whether a file or directory exists

## isDir

- Type:

  ```ts
  function isDir(path: string): boolean;
  ```

- Parameters:
  - `path`: the input path

Checks whether the path is a directory

## isFile

- Type:

  ```ts
  function isFile(path: string): boolean;
  ```

- Parameters:
  - `path`: the input path

Checks whether the path is a file

## ls

- Type:

  ```ts
  function ls(path: string): string[];
  ```

- Parameters:
  - `path`: the input path

Lists the contents of a directory

## readFile

- Type:

  ```ts
  function readFile<T = unknown>(path: string, encoding = "utf-8"): T | undefined;
  ```

- Parameters:
  - `path`: the path of the file to read

  - `encoding`: the file encoding; defaults to `utf-8`

- Returns:
  - `undefined` when the file does not exist

Reads file contents

## readJSON

- Type:

  ```ts
  function readJSON<T = unknown>(path: string, encoding = "utf-8"): T | undefined;
  ```

- Parameters:
  - `path`: the path of the file to read; `.json` is appended automatically when reading

  - `encoding`: the file encoding; defaults to `utf-8`

- Returns:
  - `undefined` when the JSON file does not exist or parsing fails

Reads and parses JSON file contents.

## mkdir

- Type:

  ```ts
  function mkdir(path: string, recursive = true): void;
  ```

- Parameters:
  - `path`: the directory to create

  - `recursive`: whether to recursively create missing parent directories

Creates a directory

## rm

- Type:

  ```ts
  function rm(path: string, type?: "dir" | "file"): void;
  ```

- Parameters:
  - `path`: the path of the content to delete

  - `type`: the type of content to delete; optional, specifying it improves performance

Deletes a file or directory

## writeFile

- Type:

  ```ts
  function writeFile(path: string, data: T, encoding = "utf-8"): void;
  ```

- Parameters:
  - `path`: the file path to write; the file or its parent directory is created automatically if missing

  - `data`: the data to write; accepts any serializable data or binary data
  - `encoding`: file encoding option; defaults to `utf-8` (data) or `binary` (Buffer)

Writes content to the specified file

## writeJSON

- Type:

  ```ts
  function writeJSON(path: string, data: T, encoding = "utf-8"): void;
  ```

- Parameters:
  - `path`: the file path to write; the file and parent directories are created automatically if missing, and `.json` is appended automatically when writing
  - `data`: the data to write; accepts any serializable data
  - `encoding`: file encoding option; defaults to `utf-8` (data)

Writes serializable data to the specified file

## saveFile

- Type:

  ```ts
  function saveFile(tempFilePath: string, path: string): void;
  ```

- Parameters:
  - `tempFilePath`: the temporary file path
  - `path`: the saved file path

Saves a temporary file to local file storage.

## saveOnlineFile

- Type:

  ```ts
  function saveOnlineFile(onlinePath: string, localPath: string): Promise<string>;
  ```

- Parameters:
  - `onlinePath`: the online file path
  - `localPath`: the local save path

- Returns:
  - `Promise<string>`: the local file path

Saves an online file to the specified local location (the local directory and file are created automatically).

## unzip

- Type:

  ```ts
  function unzip(zipFilePath: string, targetPath: string): Promise<void>;
  ```

- Parameters:
  - `zipFilePath`: the archive path to extract
  - `targetPath`: the destination directory (you do not need to care whether it already exists)

- Returns:

  If extraction fails, the returned `Promise` rejects with an `MpError`

Extracts an archive to the specified directory.

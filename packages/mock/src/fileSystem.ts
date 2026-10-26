// oxlint-disable no-bitwise -- byte-level encoding helpers
// oxlint-disable no-undefined -- file-system payloads legitimately carry undefined
// oxlint-disable typescript/no-non-null-assertion -- byte reads are bounds-checked by the loops
// oxlint-disable class-methods-use-this -- path / node helpers are grouped on the class for readability
// oxlint-disable max-lines -- one self-contained FileSystemManager implementation
// oxlint-disable typescript/no-unnecessary-type-assertion -- wx option objects are loosely typed
// oxlint-disable typescript/no-unnecessary-type-conversion -- defensive coercion of wx inputs

import { callCallback } from "./ui.js";

/** One in-memory file-system node. File contents are always stored as raw bytes. */
export interface MockFileNode {
  type: "file" | "dir";
  data?: Uint8Array;
  mtime: number;
}

/** Internal snapshot of the in-memory file system; used by `mockWx` scopes. */
export type FileSystemSnapshot = Map<string, MockFileNode>;

/** WeChat file-system error codes (official table). */
const ERR_CODE = {
  badFd: 1300009,
  base64: 1300203,
  dataEmpty: 1301002,
  dirNotEmpty: 1300066,
  exists: 1301005,
  illegalDir: 1301003,
  invalidArg: 1300022,
  isDir: 1300021,
  notDir: 1300020,
  noent: 1300002,
  permission: 1300014,
  tooLarge: 1300202,
  unzipEntry: 1301103,
  unzipFail: 1301104,
  unzipOpen: 1301102,
  tempNotExist: 1301112,
} as const;

const ERR_MESSAGE = {
  badFd: "bad file descriptor",
  base64: "base64 encode error",
  dataEmpty: "data to write is empty",
  dirNotEmpty: "directory not empty",
  exists: "file already exists",
  illegalDir: "illegal operation on a directory",
  invalidArg: "Invalid argument",
  isDir: "Is a directory",
  notDir: "not a directory",
  noent: "no such file or directory",
  permission: "permission denied",
  tooLarge: "the maximum size of the file storage limit is exceeded",
  unzipEntry: "unzip entry fail",
  unzipFail: "unzip fail",
  unzipOpen: "unzip open file fail",
  tempNotExist: "tempFilePath file not exist",
} as const;

interface FsError extends Error {
  errMsg: string;
  errCode: number;
  errno: number;
}

const createFsError = (api: string, message: string, errCode: number, path?: string): FsError => {
  const suffix = path ? ` ${path}` : "";
  const error = new Error(`${api}:fail ${message}${suffix}`) as FsError;

  error.errMsg = error.message;
  error.errCode = errCode;
  error.errno = errCode;

  return error;
};

const getErrMsg = (error: unknown): string =>
  error instanceof Error && "errMsg" in error
    ? String((error as { errMsg: unknown }).errMsg)
    : String(error);

const getErrCode = (error: unknown): number =>
  typeof error === "object" && error != null && "errCode" in error
    ? Number((error as { errCode: unknown }).errCode)
    : 1300005;

/** Async wrappers reuse sync helpers; keep the async API name in the failure message. */
const normalizeAsyncMessage = (api: string, message: string): string =>
  message.startsWith(`${api}:fail`)
    ? message
    : message.replace(/^[A-Za-z0-9]+:fail/u, `${api}:fail`);

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const DIR_SIZE = 128;
const getUserRoot = (): string => wx.env.USER_DATA_PATH.replace(/\/+$/u, "");

/** Encoding names supported by `FileSystemManager.readFile(Sync)` / `writeFile(Sync)`. */
type FileEncoding = string;

const normalizeEncoding = (encoding?: string): string => (encoding ?? "utf-8").toLowerCase();

const HEX = "0123456789abcdef";
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const utf8Encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const utf8Decode = (bytes: Uint8Array): string => new TextDecoder("utf-8").decode(bytes);

const latin1Encode = (text: string): Uint8Array => {
  const bytes = new Uint8Array(text.length);

  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff;

  return bytes;
};

const latin1Decode = (bytes: Uint8Array): string => {
  let text = "";

  for (const byte of bytes) text += String.fromCharCode(byte);

  return text;
};

const utf16Encode = (text: string): Uint8Array => {
  const bytes = new Uint8Array(text.length * 2);

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }

  return bytes;
};

const utf16Decode = (bytes: Uint8Array): string => {
  let text = "";

  for (let index = 0; index + 1 < bytes.length; index += 2)
    text += String.fromCharCode(bytes[index]! | (bytes[index + 1]! << 8));

  return text;
};

const hexEncode = (bytes: Uint8Array): string => {
  let text = "";

  for (const byte of bytes) text += `${HEX[byte >> 4]}${HEX[byte & 0x0f]}`;

  return text;
};

const hexDecode = (text: string): Uint8Array => {
  const clean = text.trim();

  if (clean.length % 2 !== 0)
    throw createFsError("writeFileSync", ERR_MESSAGE.invalidArg, ERR_CODE.invalidArg);

  const bytes = new Uint8Array(clean.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    const value = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);

    if (Number.isNaN(value))
      throw createFsError("writeFileSync", ERR_MESSAGE.invalidArg, ERR_CODE.invalidArg);

    bytes[index] = value;
  }

  return bytes;
};

const base64Encode = (bytes: Uint8Array): string => {
  let text = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    text += B64[first >> 2];
    text += B64[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    text += second === undefined ? "=" : B64[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    text += third === undefined ? "=" : B64[third & 0x3f];
  }

  return text;
};

const base64Decode = (text: string): Uint8Array => {
  let clean = text;

  while (clean.endsWith("=")) clean = clean.slice(0, -1);

  if (clean.length % 4 === 1)
    throw createFsError("writeFileSync", ERR_MESSAGE.base64, ERR_CODE.base64);

  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (const char of clean) {
    const value = B64.indexOf(char);

    if (value === -1) throw createFsError("writeFileSync", ERR_MESSAGE.base64, ERR_CODE.base64);

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }

  return bytes;
};

const encodeText = (text: string, encoding?: string): Uint8Array => {
  switch (normalizeEncoding(encoding)) {
    case "base64": {
      return base64Decode(text);
    }

    case "hex": {
      return hexDecode(text);
    }

    case "binary":
    case "latin1":
    case "ascii": {
      return latin1Encode(text);
    }

    case "ucs2":
    case "ucs-2":
    case "utf16le":
    case "utf-16le": {
      return utf16Encode(text);
    }

    default: {
      return utf8Encode(text);
    }
  }
};

const decodeBytes = (bytes: Uint8Array, encoding?: string): string => {
  switch (normalizeEncoding(encoding)) {
    case "base64": {
      return base64Encode(bytes);
    }

    case "hex": {
      return hexEncode(bytes);
    }

    case "binary":
    case "latin1":
    case "ascii": {
      return latin1Decode(bytes);
    }

    case "ucs2":
    case "ucs-2":
    case "utf16le":
    case "utf-16le": {
      return utf16Decode(bytes);
    }

    case "utf-8":
    case "utf8": {
      return utf8Decode(bytes);
    }

    default: {
      throw createFsError(
        "readFileSync",
        `Unknown encoding: ${String(encoding)}`,
        ERR_CODE.invalidArg,
      );
    }
  }
};

const toBytes = (data: unknown, encoding?: string): Uint8Array => {
  if (typeof data === "string") return encodeText(data, encoding);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data))
    return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));

  return utf8Encode(String(data));
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

interface CallbackOption {
  complete?: (result: Record<string, unknown>) => void;
  fail?: (result: Record<string, unknown>) => void;
  success?: (result: Record<string, unknown>) => void;
}

/** Run one async file-system operation and deliver its callback(s). */
const runAsync = (
  api: string,
  option: unknown,
  task: () => Record<string, unknown> | void,
): void => {
  const callbacks = option as CallbackOption | undefined;

  setTimeout(() => {
    try {
      const result = task();
      const successResult = { ...result, errMsg: `${api}:ok` };

      callbacks?.success?.(successResult);
      callbacks?.complete?.({ errMsg: `${api}:ok` });
    } catch (err) {
      const errMsg = normalizeAsyncMessage(api, getErrMsg(err));
      const errCode = getErrCode(err);
      const errno =
        typeof err === "object" && err != null && "errno" in err
          ? Number((err as { errno: unknown }).errno)
          : errCode;

      callbacks?.fail?.({ errCode, errMsg, errno });
      callbacks?.complete?.({ errCode, errMsg, errno });
    }
  }, 0);
};

/** Placeholder digest used by `getFileInfo`; tests should not depend on real hashes. */
const simpleDigest = (bytes: Uint8Array): string => {
  let hash = 0x811c9dc5;

  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;

  return hash.toString(16).padStart(8, "0");
};

/**
 * Minimal in-memory implementation of the WeChat `FileSystemManager`.
 *
 * All paths are resolved against `wx.env.USER_DATA_PATH`; `wxfile://` / `http://` schemes are
 * accepted (`usr` maps to the user directory, `tmp` to the temporary directory) and `..` segments
 * that would escape the sandbox are rejected with `1300014`.
 */
export class FileSystemManager {
  private readonly files = new Map<string, MockFileNode>();
  private readonly openFiles = new Map<
    string,
    { path: string; position: number; writable: boolean }
  >();
  private fdSeq = 0;

  // ---- path / node helpers ----

  private resolve(input: string, api: string): string {
    let path = String(input ?? "").replace(/\\/gu, "/");
    const scheme = /^(?:wxfile|http|https):\/\/([^/]*)(\/.*)?$/u.exec(path);

    if (scheme) {
      // `([^/]*)` always participates in the match, so the host (capture group 1) is always a string.
      const [, host] = scheme;
      const rest = scheme[2] ?? "/";

      if (host === "usr") path = rest;
      else if (host === "tmp") path = `/tmp${rest}`;
      else path = rest;
    }

    const root = getUserRoot();

    if (root && path.startsWith(`${root}/`)) path = path.slice(root.length + 1);

    const stack: string[] = [];

    for (const segment of path.split("/")) {
      if (segment === "" || segment === ".") continue;

      if (segment === "..") {
        if (stack.length === 0)
          throw createFsError(api, `${ERR_MESSAGE.permission}, open`, ERR_CODE.permission, input);

        stack.pop();
        continue;
      }

      stack.push(segment);
    }

    return stack.join("/");
  }

  private getNode(path: string): MockFileNode | undefined {
    return path === "" ? { type: "dir", mtime: 0 } : this.files.get(path);
  }

  private getFileNode(path: string, api: string, input: string): MockFileNode {
    const node = this.getNode(path);

    if (!node) throw createFsError(api, ERR_MESSAGE.noent, ERR_CODE.noent, input);
    if (node.type === "dir")
      throw createFsError(api, ERR_MESSAGE.illegalDir, ERR_CODE.illegalDir, input);

    return node;
  }

  private requireParentDir(path: string, api: string, input: string): void {
    const index = path.lastIndexOf("/");
    const parent = index === -1 ? "" : path.slice(0, index);

    if (parent === "") return;

    const node = this.files.get(parent);

    if (!node) throw createFsError(api, ERR_MESSAGE.noent, ERR_CODE.noent, input);
    if (node.type !== "dir") throw createFsError(api, ERR_MESSAGE.notDir, ERR_CODE.notDir, input);
  }

  private setFile(path: string, bytes: Uint8Array): void {
    this.files.set(path, { data: bytes, mtime: Date.now(), type: "file" });
  }

  private childrenOf(dir: string): string[] {
    const names: string[] = [];
    const prefix = dir === "" ? "" : `${dir}/`;

    for (const key of this.files.keys()) {
      if (key === dir || !key.startsWith(prefix)) continue;

      // `split` always yields at least one element, so the first segment is always defined.
      const [name] = key.slice(prefix.length).split("/");

      if (name && !names.includes(name)) names.push(name);
    }

    return names;
  }

  private removeSubtree(path: string): void {
    this.files.delete(path);

    // oxlint-disable-next-line unicorn/no-useless-spread -- deleting while iterating
    for (const key of [...this.files.keys()])
      if (key.startsWith(`${path}/`)) this.files.delete(key);
  }

  private createStats(node: MockFileNode): Stats {
    const isDirectory = node.type === "dir";

    return {
      isDirectory: (): boolean => isDirectory,
      isFile: (): boolean => !isDirectory,
      lastAccessedTime: node.mtime,
      lastModifiedTime: node.mtime,
      mode: isDirectory ? 16877 : 33188,
      size: isDirectory ? DIR_SIZE : (node.data?.length ?? 0),
    };
  }

  private insertFd(path: string, writable: boolean): string {
    this.fdSeq += 1;

    const fd = String(this.fdSeq);

    this.openFiles.set(fd, { path, position: 0, writable });

    return fd;
  }

  private getFd(fd: string): { path: string; position: number; writable: boolean } {
    const entry = this.openFiles.get(String(fd));

    if (!entry) throw createFsError("read", ERR_MESSAGE.badFd, ERR_CODE.badFd, String(fd));

    return entry;
  }

  // ---- sync methods (20) ----

  accessSync(path: string): void {
    const target = this.resolve(path, "accessSync");

    if (!this.getNode(target)) {
      throw createFsError(
        "accessSync",
        `${ERR_MESSAGE.noent}, access`,
        ERR_CODE.noent,
        `"${path}"`,
      );
    }
  }

  appendFileSync(filePath: string, data: string | ArrayBuffer, encoding?: FileEncoding): void {
    const path = this.resolve(filePath, "appendFileSync");
    const existing = this.getNode(path);
    const appended = toBytes(data, encoding);

    if (existing?.type === "dir")
      throw createFsError("appendFileSync", ERR_MESSAGE.illegalDir, ERR_CODE.illegalDir, filePath);

    this.requireParentDir(path, "appendFileSync", filePath);

    const base = existing?.type === "file" ? (existing.data ?? new Uint8Array()) : new Uint8Array();
    const next = new Uint8Array(base.length + appended.length);

    next.set(base);
    next.set(appended, base.length);
    this.assertFileSize(next, "appendFileSync", filePath);
    this.setFile(path, next);
  }

  closeSync(option: { fd: string }): void {
    if (!this.openFiles.delete(String(option?.fd)))
      throw createFsError("closeSync", ERR_MESSAGE.badFd, ERR_CODE.badFd, String(option?.fd));
  }

  copyFileSync(srcPath: string, destPath: string): void {
    const source = this.getFileNode(this.resolve(srcPath, "copyFileSync"), "copyFileSync", srcPath);
    const target = this.resolve(destPath, "copyFileSync");
    const existing = this.getNode(target);

    if (existing?.type === "dir")
      throw createFsError("copyFileSync", ERR_MESSAGE.illegalDir, ERR_CODE.illegalDir, destPath);

    this.requireParentDir(target, "copyFileSync", destPath);
    this.setFile(target, new Uint8Array(source.data ?? new Uint8Array()));
  }

  fstatSync(option: { fd: string }): Stats {
    const { path } = this.getFd(option?.fd);

    return this.createStats(this.getFileNode(path, "fstatSync", path));
  }

  ftruncateSync(option: { fd: string; length: number }): void {
    const entry = this.getFd(option?.fd);
    const node = this.getFileNode(entry.path, "ftruncateSync", entry.path);

    this.setFile(
      entry.path,
      this.resize(node.data ?? new Uint8Array(), option.length ?? 0, "ftruncateSync", entry.path),
    );
  }

  mkdirSync(dirPath: string, recursive = false): void {
    const path = this.resolve(dirPath, "mkdirSync");

    if (path === "") return;

    const existing = this.files.get(path);

    if (existing) {
      if (existing.type === "dir" && recursive) return;

      throw createFsError("mkdirSync", ERR_MESSAGE.exists, ERR_CODE.exists, dirPath);
    }

    if (recursive) {
      let index = 0;

      while (index >= 0) {
        index = path.indexOf("/", index + 1);

        const parent = index < 0 ? path : path.slice(0, index);
        const node = this.files.get(parent);

        if (node?.type === "file")
          throw createFsError("mkdirSync", ERR_MESSAGE.notDir, ERR_CODE.notDir, dirPath);

        if (!node) this.files.set(parent, { mtime: Date.now(), type: "dir" });
      }
    } else {
      this.requireParentDir(path, "mkdirSync", dirPath);
    }

    this.files.set(path, { mtime: Date.now(), type: "dir" });
  }

  openSync(option: { filePath: string; flag?: string }): string {
    const path = this.resolve(option?.filePath, "openSync");
    const flag = option?.flag ?? "r";
    const existing = this.getNode(path);
    const create = flag.includes("w") || flag.includes("a");
    const truncate = flag.startsWith("w");

    if (existing?.type === "dir") {
      throw createFsError(
        "openSync",
        ERR_MESSAGE.illegalDir,
        ERR_CODE.illegalDir,
        option?.filePath,
      );
    }

    if (flag.includes("x") && existing)
      throw createFsError("openSync", ERR_MESSAGE.exists, ERR_CODE.exists, option?.filePath);

    if (!existing) {
      if (!create)
        throw createFsError("openSync", ERR_MESSAGE.noent, ERR_CODE.noent, option?.filePath);

      this.requireParentDir(path, "openSync", option?.filePath);
      this.setFile(path, new Uint8Array());
    } else if (truncate) {
      this.setFile(path, new Uint8Array());
    }

    return this.insertFd(path, flag.includes("w") || flag.includes("a") || flag.includes("+"));
  }

  readdirSync(dirPath: string): string[] {
    const path = this.resolve(dirPath, "readdirSync");
    const node = this.getNode(path);

    if (!node) {
      throw createFsError(
        "readdirSync",
        ERR_MESSAGE.noent,
        ERR_CODE.noent,
        dirPath.endsWith("/") ? dirPath : `${dirPath}/`,
      );
    }

    if (node.type !== "dir")
      throw createFsError("readdirSync", ERR_MESSAGE.notDir, ERR_CODE.notDir, dirPath);

    return this.childrenOf(path).sort((a, b) => a.localeCompare(b));
  }

  readCompressedFileSync(option: { filePath: string; compressionAlgorithm: string }): ArrayBuffer {
    const node = this.getFileNode(
      this.resolve(option?.filePath, "readCompressedFileSync"),
      "readCompressedFileSync",
      option?.filePath,
    );

    return toArrayBuffer(node.data ?? new Uint8Array());
  }

  readFileSync(
    filePath: string,
    encoding?: FileEncoding,
    position = 0,
    length?: number,
  ): string | ArrayBuffer {
    const path = this.resolve(filePath, "readFileSync");
    const node = this.getFileNode(path, "readFileSync", filePath);
    const bytes = node.data ?? new Uint8Array();
    const start = Math.max(0, position);
    const end =
      length === undefined ? bytes.length : Math.min(bytes.length, start + Math.max(0, length));
    const slice = bytes.slice(start, end);

    if (encoding === undefined) return toArrayBuffer(slice);

    return decodeBytes(slice, encoding);
  }

  readSync(option: {
    arrayBuffer: ArrayBuffer;
    fd: string;
    length?: number;
    offset?: number;
    position?: number;
  }): { arrayBuffer: ArrayBuffer; bytesRead: number } {
    const entry = this.getFd(option?.fd);
    const node = this.getFileNode(entry.path, "readSync", entry.path);
    const source = node.data ?? new Uint8Array();
    const offset = option.offset ?? 0;
    const position = option.position ?? entry.position;
    const length =
      option.length ?? Math.min(source.length - position, option.arrayBuffer.byteLength - offset);
    const view = new Uint8Array(option.arrayBuffer);
    const bytes = source.slice(Math.max(0, position), Math.max(0, position) + Math.max(0, length));

    view.set(bytes, offset);
    entry.position = position + bytes.length;

    return { arrayBuffer: option.arrayBuffer, bytesRead: bytes.length };
  }

  renameSync(oldPath: string, newPath: string): void {
    const source = this.resolve(oldPath, "renameSync");
    const target = this.resolve(newPath, "renameSync");
    const node = this.getNode(source);

    if (!node) throw createFsError("renameSync", ERR_MESSAGE.noent, ERR_CODE.noent, oldPath);
    if (this.getNode(target)?.type === "dir")
      throw createFsError("renameSync", ERR_MESSAGE.illegalDir, ERR_CODE.illegalDir, newPath);

    this.requireParentDir(target, "renameSync", newPath);

    if (node.type === "dir") {
      const moves = [...this.files.entries()].filter(
        ([key]) => key === source || key.startsWith(`${source}/`),
      );

      for (const [key, value] of moves) {
        this.files.delete(key);
        this.files.set(target + key.slice(source.length), value);
      }
    } else {
      this.files.delete(source);
      this.files.set(target, node);
    }
  }

  rmdirSync(dirPath: string, recursive = false): void {
    const path = this.resolve(dirPath, "rmdirSync");
    const node = this.getNode(path);

    if (!node) throw createFsError("rmdirSync", ERR_MESSAGE.noent, ERR_CODE.noent, dirPath);
    if (node.type !== "dir")
      throw createFsError("rmdirSync", ERR_MESSAGE.notDir, ERR_CODE.notDir, dirPath);

    const children = this.childrenOf(path);

    if (children.length > 0 && !recursive)
      throw createFsError("rmdirSync", ERR_MESSAGE.dirNotEmpty, ERR_CODE.dirNotEmpty);

    this.removeSubtree(path);
  }

  saveFileSync(tempFilePath: string, filePath?: string): string {
    const source = this.getNode(this.resolve(tempFilePath, "saveFileSync"));

    if (!source || source.type !== "file") {
      throw createFsError(
        "saveFileSync",
        ERR_MESSAGE.tempNotExist,
        ERR_CODE.tempNotExist,
        tempFilePath,
      );
    }

    const target = filePath ?? `${getUserRoot()}/store_${Date.now()}`;
    const path = this.resolve(target, "saveFileSync");

    if (this.getNode(path))
      throw createFsError("saveFileSync", ERR_MESSAGE.exists, ERR_CODE.exists, target);

    this.requireParentDir(path, "saveFileSync", target);
    this.setFile(path, new Uint8Array(source.data ?? new Uint8Array()));

    return target;
  }

  statSync(path: string, recursive = false): Stats | { path: string; stats: Stats }[] {
    const target = this.resolve(path, "statSync");
    const node = this.getNode(target);

    if (!node) throw createFsError("statSync", ERR_MESSAGE.noent, ERR_CODE.noent, path);

    if (!recursive || node.type !== "dir") return this.createStats(node);

    const prefix = target === "" ? "" : `${target}/`;

    return [...this.files.entries()]
      .filter(([key]) => key.startsWith(prefix) && key !== target)
      .map(([key, value]) => ({
        path: `${getUserRoot()}/${key}`,
        stats: this.createStats(value),
      }));
  }

  truncateSync(option: { filePath: string; length?: number } | string, length?: number): void {
    const filePath = typeof option === "string" ? option : option?.filePath;
    const targetLength = typeof option === "string" ? (length ?? 0) : (option?.length ?? 0);
    const path = this.resolve(filePath, "truncateSync");
    const node = this.getFileNode(path, "truncateSync", filePath);

    this.setFile(
      path,
      this.resize(node.data ?? new Uint8Array(), targetLength, "truncateSync", filePath),
    );
  }

  unlinkSync(filePath: string): void {
    const path = this.resolve(filePath, "unlinkSync");
    const node = this.getNode(path);

    if (!node) throw createFsError("unlinkSync", ERR_MESSAGE.noent, ERR_CODE.noent, filePath);
    if (node.type === "dir")
      throw createFsError("unlinkSync", ERR_MESSAGE.isDir, ERR_CODE.isDir, filePath);

    this.files.delete(path);
  }

  writeFileSync(filePath: string, data: string | ArrayBuffer, encoding?: FileEncoding): void {
    const path = this.resolve(filePath, "writeFileSync");
    const existing = this.getNode(path);

    if (existing?.type === "dir")
      throw createFsError("writeFileSync", ERR_MESSAGE.isDir, ERR_CODE.isDir, filePath);

    this.requireParentDir(path, "writeFileSync", filePath);

    const bytes = toBytes(data, encoding);

    this.assertFileSize(bytes, "writeFileSync", filePath);
    this.setFile(path, bytes);
  }

  writeSync(option: {
    data: string | ArrayBuffer;
    encoding?: FileEncoding;
    fd: string;
    position?: number;
  }): { bytesWritten: number } {
    const entry = this.getFd(option?.fd);
    const node = this.getFileNode(entry.path, "writeSync", entry.path);
    const current = node.data ?? new Uint8Array();
    const bytes = toBytes(option.data, option.encoding);
    const position = option.position ?? entry.position;
    const end = Math.max(current.length, position + bytes.length);
    const next = new Uint8Array(end);

    next.set(current);
    next.set(bytes, position);
    this.assertFileSize(next, "writeSync", entry.path);
    this.setFile(entry.path, next);
    entry.position = position + bytes.length;

    return { bytesWritten: bytes.length };
  }

  private assertFileSize(bytes: Uint8Array, api: string, path: string): void {
    if (bytes.length > MAX_FILE_SIZE)
      throw createFsError(api, ERR_MESSAGE.tooLarge, ERR_CODE.tooLarge, path);
  }

  private resize(bytes: Uint8Array, length: number, api: string, path: string): Uint8Array {
    if (!Number.isInteger(length) || length < 0)
      throw createFsError(api, ERR_MESSAGE.invalidArg, ERR_CODE.invalidArg, path);

    if (length === bytes.length) return bytes;

    const next = new Uint8Array(length);

    next.set(bytes.slice(0, Math.min(bytes.length, length)));
    this.assertFileSize(next, api, path);

    return next;
  }

  private readZip(filePath: string, api: string): Record<string, string | { base64: string }> {
    const node = this.getFileNode(this.resolve(filePath, api), api, filePath);

    try {
      const parsed = JSON.parse(utf8Decode(node.data ?? new Uint8Array())) as unknown;

      if (typeof parsed !== "object" || parsed == null || Array.isArray(parsed))
        throw new Error("not an object");

      return parsed as Record<string, string | { base64: string }>;
    } catch {
      throw createFsError(api, ERR_MESSAGE.unzipFail, ERR_CODE.unzipFail, filePath);
    }
  }

  // ---- async methods (25) ----

  access(option: { path: string; [key: string]: unknown }): void {
    runAsync("access", option, () => {
      this.accessSync(option.path);

      return {};
    });
  }

  appendFile(option: {
    data: string | ArrayBuffer;
    encoding?: FileEncoding;
    filePath: string;
  }): void {
    runAsync("appendFile", option, () => {
      this.appendFileSync(option.filePath, option.data, option.encoding);

      return {};
    });
  }

  close(option: { fd: string }): void {
    runAsync("close", option, () => {
      this.closeSync(option);

      return {};
    });
  }

  copyFile(option: { destPath: string; srcPath: string }): void {
    runAsync("copyFile", option, () => {
      this.copyFileSync(option.srcPath, option.destPath);

      return {};
    });
  }

  fstat(option: { fd: string }): void {
    runAsync("fstat", option, () => {
      const stats = this.fstatSync(option);

      return { stats };
    });
  }

  ftruncate(option: { fd: string; length: number }): void {
    runAsync("ftruncate", option, () => {
      this.ftruncateSync(option);

      return {};
    });
  }

  getFileInfo(option: { digestAlgorithm?: "md5" | "sha1" | "sha256"; filePath: string }): void {
    runAsync("getFileInfo", option, () => {
      const node = this.getFileNode(
        this.resolve(option.filePath, "getFileInfo"),
        "getFileInfo",
        option.filePath,
      );
      const data = node.data ?? new Uint8Array();

      return {
        digest: option.digestAlgorithm ? simpleDigest(data) : "",
        size: data.length,
      };
    });
  }

  getSavedFileList(option?: { complete?: unknown; fail?: unknown; success?: unknown }): void {
    runAsync("getSavedFileList", option, () => ({ fileList: [] }));
  }

  mkdir(option: { dirPath: string; recursive?: boolean }): void {
    runAsync("mkdir", option, () => {
      this.mkdirSync(option.dirPath, option.recursive);

      return {};
    });
  }

  open(option: { filePath: string; flag?: string }): void {
    runAsync("open", option, () => ({ fd: this.openSync(option) }));
  }

  read(option: {
    arrayBuffer: ArrayBuffer;
    fd: string;
    length?: number;
    offset?: number;
    position?: number;
  }): void {
    runAsync("read", option, () => this.readSync(option));
  }

  readCompressedFile(option: { compressionAlgorithm: string; filePath: string }): void {
    runAsync("readCompressedFile", option, () => ({
      data: this.readCompressedFileSync(option),
    }));
  }

  readFile(option: {
    encoding?: FileEncoding;
    filePath: string;
    length?: number;
    position?: number;
  }): void {
    runAsync("readFile", option, () => ({
      data: this.readFileSync(
        option.filePath,
        option.encoding,
        option.position ?? 0,
        option.length,
      ),
    }));
  }

  readZipEntry(option: {
    encoding?: FileEncoding;
    entries: "all" | { encoding?: FileEncoding; path: string }[];
    filePath: string;
  }): void {
    runAsync("readZipEntry", option, () => {
      const archive = this.readZip(option.filePath, "readZipEntry");
      const requested: { encoding?: FileEncoding; path: string }[] =
        option.entries === "all" ? Object.keys(archive).map((path) => ({ path })) : option.entries;
      const entries: Record<string, { data?: string | ArrayBuffer }> = {};

      for (const entry of requested) {
        const value = archive[entry.path];

        if (value === undefined) {
          throw createFsError(
            "readZipEntry",
            ERR_MESSAGE.unzipEntry,
            ERR_CODE.unzipEntry,
            entry.path,
          );
        }

        const bytes =
          typeof value === "string" ? utf8Encode(value) : base64Decode(value.base64 ?? "");

        entries[entry.path] = {
          data: decodeBytes(bytes, entry.encoding ?? option.encoding) as string | ArrayBuffer,
        };
      }

      return { entries };
    });
  }

  readdir(option: { dirPath: string }): void {
    runAsync("readdir", option, () => ({ files: this.readdirSync(option.dirPath) }));
  }

  removeSavedFile(option: { filePath: string }): void {
    runAsync("removeSavedFile", option, () => {
      this.unlinkSync(option.filePath);

      return {};
    });
  }

  rename(option: { newPath: string; oldPath: string }): void {
    runAsync("rename", option, () => {
      this.renameSync(option.oldPath, option.newPath);

      return {};
    });
  }

  rmdir(option: { dirPath: string; recursive?: boolean }): void {
    runAsync("rmdir", option, () => {
      this.rmdirSync(option.dirPath, option.recursive);

      return {};
    });
  }

  saveFile(option: { filePath?: string; tempFilePath: string }): void {
    runAsync("saveFile", option, () => ({
      savedFilePath: this.saveFileSync(option.tempFilePath, option.filePath),
    }));
  }

  stat(option: { path: string; recursive?: boolean }): void {
    runAsync("stat", option, () => {
      const stats = this.statSync(option.path, option.recursive);

      return Array.isArray(stats) ? { stats } : { stats };
    });
  }

  truncate(option: { filePath: string; length?: number }): void {
    runAsync("truncate", option, () => {
      this.truncateSync(option);

      return {};
    });
  }

  unlink(option: { filePath: string }): void {
    runAsync("unlink", option, () => {
      this.unlinkSync(option.filePath);

      return {};
    });
  }

  unzip(option: { targetPath: string; zipFilePath: string }): void {
    runAsync("unzip", option, () => {
      let archive: Record<string, string | { base64: string }>;

      try {
        archive = this.readZip(option.zipFilePath, "unzip");
      } catch (err) {
        if (getErrCode(err) === ERR_CODE.noent) {
          throw createFsError(
            "unzip",
            ERR_MESSAGE.unzipOpen,
            ERR_CODE.unzipOpen,
            option.zipFilePath,
          );
        }

        throw err;
      }

      const target = this.resolve(option.targetPath, "unzip");

      this.mkdirSync(option.targetPath, true);

      for (const [entryPath, value] of Object.entries(archive)) {
        const entryTarget = this.resolve(`${option.targetPath}/${entryPath}`, "unzip");

        if (entryTarget !== target && !entryTarget.startsWith(`${target}/`)) {
          throw createFsError(
            "unzip",
            `${ERR_MESSAGE.permission}, open`,
            ERR_CODE.permission,
            entryPath,
          );
        }

        const index = entryTarget.lastIndexOf("/");

        if (index > 0) this.mkdirSync(entryTarget.slice(0, index), true);

        const bytes =
          typeof value === "string" ? utf8Encode(value) : base64Decode(value.base64 ?? "");

        this.setFile(entryTarget, bytes);
      }

      return {};
    });
  }

  write(option: {
    data: string | ArrayBuffer;
    encoding?: FileEncoding;
    fd: string;
    position?: number;
  }): void {
    runAsync("write", option, () => this.writeSync(option));
  }

  writeFile(option: {
    data: string | ArrayBuffer;
    encoding?: FileEncoding;
    filePath: string;
  }): void {
    runAsync("writeFile", option, () => {
      this.writeFileSync(option.filePath, option.data, option.encoding);

      return {};
    });
  }

  // ---- snapshots ----

  /** Capture the current file system contents. */
  snapshot(): FileSystemSnapshot {
    const snapshot: FileSystemSnapshot = new Map();

    for (const [path, node] of this.files) {
      snapshot.set(path, {
        data: node.data ? new Uint8Array(node.data) : undefined,
        mtime: node.mtime,
        type: node.type,
      });
    }

    return snapshot;
  }

  /** Restore contents captured by {@link snapshot}. */
  restore(snapshot: FileSystemSnapshot): void {
    this.files.clear();
    this.openFiles.clear();

    for (const [path, node] of snapshot) {
      this.files.set(path, {
        data: node.data ? new Uint8Array(node.data) : undefined,
        mtime: node.mtime,
        type: node.type,
      });
    }
  }

  /** Clear the in-memory file system. */
  reset(): void {
    this.files.clear();
    this.openFiles.clear();
    this.fdSeq = 0;
  }
}

interface Stats {
  isDirectory: () => boolean;
  isFile: () => boolean;
  lastAccessedTime: number;
  lastModifiedTime: number;
  mode: number;
  size: number;
}

/** 全局唯一的文件系统管理器（与真实微信行为一致） */
let fileSystemManager: FileSystemManager | undefined;

/** 获取文件系统管理器 */
export const getFileSystemManager = (): FileSystemManager =>
  (fileSystemManager ??= new FileSystemManager());

/** 文件保存相关 wx API mock */
export const fileApi = {
  saveFile(option: unknown): unknown {
    const savedFilePath =
      (option as { filePath?: string } | undefined)?.filePath ?? `wxfile://store_${Date.now()}`;

    return callCallback(option, { savedFilePath, errMsg: "saveFile:ok" });
  },

  getSavedFileList(option: unknown): unknown {
    return callCallback(option, { fileList: [], errMsg: "getSavedFileList:ok" });
  },

  getSavedFileInfo(option: unknown): unknown {
    return callCallback(option, { size: 0, createTime: 0, errMsg: "getSavedFileInfo:ok" });
  },

  removeSavedFile(option: unknown): unknown {
    return callCallback(option, { errMsg: "removeSavedFile:ok" });
  },
};

import type { GeneralCallbackResult } from "./utils";

/** 文件数组 */
interface FileItem {
  /** 文件保存时的时间戳，从1970/01/01 08:00:00 到当前时间的秒数 */
  createTime: number;
  /** 文件路径 (本地路径) */
  filePath: string;
  /** 本地文件大小，以字节为单位 */
  size: number;
}

interface AccessOption {
  /** 要判断是否存在的文件/目录路径 (本地路径) */
  path: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: AccessCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: AccessFailCallback;
  /** 接口调用成功的回调函数 */
  success?: AccessSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type AccessCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type AccessFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type AccessSuccessCallback = (res: FileError) => void;

interface AppendFileOption {
  /** 要追加的文本或二进制数据 */
  data: string | ArrayBuffer;
  /** 要追加内容的文件路径 (本地路径) */
  filePath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: AppendFileCompleteCallback;
  /** 指定写入文件的字符编码
   *
   * 可选值：
   * - 'ascii': ;
   * - 'base64': ;
   * - 'binary': ;
   * - 'hex': ;
   * - 'ucs2': 以小端序读取;
   * - 'ucs-2': 以小端序读取;
   * - 'utf16le': 以小端序读取;
   * - 'utf-16le': 以小端序读取;
   * - 'utf-8': ;
   * - 'utf8': ;
   * - 'latin1': ; */
  encoding?:
    | "ascii"
    | "base64"
    | "binary"
    | "hex"
    | "ucs2"
    | "ucs-2"
    | "utf16le"
    | "utf-16le"
    | "utf-8"
    | "utf8"
    | "latin1";
  /** 接口调用失败的回调函数 */
  fail?: AppendFileFailCallback;
  /** 接口调用成功的回调函数 */
  success?: AppendFileSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type AppendFileCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type AppendFileFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type AppendFileSuccessCallback = (res: FileError) => void;

/** 文件路径 */
interface ZipFileItem {
  /** 文件内容 */
  data: string | ArrayBuffer;
  /** 错误信息 */
  errMsg: string;
}

interface CopyFileOption {
  /** 目标文件路径，支持本地路径 */
  destPath: string;
  /** 源文件路径，支持本地路径 */
  srcPath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: CopyFileCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: CopyFileFailCallback;
  /** 接口调用成功的回调函数 */
  success?: CopyFileSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type CopyFileCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type CopyFileFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type CopyFileSuccessCallback = (res: FileError) => void;

/** 文件读取结果。res.entries 是一个对象，key是文件路径，value是一个对象 FileItem ，表示该文件的读取结果。每个 FileItem 包含 data （文件内容） 和 errMsg （错误信息） 属性。 */
type EntriesResult = Record<string, ZipFileItem>;

interface FstatOption {
  /** 文件描述符。fd 通过 [FileSystemManager.open](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.open.html) 或 [FileSystemManager.openSync](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.openSync.html) 接口获得 */
  fd: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: FstatCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: FstatFailCallback;
  /** 接口调用成功的回调函数 */
  success?: FstatSuccessCallback;
}

/** 描述文件状态的对象 */
interface Stats {
  /** 文件最近一次被存取或被执行的时间，UNIX 时间戳，对应 POSIX stat.st_atime */
  lastAccessedTime: number;
  /** 文件最后一次被修改的时间，UNIX 时间戳，对应 POSIX stat.st_mtime */
  lastModifiedTime: number;
  /** 文件的类型和存取的权限，对应 POSIX stat.st_mode */
  mode: number;
  /** 文件大小，单位：B，对应 POSIX stat.st_size */
  size: number;
  /** [boolean Stats.isDirectory()](https://developers.weixin.qq.com/miniprogram/dev/api/file/Stats.isDirectory.html)
   *
   * 在插件中使用：需要基础库 `2.19.2`
   *
   * 判断当前文件是否一个目录 */
  isDirectory(): boolean;
  /** [boolean Stats.isFile()](https://developers.weixin.qq.com/miniprogram/dev/api/file/Stats.isFile.html)
   *
   * 在插件中使用：需要基础库 `2.19.2`
   *
   * 判断当前文件是否一个普通文件 */
  isFile(): boolean;
}

interface FstatSuccessCallbackResult {
  /** [Stats](https://developers.weixin.qq.com/miniprogram/dev/api/file/Stats.html)
   *
   * Stats 对象，包含了文件的状态信息 */
  stats: Stats;
  errMsg: string;
}
interface FstatSyncOption {
  /** 文件描述符。fd 通过 [FileSystemManager.open](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.open.html) 或 [FileSystemManager.openSync](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.openSync.html) 接口获得 */
  fd: string;
}
interface FtruncateOption {
  /** 文件描述符。fd 通过 [FileSystemManager.open](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.open.html) 或 [FileSystemManager.openSync](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.openSync.html) 接口获得 */
  fd: string;
  /** 截断位置，默认0。如果 length 小于文件长度（单位：字节），则只有前面 length 个字节会保留在文件中，其余内容会被删除；如果 length 大于文件长度，则会对其进行扩展，并且扩展部分将填充空字节（'\0'） */
  length: number;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: FtruncateCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: FtruncateFailCallback;
  /** 接口调用成功的回调函数 */
  success?: FtruncateSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type FstatCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type FstatFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type FstatSuccessCallback = (result: FstatSuccessCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type FtruncateCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type FtruncateFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type FtruncateSuccessCallback = (res: FileError) => void;

interface FtruncateSyncOption {
  /** 文件描述符。fd 通过 [FileSystemManager.open](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.open.html) 或 [FileSystemManager.openSync](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.openSync.html) 接口获得 */
  fd: string;
  /** 截断位置，默认0。如果 length 小于文件长度（单位：字节），则只有前面 length 个字节会保留在文件中，其余内容会被删除；如果 length 大于文件长度，则会对其进行扩展，并且扩展部分将填充空字节（'\0'） */
  length: number;
}

/** 要读取的压缩包内的文件列表（当传入"all" 时表示读取压缩包内所有文件） */
interface EntryItem {
  /** 压缩包内文件路径 */
  path: string;
  /** 指定读取文件的字符编码，如果不传 encoding，则以 ArrayBuffer 格式读取文件的二进制内容
   *
   * 可选值：
   * - 'ascii': ;
   * - 'base64': ;
   * - 'binary': ;
   * - 'hex': ;
   * - 'ucs2': 以小端序读取;
   * - 'ucs-2': 以小端序读取;
   * - 'utf16le': 以小端序读取;
   * - 'utf-16le': 以小端序读取;
   * - 'utf-8': ;
   * - 'utf8': ;
   * - 'latin1': ; */
  encoding?:
    | "ascii"
    | "base64"
    | "binary"
    | "hex"
    | "ucs2"
    | "ucs-2"
    | "utf16le"
    | "utf-16le"
    | "utf-8"
    | "utf8"
    | "latin1";
  /** 指定文件的长度，如果不指定，则读到文件末尾。有效范围：[1, fileLength]。单位：byte */
  length?: number;
  /** 从文件指定位置开始读，如果不指定，则从文件头开始读。读取的范围应该是左闭右开区间 [position, position+length)。有效范围：[0, fileLength - 1]。单位：byte */
  position?: number;
}

interface GetFileInfoOption {
  /** 要读取的文件路径 (本地路径) */
  filePath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: GetFileInfoCompleteCallback;
  /** 计算文件摘要的算法
   *
   * 可选值：
   * - 'md5': md5 算法;
   * - 'sha1': sha1 算法;
   * - 'sha256': sha256 算法; */
  digestAlgorithm?: "md5" | "sha1" | "sha256";
  /** 接口调用失败的回调函数 */
  fail?: GetFileInfoFailCallback;
  /** 接口调用成功的回调函数 */
  success?: GetFileInfoSuccessCallback;
}
interface GetFileInfoSuccessCallbackResult {
  /** 按照传入的 digestAlgorithm 计算得出的的文件摘要 */
  digest: string;
  /** 文件大小，以字节为单位 */
  size: number;
  errMsg: string;
}

interface GetSavedFileListOption {
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: GetSavedFileListCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: GetSavedFileListFailCallback;
  /** 接口调用成功的回调函数 */
  success?: GetSavedFileListSuccessCallback;
}

interface GetSavedFileListSuccessCallbackResult {
  /** 文件数组 */
  fileList: FileItem[];
  errMsg: string;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetSavedFileListCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetSavedFileListFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
type GetSavedFileListSuccessCallback = (result: GetSavedFileListSuccessCallbackResult) => void;

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetFileInfoCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type GetFileInfoFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type GetFileInfoSuccessCallback = (result: GetFileInfoSuccessCallbackResult) => void;

interface MkdirOption {
  /** 创建的目录路径 (本地路径) */
  dirPath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: MkdirCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: MkdirFailCallback;
  /** 需要基础库： `2.3.0`
   *
   * 是否在递归创建该目录的上级目录后再创建该目录。如果对应的上级目录已经存在，则不创建该上级目录。如 dirPath 为 a/b/c/d 且 recursive 为 true，将创建 a 目录，再在 a 目录下创建 b 目录，以此类推直至创建 a/b/c 目录下的 d 目录。 */
  recursive?: boolean;
  /** 接口调用成功的回调函数 */
  success?: MkdirSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type MkdirCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type MkdirFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type MkdirSuccessCallback = (res: FileError) => void;

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ReadCompleteCallback = (res: FileError) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ReadCompressedFileCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type ReadCompressedFileFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type ReadCompressedFileSuccessCallback = (result: ReadCompressedFileSuccessCallbackResult) => void;
/** 接口调用失败的回调函数 */
type ReadFailCallback = (res: FileError) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ReadFileCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type ReadFileFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type ReadFileSuccessCallback = (result: ReadFileSuccessCallbackResult) => void;
/** 接口调用成功的回调函数 */
type ReadSuccessCallback = (result: ReadSuccessCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ReadZipEntryCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type ReadZipEntryFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type ReadZipEntrySuccessCallback = (result: ReadZipEntrySuccessCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type ReaddirCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type ReaddirFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type ReaddirSuccessCallback = (result: ReaddirSuccessCallbackResult) => void;

interface ReadCompressedFileOption {
  /** 文件压缩类型，目前仅支持 'br'。
   *
   * 可选值：
   * - 'br': brotli压缩文件; */
  compressionAlgorithm: "br";
  /** 要读取的文件的路径 (本地用户文件或代码包文件) */
  filePath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: ReadCompressedFileCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: ReadCompressedFileFailCallback;
  /** 接口调用成功的回调函数 */
  success?: ReadCompressedFileSuccessCallback;
}
interface ReadCompressedFileSuccessCallbackResult {
  /** 文件内容 */
  data: ArrayBuffer;
  errMsg: string;
}
interface ReadCompressedFileSyncOption {
  /** 文件压缩类型，目前仅支持 'br'。
   *
   * 可选值：
   * - 'br': brotli压缩文件; */
  compressionAlgorithm: "br";
  /** 要读取的文件的路径 (本地用户文件或代码包文件) */
  filePath: string;
}
interface ReadFileOption {
  /** 要读取的文件的路径 (本地路径) */
  filePath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: ReadFileCompleteCallback;
  /** 指定读取文件的字符编码，如果不传 encoding，则以 ArrayBuffer 格式读取文件的二进制内容
   *
   * 可选值：
   * - 'ascii': ;
   * - 'base64': ;
   * - 'binary': ;
   * - 'hex': ;
   * - 'ucs2': 以小端序读取;
   * - 'ucs-2': 以小端序读取;
   * - 'utf16le': 以小端序读取;
   * - 'utf-16le': 以小端序读取;
   * - 'utf-8': ;
   * - 'utf8': ;
   * - 'latin1': ; */
  encoding?:
    | "ascii"
    | "base64"
    | "binary"
    | "hex"
    | "ucs2"
    | "ucs-2"
    | "utf16le"
    | "utf-16le"
    | "utf-8"
    | "utf8"
    | "latin1";
  /** 接口调用失败的回调函数 */
  fail?: ReadFileFailCallback;
  /** 需要基础库： `2.10.0`
   *
   * 指定文件的长度，如果不指定，则读到文件末尾。有效范围：[1, fileLength]。单位：byte */
  length?: number;
  /** 需要基础库： `2.10.0`
   *
   * 从文件指定位置开始读，如果不指定，则从文件头开始读。读取的范围应该是左闭右开区间 [position, position+length)。有效范围：[0, fileLength - 1]。单位：byte */
  position?: number;
  /** 接口调用成功的回调函数 */
  success?: ReadFileSuccessCallback;
}
interface ReadFileSuccessCallbackResult {
  /** 文件内容 */
  data: string | ArrayBuffer;
  errMsg: string;
}
interface ReadOption {
  /** 数据写入的缓冲区，必须是 ArrayBuffer 实例 */
  arrayBuffer: ArrayBuffer;
  /** 文件描述符。fd 通过 [FileSystemManager.open](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.open.html) 或 [FileSystemManager.openSync](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.openSync.html) 接口获得 */
  fd: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: ReadCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: ReadFailCallback;
  /** 要从文件中读取的字节数，默认0 */
  length?: number;
  /** 缓冲区中的写入偏移量，默认0 */
  offset?: number;
  /** 文件读取的起始位置，如不传或传 null，则会从当前文件指针的位置读取。如果 position 是正整数，则文件指针位置会保持不变并从 position 读取文件。 */
  position?: number;
  /** 接口调用成功的回调函数 */
  success?: ReadSuccessCallback;
}
/** 文件读取结果。 通过 [FileSystemManager.readSync](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readSync.html) 接口返回 */
interface ReadResult {
  /** 被写入的缓存区的对象，即接口入参的 arrayBuffer */
  arrayBuffer: ArrayBuffer;
  /** 实际读取的字节数 */
  bytesRead: number;
}
interface ReadSuccessCallbackResult {
  /** 被写入的缓存区的对象，即接口入参的 arrayBuffer */
  arrayBuffer: ArrayBuffer;
  /** 实际读取的字节数 */
  bytesRead: number;
  errMsg: string;
}
interface ReadSyncOption {
  /** 数据写入的缓冲区，必须是 ArrayBuffer 实例 */
  arrayBuffer: ArrayBuffer;
  /** 文件描述符。fd 通过 [FileSystemManager.open](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.open.html) 或 [FileSystemManager.openSync](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.openSync.html) 接口获得 */
  fd: string;
  /** 要从文件中读取的字节数，默认0 */
  length?: number;
  /** 缓冲区中的写入偏移量，默认0 */
  offset?: number;
  /** 文件读取的起始位置，如不传或传 null，则会从当前文件指针的位置读取。如果 position 是正整数，则文件指针位置会保持不变并从 position 读取文件。 */
  position?: number;
}
interface ReadZipEntryOption {
  /** 要读取的压缩包内的文件列表（当传入"all" 时表示读取压缩包内所有文件） */
  entries: EntryItem[] | "all";
  /** 要读取的压缩包的路径 (本地路径) */
  filePath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: ReadZipEntryCompleteCallback;
  /** 统一指定读取文件的字符编码，只在 entries 值为"all"时有效。如果 entries 值为"all"且不传 encoding，则以 ArrayBuffer 格式读取文件的二进制内容
   *
   * 可选值：
   * - 'ascii': ;
   * - 'base64': ;
   * - 'binary': ;
   * - 'hex': ;
   * - 'ucs2': 以小端序读取;
   * - 'ucs-2': 以小端序读取;
   * - 'utf16le': 以小端序读取;
   * - 'utf-16le': 以小端序读取;
   * - 'utf-8': ;
   * - 'utf8': ;
   * - 'latin1': ; */
  encoding?:
    | "ascii"
    | "base64"
    | "binary"
    | "hex"
    | "ucs2"
    | "ucs-2"
    | "utf16le"
    | "utf-16le"
    | "utf-8"
    | "utf8"
    | "latin1";
  /** 接口调用失败的回调函数 */
  fail?: ReadZipEntryFailCallback;
  /** 接口调用成功的回调函数 */
  success?: ReadZipEntrySuccessCallback;
}
interface ReadZipEntrySuccessCallbackResult {
  /** 文件读取结果。res.entries 是一个对象，key是文件路径，value是一个对象 FileItem ，表示该文件的读取结果。每个 FileItem 包含 data （文件内容） 和 errMsg （错误信息） 属性。 */
  entries: EntriesResult;
  errMsg: string;
}
interface ReaddirOption {
  /** 要读取的目录路径 (本地路径) */
  dirPath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: ReaddirCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: ReaddirFailCallback;
  /** 接口调用成功的回调函数 */
  success?: ReaddirSuccessCallback;
}
interface ReaddirSuccessCallbackResult {
  /** 指定目录下的文件名数组。 */
  files: string[];
  errMsg: string;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type TruncateCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type TruncateFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type TruncateSuccessCallback = (res: FileError) => void;

interface TruncateOption {
  /** 要截断的文件路径 (本地路径) */
  filePath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: TruncateCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: TruncateFailCallback;
  /** 截断位置，默认0。如果 length 小于文件长度（字节），则只有前面 length 个字节会保留在文件中，其余内容会被删除；如果 length 大于文件长度，则会对其进行扩展，并且扩展部分将填充空字节（'\0'） */
  length?: number;
  /** 接口调用成功的回调函数 */
  success?: TruncateSuccessCallback;
}
interface TruncateSyncOption {
  /** 要截断的文件路径 (本地路径) */
  filePath: string;
  /** 截断位置，默认0。如果 length 小于文件长度（字节），则只有前面 length 个字节会保留在文件中，其余内容会被删除；如果 length 大于文件长度，则会对其进行扩展，并且扩展部分将填充空字节（'\0'） */
  length?: number;
}

interface FileError {
  /** 错误信息
   *
   * | 错误码 | 错误信息 | 说明 |
   * | - | - | - |
   * | 1300001 | operation not permitted | 操作不被允许（例如，filePath 预期传入一个文件而实际传入一个目录） |
   * | 1300002 | no such file or directory ${path} | 文件/目录不存在，或者目标文件路径的上层目录不存在 |
   * | 1300005 | Input/output error | 输入输出流不可用 |
   * | 1300009 | bad file descriptor | 无效的文件描述符 |
   * | 1300013 | permission denied | 权限错误，文件是只读或只写 |
   * | 1300014 | Path permission denied | 传入的路径没有权限 |
   * | 1300020 | not a directory | dirPath 指定路径不是目录，常见于指定的写入路径的上级路径为一个文件的情况 |
   * | 1300021 | Is a directory | 指定路径是一个目录 |
   * | 1300022 | Invalid argument | 无效参数，可以检查length或offset是否越界 |
   * | 1300036 | File name too long | 文件名过长 |
   * | 1300066 | directory not empty | 目录不为空 |
   * | 1300201 | system error | 系统接口调用失败 |
   * | 1300202 | the maximum size of the file storage limit is exceeded | 存储空间不足，或文件大小超出上限（上限100M） |
   * | 1300203 | base64 encode error | 字符编码转换失败（例如 base64 格式错误） |
   * | 1300300 | sdcard not mounted | android sdcard 挂载失败 |
   * | 1300301 | unable to open as fileType | 无法以fileType打开文件 |
   * | 1301000 | permission denied, cannot access file path | 目标路径无访问权限（usr目录） |
   * | 1301002 | data to write is empty | 写入数据为空 |
   * | 1301003 | illegal operation on a directory | 不可对目录进行此操作（例如，指定的 filePath 是一个已经存在的目录） |
   * | 1301004 | illegal operation on a package directory | 不可对代码包目录进行此操作 |
   * | 1301005 | file already exists ${dirPath} | 已有同名文件或目录 |
   * | 1301006 | value of length is out of range | 传入的 length 不合法 |
   * | 1301007 | value of offset is out of range | 传入的 offset 不合法 |
   * | 1301009 | value of position is out of range | position值越界 |
   * | 1301100 | store directory is empty | store目录为空 |
   * | 1301102 | unzip open file fail | 压缩文件打开失败 |
   * | 1301103 | unzip entry fail | 解压单个文件失败 |
   * | 1301104 | unzip fail | 解压失败 |
   * | 1301111 | brotli decompress fail | brotli解压失败（例如，指定的 compressionAlgorithm 与文件实际压缩格式不符） |
   * | 1301112 | tempFilePath file not exist | 指定的 tempFilePath 找不到文件 |
   * | 1302001 | fail permission denied | 指定的 fd 路径没有读权限/没有写权限 |
   * | 1302002 | excced max concurrent fd limit | fd数量已达上限 |
   * | 1302003 | invalid flag | 无效的flag |
   * | 1302004 | permission denied when open using flag | 无法使用flag标志打开文件 |
   * | 1302005 | array buffer does not exist | 未传入arrayBuffer |
   * | 1302100 | array buffer is readonly | arrayBuffer只读 | */ errMsg: string;
  /** 错误码
   *
   * | 错误码 | 错误信息 | 说明 |
   * | - | - | - |
   * | 1300001 | operation not permitted | 操作不被允许（例如，filePath 预期传入一个文件而实际传入一个目录） |
   * | 1300002 | no such file or directory ${path} | 文件/目录不存在，或者目标文件路径的上层目录不存在 |
   * | 1300005 | Input/output error | 输入输出流不可用 |
   * | 1300009 | bad file descriptor | 无效的文件描述符 |
   * | 1300013 | permission denied | 权限错误，文件是只读或只写 |
   * | 1300014 | Path permission denied | 传入的路径没有权限 |
   * | 1300020 | not a directory | dirPath 指定路径不是目录，常见于指定的写入路径的上级路径为一个文件的情况 |
   * | 1300021 | Is a directory | 指定路径是一个目录 |
   * | 1300022 | Invalid argument | 无效参数，可以检查length或offset是否越界 |
   * | 1300036 | File name too long | 文件名过长 |
   * | 1300066 | directory not empty | 目录不为空 |
   * | 1300201 | system error | 系统接口调用失败 |
   * | 1300202 | the maximum size of the file storage limit is exceeded | 存储空间不足，或文件大小超出上限（上限100M） |
   * | 1300203 | base64 encode error | 字符编码转换失败（例如 base64 格式错误） |
   * | 1300300 | sdcard not mounted | android sdcard 挂载失败 |
   * | 1300301 | unable to open as fileType | 无法以fileType打开文件 |
   * | 1301000 | permission denied, cannot access file path | 目标路径无访问权限（usr目录） |
   * | 1301002 | data to write is empty | 写入数据为空 |
   * | 1301003 | illegal operation on a directory | 不可对目录进行此操作（例如，指定的 filePath 是一个已经存在的目录） |
   * | 1301004 | illegal operation on a package directory | 不可对代码包目录进行此操作 |
   * | 1301005 | file already exists ${dirPath} | 已有同名文件或目录 |
   * | 1301006 | value of length is out of range | 传入的 length 不合法 |
   * | 1301007 | value of offset is out of range | 传入的 offset 不合法 |
   * | 1301009 | value of position is out of range | position值越界 |
   * | 1301100 | store directory is empty | store目录为空 |
   * | 1301102 | unzip open file fail | 压缩文件打开失败 |
   * | 1301103 | unzip entry fail | 解压单个文件失败 |
   * | 1301104 | unzip fail | 解压失败 |
   * | 1301111 | brotli decompress fail | brotli解压失败（例如，指定的 compressionAlgorithm 与文件实际压缩格式不符） |
   * | 1301112 | tempFilePath file not exist | 指定的 tempFilePath 找不到文件 |
   * | 1302001 | fail permission denied | 指定的 fd 路径没有读权限/没有写权限 |
   * | 1302002 | excced max concurrent fd limit | fd数量已达上限 |
   * | 1302003 | invalid flag | 无效的flag |
   * | 1302004 | permission denied when open using flag | 无法使用flag标志打开文件 |
   * | 1302005 | array buffer does not exist | 未传入arrayBuffer |
   * | 1302100 | array buffer is readonly | arrayBuffer只读 | */ errCode: number;
}

interface FileSystemManagerCloseOption {
  /** 需要被关闭的文件描述符。fd 通过 [FileSystemManager.open](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.open.html) 或 [FileSystemManager.openSync](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.openSync.html) 接口获得 */
  fd: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: FileSystemManagerCloseCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: FileSystemManagerCloseFailCallback;
  /** 接口调用成功的回调函数 */
  success?: FileSystemManagerCloseSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type FileSystemManagerCloseCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type FileSystemManagerCloseFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type FileSystemManagerCloseSuccessCallback = (res: FileError) => void;

interface OpenOption {
  /** 文件路径 (本地路径) */
  filePath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: OpenCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: OpenFailCallback;
  /** 文件系统标志，默认值: 'r'
   *
   * 可选值：
   * - 'a': 打开文件用于追加。 如果文件不存在，则创建该文件;
   * - 'ax': 类似于 'a'，但如果路径存在，则失败;
   * - 'a+': 打开文件用于读取和追加。 如果文件不存在，则创建该文件;
   * - 'ax+': 类似于 'a+'，但如果路径存在，则失败;
   * - 'as': 打开文件用于追加（在同步模式中）。 如果文件不存在，则创建该文件;
   * - 'as+': 打开文件用于读取和追加（在同步模式中）。 如果文件不存在，则创建该文件;
   * - 'r': 打开文件用于读取。 如果文件不存在，则会发生异常;
   * - 'r+': 打开文件用于读取和写入。 如果文件不存在，则会发生异常;
   * - 'w': 打开文件用于写入。 如果文件不存在则创建文件，如果文件存在则截断文件;
   * - 'wx': 类似于 'w'，但如果路径存在，则失败;
   * - 'w+': 打开文件用于读取和写入。 如果文件不存在则创建文件，如果文件存在则截断文件;
   * - 'wx+': 类似于 'w+'，但如果路径存在，则失败; */
  flag?: "a" | "ax" | "a+" | "ax+" | "as" | "as+" | "r" | "r+" | "w" | "wx" | "w+" | "wx+";
  /** 接口调用成功的回调函数 */
  success?: OpenSuccessCallback;
}

interface OpenSuccessCallbackResult {
  /** 文件描述符 */
  fd: string;
  errMsg: string;
}

/** 接口调用成功的回调函数 */
type OpenSuccessCallback = (result: OpenSuccessCallbackResult) => void;

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type OpenCompleteCallback = (res: FileError) => void;

/** 接口调用失败的回调函数 */
type OpenFailCallback = (res: FileError) => void;

interface RemoveSavedFileOption {
  /** 需要删除的文件路径 (本地路径) */
  filePath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: RemoveSavedFileCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: RemoveSavedFileFailCallback;
  /** 接口调用成功的回调函数 */
  success?: RemoveSavedFileSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RemoveSavedFileCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type RemoveSavedFileFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type RemoveSavedFileSuccessCallback = (res: FileError) => void;

interface RenameOption {
  /** 新文件路径，支持本地路径 */
  newPath: string;
  /** 源文件路径，支持本地路径 */
  oldPath: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: RenameCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: RenameFailCallback;
  /** 接口调用成功的回调函数 */
  success?: RenameSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type RenameCompleteCallback = (res: FileError) => void;
/** 接口调用失败的回调函数 */
type RenameFailCallback = (res: FileError) => void;
/** 接口调用成功的回调函数 */
type RenameSuccessCallback = (res: FileError) => void;

interface FileSystemManager {
  /** [Array.&lt;string&gt; FileSystemManager.readdirSync(string dirPath)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readdirSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.readdir](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readdir.html) 的同步版本
*
* **注意事项**
*
* - readdir接口无法访问文件系统根路径(wxfile://)。
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.readdir({
  dirPath: `${wx.env.USER_DATA_PATH}/example`,
  success(res) {
    console.log(res.files)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.readdirSync(`${wx.env.USER_DATA_PATH}/example`)
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  readdirSync(
    /** 要读取的目录路径 (本地路径) */
    dirPath: string,
  ): string[];
  /** [ArrayBuffer FileSystemManager.readCompressedFileSync(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readCompressedFileSync.html)
*
* 需要基础库： `2.21.1`
*
* 在插件中使用：不支持
*
* 同步读取指定压缩类型的本地文件内容
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()

// 异步接口
fs.readCompressedFile({
  filePath: '${wx.env.USER_DATA_PATH}/hello.br',
  compressionAlgorithm: 'br',
  success(res) {
    console.log(res.data)
  },
  fail(res) {
    console.log('readCompressedFile fail', res)
  }
})

// 同步接口
try {
  const data = fs.readCompressedFileSync({
    filePath: '${wx.env.USER_DATA_PATH}/hello.br',
    compressionAlgorithm: 'br',
  })
  console.log(data)
} catch (err) {
  console.log(err)
}
``` */
  readCompressedFileSync(option: ReadCompressedFileSyncOption): ArrayBuffer;
  /** [FileSystemManager.access(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.access.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 判断文件/目录是否存在
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
// 判断文件/目录是否存在
fs.access({
  path: `${wx.env.USER_DATA_PATH}/hello.txt`,
  success(res) {
    // 文件存在
    console.log(res)
  },
  fail(res) {
    // 文件不存在或其他错误
    console.error(res)
  }
})

// 同步接口
try {
  fs.accessSync(`${wx.env.USER_DATA_PATH}/hello.txt`)
} catch(e) {
  console.error(e)
}
``` */
  access(option: AccessOption): void;
  /** [FileSystemManager.accessSync(string path)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.accessSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.access](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.access.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
// 判断文件/目录是否存在
fs.access({
  path: `${wx.env.USER_DATA_PATH}/hello.txt`,
  success(res) {
    // 文件存在
    console.log(res)
  },
  fail(res) {
    // 文件不存在或其他错误
    console.error(res)
  }
})

// 同步接口
try {
  fs.accessSync(`${wx.env.USER_DATA_PATH}/hello.txt`)
} catch(e) {
  console.error(e)
}
``` */
  accessSync(
    /** 要判断是否存在的文件/目录路径 (本地路径) */
    path: string,
  ): void;
  /** [FileSystemManager.appendFile(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.appendFile.html)
*
* 需要基础库： `2.1.0`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 在文件结尾追加内容
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()

fs.appendFile({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  data: 'some text',
  encoding: 'utf8',
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  fs.appendFileSync(`${wx.env.USER_DATA_PATH}/hello.txt`, 'some text', 'utf8')
} catch(e) {
  console.error(e)
}
``` */
  appendFile(option: AppendFileOption): void;
  /** [FileSystemManager.appendFileSync(string filePath, string|ArrayBuffer data, string encoding)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.appendFileSync.html)
*
* 需要基础库： `2.1.0`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.appendFile](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.appendFile.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()

fs.appendFile({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  data: 'some text',
  encoding: 'utf8',
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  fs.appendFileSync(`${wx.env.USER_DATA_PATH}/hello.txt`, 'some text', 'utf8')
} catch(e) {
  console.error(e)
}
``` */
  appendFileSync(
    /** 要追加内容的文件路径 (本地路径) */
    filePath: string,
    /** 要追加的文本或二进制数据 */
    data: string | ArrayBuffer,
    /** 指定写入文件的字符编码
     *
     * 参数 encoding 可选值：
     * - 'ascii': ;
     * - 'base64': ;
     * - 'binary': ;
     * - 'hex': ;
     * - 'ucs2': 以小端序读取;
     * - 'ucs-2': 以小端序读取;
     * - 'utf16le': 以小端序读取;
     * - 'utf-16le': 以小端序读取;
     * - 'utf-8': ;
     * - 'utf8': ;
     * - 'latin1': ; */
    encoding?:
      | "ascii"
      | "base64"
      | "binary"
      | "hex"
      | "ucs2"
      | "ucs-2"
      | "utf16le"
      | "utf-16le"
      | "utf-8"
      | "utf8"
      | "latin1",
  ): void;
  /** [FileSystemManager.close(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.close.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 关闭文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
// 打开文件
fs.open({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+',
  success(res) {
    // 关闭文件
    fs.close({
      fd: res.fd
    })
  }
})
``` */
  close(option: FileSystemManagerCloseOption): void;
  /** [FileSystemManager.copyFile(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.copyFile.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 复制文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.copyFile({
  srcPath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  destPath: `${wx.env.USER_DATA_PATH}/hello_copy.txt`
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  fs.copyFileSync(
    `${wx.env.USER_DATA_PATH}/hello.txt`,
    `${wx.env.USER_DATA_PATH}/hello_copy.txt`
  )
} catch(e) {
  console.error(e)
}
``` */
  copyFile(option: CopyFileOption): void;
  /** [FileSystemManager.copyFileSync(string srcPath, string destPath)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.copyFileSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.copyFile](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.copyFile.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.copyFile({
  srcPath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  destPath: `${wx.env.USER_DATA_PATH}/hello_copy.txt`
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  fs.copyFileSync(
    `${wx.env.USER_DATA_PATH}/hello.txt`,
    `${wx.env.USER_DATA_PATH}/hello_copy.txt`
  )
} catch(e) {
  console.error(e)
}
``` */
  copyFileSync(
    /** 源文件路径，支持本地路径 */
    srcPath: string,
    /** 目标文件路径，支持本地路径 */
    destPath: string,
  ): void;
  /** [FileSystemManager.fstat(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.fstat.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 获取文件的状态信息
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
// 打开文件
fs.open({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+',
  success(res) {
    // 获取文件的状态信息
    fs.fstat({
      fd: res.fd,
      success(res) {
        console.log(res.stats)
      }
    })
  }
})
``` */
  fstat(option: FstatOption): void;
  /** [FileSystemManager.ftruncate(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.ftruncate.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 对文件内容进行截断操作
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
// 打开文件
fs.open({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+',
  success(res) {
    // 对文件内容进行截断操作
    fs.ftruncate({
      fd: res.fd,
      length: 10, // 从第10个字节开始截断文件
      success(res) {
        console.log(res)
      }
    })
  }
})
``` */
  ftruncate(option: FtruncateOption): void;
  /** [FileSystemManager.getFileInfo(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.getFileInfo.html)
   *
   * 在插件中使用：不支持
   *
   * 获取该小程序下的 本地临时文件 或 本地缓存文件 信息 */
  getFileInfo(option: GetFileInfoOption): void;
  /** [FileSystemManager.getSavedFileList(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.getSavedFileList.html)
   *
   * 在插件中使用：不支持
   *
   * 获取该小程序下已保存的本地缓存文件列表 */
  getSavedFileList(option?: GetSavedFileListOption): void;
  /** [FileSystemManager.mkdir(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.mkdir.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 创建目录
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.mkdir({
  dirPath: `${wx.env.USER_DATA_PATH}/example`,
  recursive: false,
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  fs.mkdirSync(`${wx.env.USER_DATA_PATH}/example`, false)
} catch(e) {
  console.error(e)
}
``` */
  mkdir(option: MkdirOption): void;
  /** [FileSystemManager.mkdirSync(string dirPath, boolean recursive)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.mkdirSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.mkdir](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.mkdir.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.mkdir({
  dirPath: `${wx.env.USER_DATA_PATH}/example`,
  recursive: false,
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  fs.mkdirSync(`${wx.env.USER_DATA_PATH}/example`, false)
} catch(e) {
  console.error(e)
}
``` */
  mkdirSync(
    /** 创建的目录路径 (本地路径) */
    dirPath: string,
    /** 需要基础库： `2.3.0`
     *
     * 是否在递归创建该目录的上级目录后再创建该目录。如果对应的上级目录已经存在，则不创建该上级目录。如 dirPath 为 a/b/c/d 且 recursive 为 true，将创建 a 目录，再在 a 目录下创建 b 目录，以此类推直至创建 a/b/c 目录下的 d 目录。 */
    recursive?: boolean,
  ): void;
  /** [FileSystemManager.open(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.open.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 打开文件，返回文件描述符
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.open({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+',
  success(res) {
    console.log(res.fd)
  }
})
``` */
  open(option: OpenOption): void;
  /** [FileSystemManager.read(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.read.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 读文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
const ab = new ArrayBuffer(1024)
// 打开文件
fs.open({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+',
  success(res) {
    // 读取文件到 ArrayBuffer 中
    fs.read({
      fd: res.fd,
      arrayBuffer: ab,
      length: 10,
      success(res) {
        console.log(res)
      }
    })
  }
})
```
* ## 注意事项
* - 小游戏 iOS 高性能模式（iOSHighPerformance）暂不支持 FileSystemManager.read 接口，请使用 FileSystemManager.readFile 接口代替 */
  read(option: ReadOption): void;
  /** [FileSystemManager.readCompressedFile(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readCompressedFile.html)
*
* 需要基础库： `2.21.1`
*
* 在插件中使用：不支持
*
* 读取指定压缩类型的本地文件内容
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()

// 异步接口
fs.readCompressedFile({
  filePath: '${wx.env.USER_DATA_PATH}/hello.br',
  compressionAlgorithm: 'br',
  success(res) {
    console.log(res.data)
  },
  fail(res) {
    console.log('readCompressedFile fail', res)
  }
})

// 同步接口
const data = fs.readCompressedFileSync({
  filePath: '${wx.env.USER_DATA_PATH}/hello.br',
  compressionAlgorithm: 'br',
})
console.log(data)
``` */
  readCompressedFile(option: ReadCompressedFileOption): void;
  /** [FileSystemManager.readFile(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readFile.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 读取本地文件内容。单个文件大小上限为100M。
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.readFile({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  encoding: 'utf8',
  position: 0,
  success(res) {
    console.log(res.data)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.readFileSync(`${wx.env.USER_DATA_PATH}/hello.txt`, 'utf8', 0)
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  readFile(option: ReadFileOption): void;
  /** [FileSystemManager.readZipEntry(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readZipEntry.html)
*
* 需要基础库： `2.17.3`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 读取压缩包内的文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
// 读取zip内某个或多个文件
fs.readZipEntry({
  filePath: 'wxfile://from/to.zip',
  entries: [{
    path: 'some_folder/my_file.txt', // zip内文件路径
    encoding: 'utf-8', // 指定读取文件的字符编码，如果不传 encoding，则以 ArrayBuffer 格式读取文件的二进制内容
    position: 0, // 从文件指定位置开始读，如果不指定，则从文件头开始读。读取的范围应该是左闭右开区间 [position, position+length)。有效范围：[0, fileLength - 1]。单位：byte
    length: 10000, // 指定文件的长度，如果不指定，则读到文件末尾。有效范围：[1, fileLength]。单位：byte
  }, {
    path: 'other_folder/orther_file.txt', // zip内文件路径
  }],
  success(res) {
    console.log(res.entries)
    // res.entries === {
    //     'some_folder/my_file.txt': {
    //         errMsg: 'readZipEntry:ok',
    //         data: 'xxxxxx'
    //     },
    //     'other_folder/orther_file.txt': {
    //         data: (ArrayBuffer)
    //     }
    // }
  },
  fail(res) {
    console.log(res.errMsg)
  },
})

// 读取zip内所有文件。允许指定统一的encoding。position、length则不再允许指定，分别默认为0和文件长度
fs.readZipEntry({
  filePath: 'wxfile://from/to.zip',
  entries: 'all'
  encoding: 'utf-8', // 统一指定读取文件的字符编码，如果不传 encoding，则以 ArrayBuffer 格式读取文件的二进制内容
  success(res) {
    console.log(res.entries)
    // res.entries === {
    //     'some_folder/my_file.txt': {
    //         errMsg: 'readZipEntry:ok',
    //         data: 'xxxxxx'
    //     },
    //     'other_folder/orther_file.txt': {
    //         errMsg: 'readZipEntry:ok',
    //         data: 'xxxxxx'
    //     }
    //  }
  },
  fail(res) {
    console.log(res.errMsg)
  },
})
``` */
  readZipEntry(option: ReadZipEntryOption): void;
  /** [FileSystemManager.readdir(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readdir.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 读取目录内文件列表
*
* **注意事项**
*
* - readdir接口无法访问文件系统根路径(wxfile://)。
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.readdir({
  dirPath: `${wx.env.USER_DATA_PATH}/example`,
  success(res) {
    console.log(res.files)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.readdirSync(`${wx.env.USER_DATA_PATH}/example`)
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  readdir(option: ReaddirOption): void;
  /** [FileSystemManager.removeSavedFile(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.removeSavedFile.html)
   *
   * 在插件中使用：不支持
   *
   * 删除该小程序下已保存的本地缓存文件 */
  removeSavedFile(option: RemoveSavedFileOption): void;
  /** [FileSystemManager.rename(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.rename.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 重命名文件。可以把文件从 oldPath 移动到 newPath
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.rename({
  oldPath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  newPath: `${wx.env.USER_DATA_PATH}/hello_new.txt`,
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.renameSync(
    `${wx.env.USER_DATA_PATH}/hello.txt`,
    `${wx.env.USER_DATA_PATH}/hello_new.txt`
  )
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  rename(option: RenameOption): void;
  /** [FileSystemManager.renameSync(string oldPath, string newPath)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.renameSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.rename](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.rename.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.rename({
  oldPath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  newPath: `${wx.env.USER_DATA_PATH}/hello_new.txt`,
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.renameSync(
    `${wx.env.USER_DATA_PATH}/hello.txt`,
    `${wx.env.USER_DATA_PATH}/hello_new.txt`
  )
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  renameSync(
    /** 源文件路径，支持本地路径 */
    oldPath: string,
    /** 新文件路径，支持本地路径 */
    newPath: string,
  ): void;
  /** [FileSystemManager.rmdir(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.rmdir.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 删除目录
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.rmdir({
  dirPath: `${wx.env.USER_DATA_PATH}/example`,
  recursive: false,
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.rmdirSync(`${wx.env.USER_DATA_PATH}/example`, false)
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  rmdir(option: RmdirOption): void;
  /** [FileSystemManager.rmdirSync(string dirPath, boolean recursive)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.rmdirSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.rmdir](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.rmdir.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.rmdir({
  dirPath: `${wx.env.USER_DATA_PATH}/example`,
  recursive: false,
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.rmdirSync(`${wx.env.USER_DATA_PATH}/example`, false)
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  rmdirSync(
    /** 要删除的目录路径 (本地路径) */
    dirPath: string,
    /** 需要基础库： `2.3.0`
     *
     * 是否递归删除目录。如果为 true，则删除该目录和该目录下的所有子目录以及文件。 */
    recursive?: boolean,
  ): void;
  /** [FileSystemManager.saveFile(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.saveFile.html)
   *
   * 在插件中使用：不支持
   *
   * 保存临时文件到本地。此接口会移动临时文件，因此调用成功后，tempFilePath 将不可用。 */
  saveFile(option: SaveFileOption): void;
  /** [FileSystemManager.stat(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.stat.html)
   *
   * 在插件中使用：需要基础库 `2.19.2`
   *
   * 获取文件 Stats 对象 */
  stat(option: StatOption): void;
  /** [FileSystemManager.truncate(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.truncate.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 对文件内容进行截断操作
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.truncate({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  length: 10, // 从第10个字节开始截断
  success(res) {
    console.log(res)
  }
})
``` */
  truncate(option: TruncateOption): void;
  /** [FileSystemManager.unlink(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.unlink.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 删除文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.unlink({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.unlinkSync(`${wx.env.USER_DATA_PATH}/hello.txt`)
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  unlink(option: UnlinkOption): void;
  /** [FileSystemManager.unlinkSync(string filePath)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.unlinkSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.unlink](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.unlink.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.unlink({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.unlinkSync(`${wx.env.USER_DATA_PATH}/hello.txt`)
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  unlinkSync(
    /** 要删除的文件路径 (本地路径) */
    filePath: string,
  ): void;
  /** [FileSystemManager.unzip(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.unzip.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 解压文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.unzip({
  zipFilePath: `${wx.env.USER_DATA_PATH}/example.zip`,
  targetPath: '${wx.env.USER_DATA_PATH}/example',
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})
``` */
  unzip(option: UnzipOption): void;
  /** [FileSystemManager.write(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.write.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 写入文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
// 打开文件
fs.open({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+',
  success(res) {
    // 写入文件
    fs.write({
      fd: res.fd,
      data: 'some text',
      success(res) {
        console.log(res.bytesWritten)
      }
    })
  }
})
``` */
  write(option: WriteOption): void;
  /** [FileSystemManager.writeFile(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.writeFile.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 写文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.writeFile({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  data: 'some text or arrayBuffer',
  encoding: 'utf8',
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.writeFileSync(
    `${wx.env.USER_DATA_PATH}/hello.txt`,
    'some text or arrayBuffer',
    'utf8'
  )
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  writeFile(option: WriteFileOption): void;
  /** [FileSystemManager.writeFileSync(string filePath, string|ArrayBuffer data, string encoding)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.writeFileSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.writeFile](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.writeFile.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.writeFile({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  data: 'some text or arrayBuffer',
  encoding: 'utf8',
  success(res) {
    console.log(res)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.writeFileSync(
    `${wx.env.USER_DATA_PATH}/hello.txt`,
    'some text or arrayBuffer',
    'utf8'
  )
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  writeFileSync(
    /** 要写入的文件路径 (本地路径) */
    filePath: string,
    /** 要写入的文本或二进制数据 */
    data: string | ArrayBuffer,
    /** 指定写入文件的字符编码
     *
     * 参数 encoding 可选值：
     * - 'ascii': ;
     * - 'base64': （注意，选择 base64 编码，data 只需要传 base64 内容本身，不要传 Data URI 前缀，否则会报 fail base64 encode error 错误。例如，传 aGVsbG8= 而不是传 data:image/png;base64,aGVsbG8= ）;
     * - 'binary': ;
     * - 'hex': ;
     * - 'ucs2': 以小端序读取;
     * - 'ucs-2': 以小端序读取;
     * - 'utf16le': 以小端序读取;
     * - 'utf-16le': 以小端序读取;
     * - 'utf-8': ;
     * - 'utf8': ;
     * - 'latin1': ; */
    encoding?:
      | "ascii"
      | "base64"
      | "binary"
      | "hex"
      | "ucs2"
      | "ucs-2"
      | "utf16le"
      | "utf-16le"
      | "utf-8"
      | "utf8"
      | "latin1",
  ): void;
  /** [[ReadResult](https://developers.weixin.qq.com/miniprogram/dev/api/file/ReadResult.html) FileSystemManager.readSync(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readSync.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 读文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
const ab = new ArrayBuffer(1024)
const fd = fs.openSync({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+'
})
const res = fs.readSync({
  fd: fd,
  arrayBuffer: ab,
  length: 10
})
console.log(res)
```
* ## 注意事项
* - 小游戏 iOS 高性能模式（iOSHighPerformance）暂不支持 FileSystemManager.readSync 接口，请使用 FileSystemManager.readFileSync 接口代替 */
  readSync(option: ReadSyncOption): ReadResult;
  /** [[Stats](https://developers.weixin.qq.com/miniprogram/dev/api/file/Stats.html) FileSystemManager.fstatSync(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.fstatSync.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 同步获取文件的状态信息
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
const fd = fs.openSync({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+'
})
const stats = fs.fstatSync({fd: fd})
console.log(stats)
``` */
  fstatSync(option: FstatSyncOption): Stats;
  /** [[Stats](https://developers.weixin.qq.com/miniprogram/dev/api/file/Stats.html)|Array.&lt;[FileStats](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileStats.html)&gt; FileSystemManager.statSync(string path, boolean recursive)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.statSync.html)
   *
   * 在插件中使用：需要基础库 `2.19.2`
   *
   * [FileSystemManager.stat](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.stat.html) 的同步版本 */
  statSync(
    /** 文件/目录路径 (本地路径) */
    path: string,
    /** 需要基础库： `2.3.0`
     *
     * 是否递归获取目录下的每个文件的 Stats 信息 */
    recursive?: boolean,
  ): Stats | FileStats[];
  /** [[WriteResult](https://developers.weixin.qq.com/miniprogram/dev/api/file/WriteResult.html) FileSystemManager.writeSync(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.writeSync.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 同步写入文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
const fd = fs.openSync({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+'
})
const res = fs.writeSync({
  fd: fd,
  data: 'some text'
})
console.log(res.bytesWritten)
``` */
  writeSync(option: WriteSyncOption): WriteResult;
  /** [string FileSystemManager.openSync(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.openSync.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 同步打开文件，返回文件描述符
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
const fd = fs.openSync({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+'
})
console.log(fd)
``` */
  openSync(option: OpenSyncOption): string;
  /** [string FileSystemManager.saveFileSync(string tempFilePath, string filePath)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.saveFileSync.html)
   *
   * 在插件中使用：不支持
   *
   * [FileSystemManager.saveFile](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.saveFile.html) 的同步版本 */
  saveFileSync(
    /** 临时存储文件路径 (本地路径) */
    tempFilePath: string,
    /** 要存储的文件路径 (本地路径) */
    filePath?: string,
  ): string;
  /** [string|ArrayBuffer FileSystemManager.readFileSync(string filePath, string encoding, number position, number length)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readFileSync.html)
*
* 在插件中使用：需要基础库 `2.19.2`
*
* [FileSystemManager.readFile](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readFile.html) 的同步版本
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.readFile({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  encoding: 'utf8',
  position: 0,
  success(res) {
    console.log(res.data)
  },
  fail(res) {
    console.error(res)
  }
})

// 同步接口
try {
  const res = fs.readFileSync(`${wx.env.USER_DATA_PATH}/hello.txt`, 'utf8', 0)
  console.log(res)
} catch(e) {
  console.error(e)
}
``` */
  readFileSync(
    /** 要读取的文件的路径 (本地路径) */
    filePath: string,
    /** 指定读取文件的字符编码，如果不传 encoding，则以 ArrayBuffer 格式读取文件的二进制内容
     *
     * 参数 encoding 可选值：
     * - 'ascii': ;
     * - 'base64': ;
     * - 'binary': ;
     * - 'hex': ;
     * - 'ucs2': 以小端序读取;
     * - 'ucs-2': 以小端序读取;
     * - 'utf16le': 以小端序读取;
     * - 'utf-16le': 以小端序读取;
     * - 'utf-8': ;
     * - 'utf8': ;
     * - 'latin1': ; */
    encoding?:
      | "ascii"
      | "base64"
      | "binary"
      | "hex"
      | "ucs2"
      | "ucs-2"
      | "utf16le"
      | "utf-16le"
      | "utf-8"
      | "utf8"
      | "latin1",
    /** 需要基础库： `2.10.0`
     *
     * 从文件指定位置开始读，如果不指定，则从文件头开始读。读取的范围应该是左闭右开区间 [position, position+length)。有效范围：[0, fileLength - 1]。单位：byte */
    position?: number,
    /** 需要基础库： `2.10.0`
     *
     * 指定文件的长度，如果不指定，则读到文件末尾。有效范围：[1, fileLength]。单位：byte */
    length?: number,
  ): string | ArrayBuffer;
  /** [undefined FileSystemManager.closeSync(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.closeSync.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 同步关闭文件
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
const fd = fs.openSync({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+'
})

// 关闭文件
fs.closeSync({fd: fd})
``` */
  closeSync(option: CloseSyncOption): undefined;
  /** [undefined FileSystemManager.ftruncateSync(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.ftruncateSync.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 对文件内容进行截断操作
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
const fd = fs.openSync({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  flag: 'a+'
})
fs.ftruncateSync({
  fd: fd,
  length: 10 // 从第10个字节开始截断文件
})
``` */
  ftruncateSync(option: FtruncateSyncOption): undefined;
  /** [undefined FileSystemManager.truncateSync(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.truncateSync.html)
*
* 需要基础库： `2.16.1`
*
* 在插件中使用：需要基础库 `2.19.2`
*
* 对文件内容进行截断操作 (truncate 的同步版本)
*
* **示例代码**
*
* ```js
const fs = wx.getFileSystemManager()
fs.truncateSync({
  filePath: `${wx.env.USER_DATA_PATH}/hello.txt`,
  length: 10, // 从第10个字节开始截断
})
``` */
  truncateSync(option: TruncateSyncOption): undefined;
}

const fileStorage = new Map<string, string>();
const savedFiles = new Map<string, FileItem>();

const encodingBufferMap = new Map<string, ArrayBuffer>();

const fileSystemManager: FileSystemManager = {
  readdirSync(dirPath: string): string[] {
    const files: string[] = [];
    for (const [path] of fileStorage) {
      if (path.startsWith(dirPath)) {
        const relativePath = path.slice(dirPath.length);
        const match = relativePath.match(/^\/([^/]+)/);
        if (match && !files.includes(match[1])) 
          files.push(match[1]);
        
      }
    }
    return files;
  },

  readCompressedFileSync(option: ReadCompressedFileSyncOption): ArrayBuffer {
    const data = fileStorage.get(option.filePath);
    if (!data) 
      throw { errMsg: "no such file or directory " + option.filePath, errno: -1 };
    
    return new TextEncoder().encode(data).buffer;
  },

  access(option: AccessOption): void {
    const exists = fileStorage.has(option.path);
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (exists) {
        if (option.success) option.success({ errMsg: "" });
      } else {
        if (option.fail) option.fail({ errMsg: "no such file or directory " + option.path, errno: -1 });
      }
    }, 0);
  },

  accessSync(path: string): void {
    if (!fileStorage.has(path)) 
      throw { errMsg: "no such file or directory " + path, errno: -1 };
    
  },

  appendFile(option: AppendFileOption): void {
    const content = typeof option.data === "string" ? option.data : new TextDecoder().decode(option.data);
    const existing = fileStorage.get(option.filePath) ?? "";
    fileStorage.set(option.filePath, existing + content);

    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  appendFileSync(
    filePath: string,
    data: string | ArrayBuffer,
    encoding?:
      | "ascii"
      | "base64"
      | "binary"
      | "hex"
      | "ucs2"
      | "ucs-2"
      | "utf16le"
      | "utf-16le"
      | "utf-8"
      | "utf8"
      | "latin1",
  ): void {
    const content = typeof data === "string" ? data : new TextDecoder().decode(data);
    const existing = fileStorage.get(filePath) ?? "";
    fileStorage.set(filePath, existing + content);
  },

  close(option: FileSystemManagerCloseOption): void {
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  copyFile(option: CopyFileOption): void {
    const content = fileStorage.get(option.srcPath);
    if (content === undefined) {
      if (option.fail) 
        option.fail({ errMsg: "no such file or directory " + option.srcPath, errno: -1 });
      
      return;
    }
    fileStorage.set(option.destPath, content);

    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  copyFileSync(srcPath: string, destPath: string): void {
    const content = fileStorage.get(srcPath);
    if (content === undefined) 
      throw { errMsg: "no such file or directory " + srcPath, errno: -1 };
    
    fileStorage.set(destPath, content);
  },

  fstat(option: FstatOption): void {
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) {
        option.success({
          stats: {
            lastAccessedTime: Date.now(),
            lastModifiedTime: Date.now(),
            mode: 0,
            size: 0,
            isDirectory: () => false,
            isFile: () => true,
          },
          errMsg: "",
        });
      }
    }, 0);
  },

  ftruncate(option: FtruncateOption): void {
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  getFileInfo(option: GetFileInfoOption): void {
    const content = fileStorage.get(option.filePath);
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (content !== undefined) {
        if (option.success) {
          option.success({
            digest: "",
            size: content.length,
            errMsg: "",
          });
        }
      } else {
        if (option.fail) 
          option.fail({ errMsg: "no such file or directory " + option.filePath, errno: -1 });
        
      }
    }, 0);
  },

  getSavedFileList(option?: GetSavedFileListOption): void {
    const fileList = [...savedFiles.values()];
    if (!option || (!option.success && !option.fail && !option.complete)) 
      return Promise.resolve({ fileList, errMsg: "" });
    
    setTimeout(() => {
      if (option.success) option.success({ fileList, errMsg: "" });
    }, 0);
  },

  mkdir(option: MkdirOption): void {
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  mkdirSync(dirPath: string, recursive?: boolean): void {
    // No-op for mock
  },

  open(option: OpenOption): void {
    const fd = `mock_fd_${Date.now()}`;
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ fd, errMsg: "" });
    }, 0);
  },

  read(option: ReadOption): void {
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) {
        option.success({
          arrayBuffer: option.arrayBuffer,
          bytesRead: 0,
          errMsg: "",
        });
      }
    }, 0);
  },

  readCompressedFile(option: ReadCompressedFileOption): void {
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) {
        option.success({
          data: new ArrayBuffer(0),
          errMsg: "",
        });
      }
    }, 0);
  },

  readFile(option: ReadFileOption): void {
    const content = fileStorage.get(option.filePath);
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (content !== undefined) {
        if (option.success) 
          option.success({ data: content as string | ArrayBuffer, errMsg: "" });
        
      } else {
        if (option.fail) 
          option.fail({ errMsg: "no such file or directory " + option.filePath, errno: -1 });
        
      }
    }, 0);
  },

  readZipEntry(option: ReadZipEntryOption): void {
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) 
        option.success({ entries: {}, errMsg: "" });
      
    }, 0);
  },

  readdir(option: ReaddirOption): void {
    const files = fileSystemManager.readdirSync(option.dirPath);
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ files, errMsg: "" });
    }, 0);
  },

  removeSavedFile(option: RemoveSavedFileOption): void {
    savedFiles.delete(option.filePath);
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  rename(option: RenameOption): void {
    const content = fileStorage.get(option.oldPath);
    if (content === undefined) {
      if (option.fail) 
        option.fail({ errMsg: "no such file or directory " + option.oldPath, errno: -1 });
      
      return;
    }
    fileStorage.set(option.newPath, content);
    fileStorage.delete(option.oldPath);

    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  renameSync(oldPath: string, newPath: string): void {
    const content = fileStorage.get(oldPath);
    if (content === undefined) 
      throw { errMsg: "no such file or directory " + oldPath, errno: -1 };
    
    fileStorage.set(newPath, content);
    fileStorage.delete(oldPath);
  },

  truncate(option: TruncateOption): void {
    if (!option.success && !option.fail && !option.complete) 
      return;
    
    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  truncateSync(option: TruncateSyncOption): void {
    // Mock implementation - actual truncation would modify file content
  },

  readSync(option: ReadSyncOption): ReadResult {
    return {
      arrayBuffer: option.arrayBuffer,
      bytesRead: 0,
    };
  },

  fstatSync(option: FstatSyncOption): Stats {
    return {
      lastAccessedTime: Date.now(),
      lastModifiedTime: Date.now(),
      mode: 0,
      size: 0,
      isDirectory: () => false,
      isFile: () => true,
    };
  },

  readFileSync(
    filePath: string,
    encoding?:
      | "ascii"
      | "base64"
      | "binary"
      | "hex"
      | "ucs2"
      | "ucs-2"
      | "utf16le"
      | "utf-16le"
      | "utf-8"
      | "utf8"
      | "latin1",
    position?: number,
    length?: number,
  ): string | ArrayBuffer {
    const content = fileStorage.get(filePath);
    if (content === undefined) 
      throw { errMsg: "no such file or directory " + filePath, errno: -1 };
    
    return content;
  },
};

export const getFileSystemManager = (): FileSystemManager => fileSystemManager;
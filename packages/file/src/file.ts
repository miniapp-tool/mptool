import { logger } from "@mptool/shared";

/** 文件编码 */
type FileEncoding =
  | "utf-8"
  | "ascii"
  | "base64"
  | "binary"
  | "hex"
  | "ucs2"
  | "ucs-2"
  | "utf16le"
  | "utf-16le"
  | "utf8"
  | "latin1";

/** 文件管理器 */
const fileManager = wx.getFileSystemManager();
/** 用户文件夹路径 */
const userPath = wx.env.USER_DATA_PATH;

export const dirname = (path: string): string =>
  path.split("/").slice(0, -1).join("/");

/** 判断文件或文件夹是否存在 */
export const exists = (path: string): boolean => {
  try {
    fileManager.statSync(`${userPath}/${path}`, false);

    return true;
  } catch (err) {
    return false;
  }
};

/** 是否是文件 */
export const isFile = (path: string): boolean =>
  exists(path) &&
  (
    fileManager.statSync(`${userPath}/${path}`) as WechatMiniprogram.Stats
  ).isFile();

/** 是否是文件夹 */
export const isDir = (path: string): boolean =>
  exists(path) &&
  (
    fileManager.statSync(`${userPath}/${path}`) as WechatMiniprogram.Stats
  ).isDirectory();

/**
 * 删除文件或文件夹
 *
 * @description 传入 `type` 可以略微提升删除性能
 *
 * @param path 要删除的文件或文件夹路径
 * @param type 要删除的类型
 */
export const rm = (
  path: string,
  type: "dir" | "file" = isDir(path) ? "dir" : "file"
): void => {
  const deleteLog = (): void => logger.debug(`Deleted ${path}`);
  const errorLog = (err: unknown): void =>
    logger.error(`Error deleting ${path}:`, err);

  if (type === "dir")
    try {
      fileManager.rmdirSync(`${userPath}/${path}`, true);
      deleteLog();
    } catch (err) {
      errorLog(err);
    }
  else
    try {
      fileManager.unlinkSync(`${userPath}/${path}`);
      deleteLog();
    } catch (err) {
      errorLog(err);
    }
};

/** 列出目录下内容 */
export const ls = (path: string): string[] => {
  try {
    const fileList = fileManager.readdirSync(`${userPath}/${path}`);

    logger.debug(`Listing ${path} folder:`, fileList);

    return fileList;
  } catch (err) {
    logger.error(`Error listing ${path} folder:`, err);

    return [];
  }
};

/**
 * 文件管理器读取文件包装
 *
 * @param path 待读取文件相对用户文件夹的路径
 * @param encoding 文件的编码格式，默认 `utf-8`
 * @returns 文件内容
 */
export const readFile = (
  path: string,
  encoding: FileEncoding = "utf-8"
): string | ArrayBuffer | undefined => {
  try {
    return fileManager.readFileSync(`${userPath}/${path}`, encoding);
  } catch (err) {
    logger.warn(`${path} don't exist`);

    return undefined;
  }
};

/**
 * 读取并解析 JSON 文件
 *
 * @param path JSON 文件路径，无需后缀
 * @param encoding 文件的编码格式，默认 `utf-8`
 * @returns JSON 文件内容
 */
export const readJSON = <T = unknown>(
  path: string,
  encoding: FileEncoding = "utf-8"
): T | undefined => {
  let data;

  try {
    const fileContent = fileManager.readFileSync(
      `${userPath}/${path}.json`,
      encoding
    );
    try {
      data = JSON.parse(fileContent as string) as T;

      logger.debug(`Read ${path}.json success:`, data);
    } catch (err) {
      data = undefined;

      // 调试
      logger.warn(`Parse ${path}.json failed`);
    }
  } catch (err) {
    data = undefined;

    // 调试
    logger.warn(`${path}.json doesn't exist`);
  }

  return data;
};

/**
 * 创建目录
 *
 * @param path 要创建的目录路径
 * @param recursive 是否递归
 */
export const mkdir = (path: string, recursive = true): void => {
  try {
    fileManager.mkdirSync(`${userPath}/${path}`, recursive);
  } catch (err) {
    // 调试
    logger.debug(`${path} folder already exists`);
  }
};

/**
 * 保存文件
 *
 * @param tempFilePath 缓存文件路径
 * @param path 保存文件路径
 */
export const saveFile = (tempFilePath: string, path: string): void => {
  try {
    fileManager.saveFileSync(tempFilePath, `${userPath}/${path}`);
  } catch (err) {
    logger.error(`Saving to ${path} failed:`, err);
  }
};

/** 保存在线文件选项接口 */
export interface SaveOnlineFileOption {
  /** 在线文件路径 */
  onlinePath: string;
  /** 本地保存路径 */
  savePath: string;
  /** 本地保存文件名 */
  saveName: string;
  /** 成功回调函数 */
  success?: (path: string) => void;
  /** 失败回调函数 */
  fail?: (errMsg: WechatMiniprogram.GeneralCallbackResult) => void;
  /** 状态码错误回调函数 */
  error?: (statusCode: number) => void;
}

/**
 * 保存在线文件
 *
 * @param options 配置
 */
export const saveOnlineFile = ({
  onlinePath,
  savePath,
  saveName,
  success,
  fail,
  error: errorFunc,
}: SaveOnlineFileOption): void => {
  mkdir(savePath);
  wx.downloadFile({
    url: onlinePath,
    filePath: `${userPath}/${savePath}/${saveName}`,
    success: (res) => {
      if (res.statusCode === 200) {
        logger.info(`${onlinePath} saved`);
        if (success) success(res.tempFilePath);
      } else {
        logger.error(
          `Download ${onlinePath} failed with statusCode ${res.statusCode}`
        );
        if (errorFunc) errorFunc(res.statusCode);
      }
    },
    fail: (failMsg) => {
      logger.error(`Download ${onlinePath} failed:`, failMsg);
      if (fail) fail(failMsg);
    },
  });
};

/**
 * 写入文件
 *
 * @param path 写入文件的路径，若文件夹不存在会自动创建
 * @param fileName 写入文件的文件名
 * @param data 写入文件的数据，可接受任意可序列化的数据或 Buffer
 * @param encoding 文件编码选项，默认 `utf-8` (数据) 或 `binary` (Buffer)
 */
export const writeFile = <T = unknown>(
  path: string,
  fileName: string,
  data: T,
  encoding: FileEncoding = data instanceof ArrayBuffer ? "binary" : "utf-8"
): void => {
  mkdir(path);
  fileManager.writeFileSync(
    `${userPath}/${path}/${fileName}`,
    data instanceof ArrayBuffer ? data : JSON.stringify(data),
    encoding
  );
};

/**
 * 写入 JSON 文件
 *
 * @param path 写入文件的路径，不含 `.json`，若父文件夹不存在会自动创建
 * @param fileName 写入文件的文件名
 * @param data 写入文件的数据，可接受任意可序列化的数据
 * @param encoding 文件编码选项，默认 `utf-8`
 */
export const writeJSON = <T = unknown>(
  path: string,
  data: T,
  encoding: FileEncoding = "utf-8"
): void => {
  const jsonString = JSON.stringify(data);

  mkdir(dirname(path));
  fileManager.writeFileSync(`${userPath}/${path}.json`, jsonString, encoding);
};

/**
 * 解压文件
 *
 * @param path 压缩文件路径
 * @param unzipPath 解压路径
 * @param successFunc 回调函数
 */
export const unzip = (
  path: string,
  unzipPath: string,
  successFunc?: () => void
): void => {
  fileManager.unzip({
    zipFilePath: `${userPath}/${path}`,
    targetPath: `${userPath}/${unzipPath}`,
    success: () => {
      if (successFunc) successFunc();
    },
    fail: (failMsg) => {
      logger.error(`Unzip ${path} failed:`, failMsg);
    },
  });
};

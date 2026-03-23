import { storageApi } from "./storage.js";
import { getFileSystemManager } from "./file.js";

const wxMock = {
  version: "test",
  env: {
    USER_DATA_PATH: "wxfile://",
  },

  ...storageApi,

  getFileSystemManager,

  getRealtimeLogManager(): Pick<
    Console,
    "debug" | "error" | "group" | "groupEnd" | "info" | "log" | "warn"
  > {
    return console;
  },

  getLogManager(_options?: {
    level?: number;
  }): Pick<Console, "debug" | "error" | "group" | "groupEnd" | "info" | "log" | "warn"> {
    return console;
  },

  // getFileSystemManager(): FileSystemManager {
  //   return new FileSystemManager();
  // },

  downloadFile(option?: {
    url: string;
    filePath?: string;
    header?: Record<string, string>;
    success?: (result: { tempFilePath: string; statusCode: number }) => void;
    fail?: (result: { errMsg: string; statusCode?: number }) => void;
    complete?: (result: { errMsg: string }) => void;
  }): void | Promise<{ tempFilePath: string; statusCode: number }> {
    if (!option) return Promise.resolve({ tempFilePath: "", statusCode: 0 });

    if (!option.success && !option.fail && !option.complete) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            tempFilePath: option.filePath ?? `mock://temp/${Date.now()}`,
            statusCode: 200,
          });
        }, 0);
      });
    }

    setTimeout(() => {
      if (option.success) {
        option.success({
          tempFilePath: option.filePath ?? `mock://temp/${Date.now()}`,
          statusCode: 200,
        });
      }
    }, 0);
  },
};

(globalThis as typeof globalThis & { wx: typeof wxMock }).wx = wxMock;

export const wx = wxMock;

import { getFileSystemManager } from "./fileSystem.js";
import { frameworkApiMethods, setFrameworkMock } from "./framework.js";
import { networkApi } from "./network.js";
import { storageApi } from "./storage.js";
import { uiApi } from "./ui.js";

// 设置全局 Page/App/Component/Behavior/getCurrentPages mock
setFrameworkMock();

interface MockDownloadTask {
  onProgressUpdate: (callback: (result: { progress: number }) => void) => void;
  onHeadersReceived: (callback: () => void) => void;
  offProgressUpdate: (callback: (result: { progress: number }) => void) => void;
  offHeadersReceived: (callback: () => void) => void;
  abort: () => void;
}

const downloadTask = (): MockDownloadTask => ({
  onProgressUpdate: (): void => void 0,
  onHeadersReceived: (): void => void 0,
  offProgressUpdate: (): void => void 0,
  offHeadersReceived: (): void => void 0,
  abort: (): void => void 0,
});

const wxMock = {
  version: "test",
  env: {
    USER_DATA_PATH: "wxfile://",
  },

  ...storageApi,
  ...networkApi,
  ...uiApi,
  ...frameworkApiMethods,

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

  getFileSystemManager,

  downloadFile(option?: {
    url: string;
    filePath?: string;
    header?: Record<string, string>;
    success?: (result: { tempFilePath: string; statusCode: number }) => void;
    fail?: (result: { errMsg: string; statusCode?: number }) => void;
    complete?: (result: { errMsg: string }) => void;
  }): void | Promise<{ tempFilePath: string; statusCode: number }> | MockDownloadTask {
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

    return downloadTask();
  },
};

(globalThis as typeof globalThis & { wx: typeof wxMock }).wx = wxMock;

export const wx = wxMock;
export { frameworkApi } from "./framework.js";

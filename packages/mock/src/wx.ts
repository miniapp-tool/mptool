import { a2ExtraApi } from "./apis/a2-extra.js";
import { baseApi } from "./apis/base.js";
import { eventApi } from "./apis/events.js";
import { managersApi } from "./apis/managers.js";
import { miscApi } from "./apis/misc.js";
import { deviceApi } from "./device.js";
import { fileApi, getFileSystemManager } from "./fileSystem.js";
import { frameworkApiMethods, setFrameworkMock } from "./framework.js";
import { instrumentWx } from "./instrument.js";
import { networkApi } from "./network.js";
import { storageApi } from "./storage.js";
import { uiApi } from "./ui.js";
import { wxmlApi } from "./wxml.js";

// 设置全局 Page/App/Component/Behavior/getCurrentPages mock
setFrameworkMock();

/** Default `wx.env.USER_DATA_PATH` used by the mock (PR-8 switches it to `wxfile://usr`). */
export const DEFAULT_USER_DATA_PATH = "wxfile://usr";

/** Log manager returned by the mock; realtime logs are not persisted, but the API shape exists. */
type MockRealtimeLogManager = Pick<
  Console,
  "debug" | "error" | "group" | "groupEnd" | "info" | "log" | "warn"
> & {
  setFilterMsg: (filterMsg: string) => void;
};

const noop = (): void => void 0;

/** Realtime log manager of the mock: accepts logs / filters and deliberately discards them. */
const realtimeLogManager: MockRealtimeLogManager = {
  debug: noop,
  error: noop,
  group: noop,
  groupEnd: noop,
  info: noop,
  log: noop,
  setFilterMsg: noop,
  warn: noop,
};

interface MockDownloadTask {
  onProgressUpdate: (callback: (result: { progress: number }) => void) => void;
  onHeadersReceived: (callback: () => void) => void;
  offProgressUpdate: (callback: (result: { progress: number }) => void) => void;
  offHeadersReceived: (callback: () => void) => void;
  abort: () => void;
}

/** Task methods shared by every mock download task; `abort` is bound per call. */
const downloadTask = (): Omit<MockDownloadTask, "abort"> => ({
  onProgressUpdate: (): void => void 0,
  onHeadersReceived: (): void => void 0,
  offProgressUpdate: (): void => void 0,
  offHeadersReceived: (): void => void 0,
});

/** APIs intentionally not implemented by the mock (`canIUse` returns false). */
const NON_TARGET_API = new Set<string>([
  "openBluetoothAdapter",
  "startBluetoothDevicesDiscovery",
  "createBLEConnection",
  "createNFCMessage",
  "joinVoIPChat",
  "getChannelsLiveInfo",
]);

const wxMock: {
  version: string;
  env: {
    USER_DATA_PATH: string;
  };
  getRealtimeLogManager: () => MockRealtimeLogManager;
  getLogManager: (options?: {
    level?: number;
  }) => Pick<Console, "debug" | "error" | "group" | "groupEnd" | "info" | "log" | "warn">;
  getFileSystemManager: typeof getFileSystemManager;
  downloadFile: (option?: {
    url: string;
    filePath?: string;
    header?: Record<string, string>;
    success?: (result: { statusCode: number; tempFilePath?: string; filePath?: string }) => void;
    fail?: (result: { errMsg: string; statusCode?: number }) => void;
    complete?: (result: { errMsg: string }) => void;
  }) =>
    | void
    | Promise<{ statusCode: number; tempFilePath?: string; filePath?: string }>
    | MockDownloadTask;
} & typeof storageApi &
  typeof networkApi &
  typeof uiApi &
  typeof deviceApi &
  typeof wxmlApi &
  typeof fileApi &
  typeof frameworkApiMethods &
  typeof baseApi &
  typeof a2ExtraApi &
  typeof miscApi & {
    canIUse: (schema: string) => boolean;
  } = {
  version: "8.0.30",
  env: {
    USER_DATA_PATH: DEFAULT_USER_DATA_PATH,
  },

  canIUse(schema: string): boolean {
    // `split` always yields at least one element, so the namespace is always a string.
    const [name] = schema.split(".");

    if (!name) return false;

    return name in wxMock && !NON_TARGET_API.has(name);
  },

  ...storageApi,
  ...networkApi,
  ...uiApi,
  ...deviceApi,
  ...wxmlApi,
  ...fileApi,
  ...frameworkApiMethods,
  ...eventApi,
  ...baseApi,
  ...a2ExtraApi,
  ...managersApi,
  ...miscApi,

  getRealtimeLogManager(): MockRealtimeLogManager {
    return realtimeLogManager;
  },

  getLogManager(_options?: {
    level?: number;
  }): Pick<Console, "debug" | "error" | "group" | "groupEnd" | "info" | "log" | "warn"> {
    return console;
  },

  getFileSystemManager,

  // 注意：真实微信中 wx.downloadFile 不支持 Promise 风格调用（恒返回 DownloadTask），
  // 无回调时返回 Promise 是 mock 特有的测试便利扩展，不是微信真实契约。
  downloadFile(option?: {
    url: string;
    filePath?: string;
    header?: Record<string, string>;
    success?: (result: { statusCode: number; tempFilePath?: string; filePath?: string }) => void;
    fail?: (result: { errMsg: string; statusCode?: number }) => void;
    complete?: (result: { errMsg: string }) => void;
  }):
    | void
    | Promise<{ statusCode: number; tempFilePath?: string; filePath?: string }>
    | MockDownloadTask {
    // 真实微信行为：传入 filePath 时 success 返回 filePath 字段（tempFilePath 缺失），
    // 未传入 filePath 时返回 tempFilePath 字段。
    const getResult = (): { statusCode: number; tempFilePath?: string; filePath?: string } =>
      option?.filePath
        ? { statusCode: 200, filePath: option.filePath }
        : { statusCode: 200, tempFilePath: `mock://temp/${Date.now()}` };

    if (!option) return Promise.resolve({ tempFilePath: "", statusCode: 0 });

    if (!option.success && !option.fail && !option.complete) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(getResult());
        }, 0);
      });
    }

    let aborted = false;

    setTimeout(() => {
      // `abort()` already delivered `fail` + `complete`; the pending success must not fire.
      if (aborted) return;

      const res = getResult();

      option.success?.(res);
      option.complete?.({ errMsg: "downloadFile:ok", ...res });
    }, 0);

    return {
      ...downloadTask(),
      abort(): void {
        if (aborted) return;

        aborted = true;

        const res = { errMsg: "downloadFile:fail abort" };

        option.fail?.(res);
        option.complete?.(res);
      },
    };
  },
};

// Wrap the assembled API with the call recorder / rule injector. `wx` stays a plain mutable
// object; direct assignment (e.g. `wx.request = vi.fn()`) still takes precedence over the rules.
instrumentWx(wxMock);

/** Instrumented `wx` functions, used by `mockWx` scopes to restore replaced APIs. */
export const wxApiWrappers: ReadonlyMap<string, unknown> = new Map(
  Object.entries(wxMock).filter(([, value]) => typeof value === "function"),
);

(globalThis as typeof globalThis & { wx: typeof wxMock }).wx = wxMock;

export const wx: typeof wxMock = wxMock;

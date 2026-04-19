// oxlint-disable typescript/consistent-return
// oxlint-disable typescript/no-explicit-any

import type { GeneralCallbackResult, PromisifySuccessResult } from "./utils.js";

export interface GetStorageSuccessCallbackResult<T = any> {
  /** Key对应的内容 */
  data: T;
  errMsg: string;
}

/** 接口调用成功的回调函数 */
export type GetStorageSuccessCallback<T = any> = (
  result: GetStorageSuccessCallbackResult<T>,
) => void;

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
export type GetStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
export type GetStorageFailCallback = (res: GeneralCallbackResult) => void;

export interface GetStorageOption<T = any> {
  /** 本地缓存中指定的 key */
  key: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: GetStorageCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: GetStorageFailCallback;
  /** 接口调用成功的回调函数 */
  success?: GetStorageSuccessCallback<T>;
}

/** 接口调用成功的回调函数 */
export type GetStorageInfoSuccessCallback = (option: GetStorageInfoSuccessCallbackOption) => void;

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
export type GetStorageInfoCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
export type GetStorageInfoFailCallback = (res: GeneralCallbackResult) => void;

export interface GetStorageInfoOption {
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: GetStorageInfoCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: GetStorageInfoFailCallback;
  /** 接口调用成功的回调函数 */
  success?: GetStorageInfoSuccessCallback;
}
export interface GetStorageInfoSuccessCallbackOption {
  /** 当前占用的空间大小, 单位 KB */
  currentSize: number;
  /** 当前 storage 中所有的 key */
  keys: string[];
  /** 限制的空间大小，单位 KB */
  limitSize: number;
  errMsg: string;
}

export interface GetStorageInfoSyncOption {
  /** 当前占用的空间大小, 单位 KB */
  currentSize: number;
  /** 当前 storage 中所有的 key */
  keys: string[];
  /** 限制的空间大小，单位 KB */
  limitSize: number;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
export type SetStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
export type SetStorageFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
export type SetStorageSuccessCallback = (res: GeneralCallbackResult) => void;

export interface SetStorageOption<T = any> {
  /** 需要存储的内容。只支持原生类型、Date、及能够通过`JSON.stringify`序列化的对象。 */
  data: T;
  /** 本地缓存中指定的 key */
  key: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: SetStorageCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: SetStorageFailCallback;
  /** 接口调用成功的回调函数 */
  success?: SetStorageSuccessCallback;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
export type RemoveStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
export type RemoveStorageFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
export type RemoveStorageSuccessCallback = (res: GeneralCallbackResult) => void;

export interface RemoveStorageOption {
  /** 本地缓存中指定的 key */
  key: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: RemoveStorageCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: RemoveStorageFailCallback;
  /** 接口调用成功的回调函数 */
  success?: RemoveStorageSuccessCallback;
}

export interface ClearStorageOption {
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: () => void;
  /** 接口调用失败的回调函数 */
  fail?: () => void;
  /** 接口调用成功的回调函数 */
  success?: () => void;
}

export interface BatchGetStorageOption {
  /** 本地缓存中指定的 keyList */
  keyList: string[];
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: BatchGetStorageCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: BatchGetStorageFailCallback;
  /** 接口调用成功的回调函数 */
  success?: BatchGetStorageSuccessCallback;
}

export interface BatchSetStorageOption {
  /** [{ key, value }] */
  kvList: KvList[];
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: BatchSetStorageCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: BatchSetStorageFailCallback;
  /** 接口调用成功的回调函数 */
  success?: BatchSetStorageSuccessCallback;
}

export interface KvList {
  key: string;
  value: any;
}

export interface BatchGetStorageSuccessCallbackResult {
  /** 对应 key 的缓存内容 */
  data: any[];
  errMsg: string;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
export type BatchGetStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
export type BatchGetStorageFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
export type BatchGetStorageSuccessCallback = (res: BatchGetStorageSuccessCallbackResult) => void;
/** 接口调用结束的回调函数（调用成功、失败都会执行） */
export type BatchSetStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
export type BatchSetStorageFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
export type BatchSetStorageSuccessCallback = (res: GeneralCallbackResult) => void;

const storage = new Map<string, any>();

const getStorageSize = (): number => {
  let size = 0;

  for (const value of storage.values()) size += new Blob([JSON.stringify(value)]).size;

  return Math.ceil(size / 1024);
};

export const storageApi = {
  /**
   * [wx.getStorage(Object
   * object)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorage.html)
   *
   * 在插件中使用：需要基础库 `1.9.6`
   *
   * 从本地缓存中异步获取指定 key 的内容。
   *
   * **示例代码**
   *
   * ```js
   * wx.getStorage({
   *   key: "key",
   *   success(res) {
   *     console.log(res.data);
   *   },
   * });
   * ```
   *
   * ```js
   * // 开启加密存储
   * wx.setStorage({
   *   key: "key",
   *   data: "value",
   *   encrypt: true, // 若开启加密存储，setStorage 和 getStorage 需要同时声明 encrypt 的值为 true
   *   success() {
   *     wx.getStorage({
   *       key: "key",
   *       encrypt: true, // 若开启加密存储，setStorage 和 getStorage 需要同时声明 encrypt 的值为 true
   *       success(res) {
   *         console.log(res.data);
   *       },
   *     });
   *   },
   * });
   * ```
   */
  getStorage<T = any, U extends GetStorageOption<T> = GetStorageOption<T>>(
    option: U,
    // @ts-expect-error: api return void in some cases
  ): PromisifySuccessResult<U, GetStorageOption<T>> {
    const value: T = storage.has(option.key)
      ? (storage.get(option.key) as T)
      : // oxlint-disable-next-line no-undefined
        (undefined as unknown as T);

    if (!option.success && !option.fail && !option.complete) {
      // @ts-expect-error: api return a promise
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ data: value, errMsg: "" });
        }, 0);
      });
    }

    setTimeout(() => {
      if (option.success) option.success({ data: value, errMsg: "" });
    }, 0);
  },

  /**
   * [any wx.getStorageSync(string
   * key)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorageSync.html)
   *
   * 在插件中使用：需要基础库 `1.9.6`
   *
   * 从本地缓存中同步获取指定 key 的内容。
   *
   * **注意**
   *
   * Storage 应只用来进行数据的持久化存储，不应用于运行时的数据传递或全局状态管理。启动过程中过多的同步读写存储，会显著影响启动耗时。
   *
   * **示例代码**
   *
   * ```js
   * try {
   *   var value = wx.getStorageSync("key");
   *   if (value) {
   *     // Do something with return value
   *   }
   * } catch (e) {
   *   // Do something when catch error
   * }
   * ```
   */
  getStorageSync<T = any>(
    /** 本地缓存中指定的 key */
    key: string,
  ): T {
    // oxlint-disable-next-line no-undefined
    return storage.has(key) ? (storage.get(key) as T) : (undefined as unknown as T);
  },

  /**
   * [wx.getStorageInfo(Object
   * object)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorageInfo.html)
   *
   * 在插件中使用：不支持
   *
   * 异步获取当前storage的相关信息。
   *
   * **示例代码**
   *
   * ```js
   * wx.getStorageInfo({
   *   success(res) {
   *     console.log(res.keys);
   *     console.log(res.currentSize);
   *     console.log(res.limitSize);
   *   },
   * });
   * ```
   *
   * ```js
   * try {
   *   const res = wx.getStorageInfoSync();
   *   console.log(res.keys);
   *   console.log(res.currentSize);
   *   console.log(res.limitSize);
   * } catch (e) {
   *   // Do something when catch error
   * }
   * ```
   */
  getStorageInfo<T extends GetStorageInfoOption = GetStorageInfoOption>(
    option?: T,
    // @ts-expect-error: api return void in some cases
  ): PromisifySuccessResult<T, GetStorageInfoOption> {
    const result = {
      keys: [...storage.keys()],
      currentSize: getStorageSize(),
      limitSize: 1024 * 1024 * 10,
      errMsg: "",
    };

    if (!option || (!option.success && !option.fail && !option.complete)) {
      // @ts-expect-error: return type mismatch
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(result);
        }, 0);
      });
    }

    setTimeout(() => {
      if (option.success) option.success(result);
    }, 0);
  },

  /**
   * [Object
   * wx.getStorageInfoSync()](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorageInfoSync.html)
   *
   * 在插件中使用：不支持
   *
   * [wx.getStorageInfo](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorageInfo.html)
   * 的同步版本
   *
   * **示例代码**
   *
   * ```js
   * wx.getStorageInfo({
   *   success(res) {
   *     console.log(res.keys);
   *     console.log(res.currentSize);
   *     console.log(res.limitSize);
   *   },
   * });
   * ```
   *
   * ```js
   * try {
   *   const res = wx.getStorageInfoSync();
   *   console.log(res.keys);
   *   console.log(res.currentSize);
   *   console.log(res.limitSize);
   * } catch (e) {
   *   // Do something when catch error
   * }
   * ```
   */
  getStorageInfoSync(): GetStorageInfoSyncOption {
    return {
      keys: [...storage.keys()],
      currentSize: getStorageSize(),
      limitSize: 1024 * 1024 * 10,
    };
  },

  /**
   * [wx.setStorage(Object
   * object)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)
   *
   * 将数据存储在本地缓存中指定的 key 中。会覆盖掉原来该 key 对应的内容。除非用户主动删除或因存储空间原因被系统清理，否则数据都一直可用。单个 key 允许存储的最大数据长度为
   * 1MB，所有数据存储上限为 10MB。
   *
   * **示例代码**
   *
   * ```js
   * wx.setStorage({
   *   key: "key",
   *   data: "value",
   * });
   * ```
   *
   * ```js
   * try {
   *   wx.setStorageSync("key", "value");
   * } catch (e) {}
   * ```
   */
  setStorage<T = any, U extends SetStorageOption<T> = SetStorageOption<T>>(
    option: U,
    // @ts-expect-error: api return void in some cases
  ): PromisifySuccessResult<U, SetStorageOption<T>> {
    if (!option.success && !option.fail && !option.complete) {
      // @ts-expect-error: api return a promise
      return new Promise((resolve) => {
        setTimeout(() => {
          storage.set(option.key, option.data);
          resolve({ errMsg: "" });
        }, 0);
      });
    }

    setTimeout(() => {
      storage.set(option.key, option.data);
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  /**
   * [wx.setStorageSync(string key, any
   * data)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html)
   *
   * [wx.setStorage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)
   * 的同步版本
   *
   * **示例代码**
   *
   * ```js
   * wx.setStorage({
   *   key: "key",
   *   data: "value",
   * });
   * ```
   *
   * ```js
   * try {
   *   wx.setStorageSync("key", "value");
   * } catch (e) {}
   * ```
   */
  setStorageSync<T = any>(
    /** 本地缓存中指定的 key */
    key: string,
    /** 需要存储的内容。只支持原生类型、Date、及能够通过`JSON.stringify`序列化的对象。 */
    data: T,
  ): void {
    storage.set(key, data);
  },

  removeStorage<T extends RemoveStorageOption = RemoveStorageOption>(
    option: T,
    // @ts-expect-error: api return void in some cases
  ): PromisifySuccessResult<T, RemoveStorageOption> {
    if (!option.success && !option.fail && !option.complete) {
      // @ts-expect-error: api return a promise
      return new Promise((resolve) => {
        setTimeout(() => {
          storage.delete(option.key);
          resolve({ errMsg: "" });
        }, 0);
      });
    }

    setTimeout(() => {
      storage.delete(option.key);
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  /**
   * [wx.removeStorageSync(string
   * key)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.removeStorageSync.html)
   *
   * [wx.removeStorage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.removeStorage.html)
   * 的同步版本
   *
   * **示例代码**
   *
   * ```js
   * wx.removeStorage({
   *   key: "key",
   *   success(res) {
   *     console.log(res);
   *   },
   * });
   * ```
   *
   * ```js
   * try {
   *   wx.removeStorageSync("key");
   * } catch (e) {
   *   // Do something when catch error
   * }
   * ```
   */
  removeStorageSync(
    /** 本地缓存中指定的 key */
    key: string,
  ): void {
    storage.delete(key);
  },

  /**
   * [wx.clearStorage(Object
   * object)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.clearStorage.html)
   *
   * 清除本地数据缓存。
   *
   * **示例代码**
   *
   * ```js
   * wx.clearStorage();
   * ```
   *
   * ```js
   * wx.clearStorageSync();
   * ```
   */
  clearStorage<T extends ClearStorageOption = ClearStorageOption>(
    option?: T,
    // @ts-expect-error: api return void in some cases
  ): PromisifySuccessResult<T, ClearStorageOption> {
    if (!option || (!option.success && !option.fail && !option.complete)) {
      // @ts-expect-error: return type mismatch
      return new Promise((resolve) => {
        setTimeout(() => {
          storage.clear();
          // oxlint-disable-next-line no-undefined, unicorn/no-useless-undefined
          resolve(undefined);
        }, 0);
      });
    }

    setTimeout(() => {
      storage.clear();
      if (option.success) option.success();
    }, 0);
  },

  /**
   * [wx.clearStorageSync()](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.clearStorageSync.html)
   *
   * [wx.clearStorage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.clearStorage.html)
   * 的同步版本
   *
   * **示例代码**
   *
   * ```js
   * wx.clearStorage();
   * ```
   *
   * ```js
   * wx.clearStorageSync();
   * ```
   */
  clearStorageSync(): void {
    storage.clear();
  },

  /**
   * [wx.batchGetStorage(Object
   * object)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.batchGetStorage.html)
   *
   * 需要基础库： `2.25.0`
   *
   * 在插件中使用：不支持
   *
   * 从本地缓存中异步批量获取指定 key 的内容。
   *
   * **示例代码**
   *
   * ```js
   * wx.batchGetStorage({
   *   keyList: ["key"],
   *   success(res) {
   *     console.log(res);
   *   },
   * });
   * ```
   */
  batchGetStorage<T extends BatchGetStorageOption = BatchGetStorageOption>(
    option: T,
    // @ts-expect-error: api return void in some cases
  ): PromisifySuccessResult<T, BatchGetStorageOption> {
    // oxlint-disable-next-line typescript/no-unsafe-return
    const values = option.keyList.map((key) => storage.get(key));
    const result: BatchGetStorageSuccessCallbackResult = { data: values, errMsg: "" };

    if (!option.success && !option.fail && !option.complete) {
      // @ts-expect-error: return type mismatch
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(result);
        }, 0);
      });
    }

    setTimeout(() => {
      if (option.success) option.success(result);
    }, 0);
  },
  /**
   * [wx.batchSetStorage(Object
   * object)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.batchSetStorage.html)
   *
   * 需要基础库： `2.25.0`
   *
   * 在插件中使用：不支持
   *
   * 将数据批量存储在本地缓存中指定的 key 中。会覆盖掉原来该 key 对应的内容。除非用户主动删除或因存储空间原因被系统清理，否则数据都一直可用。单个 key 允许存储的最大数据长度为
   * 1MB，所有数据存储上限为 10MB。
   *
   * **示例代码**
   *
   * ```js
   * wx.setStorage({
   *   key: "key",
   *   data: "value",
   * });
   * ```
   *
   * ```js
   * // 开启加密存储
   * wx.batchSetStorage({
   *   kvList: [
   *     {
   *       key: "key",
   *       value: "value",
   *     },
   *   ],
   * });
   * ```
   */
  batchSetStorage<T extends BatchSetStorageOption = BatchSetStorageOption>(
    option: T,
    // @ts-expect-error: api return void in some cases
  ): PromisifySuccessResult<T, BatchSetStorageOption> {
    for (const { key, value } of option.kvList) storage.set(key, value);

    if (!option.success && !option.fail && !option.complete) {
      // @ts-expect-error: return type mismatch
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ errMsg: "" });
        }, 0);
      });
    }

    setTimeout(() => {
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },
  /**
   * [wx.batchSetStorageSync(Array.<Object>
   * kvList)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.batchSetStorageSync.html)
   *
   * 需要基础库： `2.25.0`
   *
   * 在插件中使用：不支持
   *
   * 将数据批量存储在本地缓存中指定的 key 中。会覆盖掉原来该 key 对应的内容。除非用户主动删除或因存储空间原因被系统清理，否则数据都一直可用。单个 key 允许存储的最大数据长度为
   * 1MB，所有数据存储上限为 10MB。
   *
   * **示例代码**
   *
   * ```js
   * try {
   *   wx.batchSetStorageSync([{ key: "key", value: "value" }]);
   * } catch (e) {}
   * ```
   */
  batchSetStorageSync(kvList: KvList[]): void {
    for (const { key, value } of kvList) storage.set(key, value);
  },
};

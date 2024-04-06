/* eslint-disable @typescript-eslint/no-explicit-any */
interface AsyncMethodOptionLike {
  success?: (...args: any[]) => void;
}

type PromisifySuccessResult<P, T extends AsyncMethodOptionLike> = P extends {
  success: any;
}
  ? void
  : P extends { fail: any }
    ? void
    : P extends { complete: any }
      ? void
      : Promise<Parameters<Exclude<T["success"], undefined>>[0]>;

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
interface GeneralCallbackResult {
  errMsg: string;
}

interface GetStorageSuccessCallbackResult<T = any> {
  /** key对应的内容 */
  data: T;
  errMsg: string;
}

/** 接口调用成功的回调函数 */
type GetStorageSuccessCallback<T = any> = (
  result: GetStorageSuccessCallbackResult<T>,
) => void;

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type GetStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type GetStorageFailCallback = (res: GeneralCallbackResult) => void;

interface GetStorageOption<T = any> {
  /** 本地缓存中指定的 key */
  key: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: GetStorageCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: GetStorageFailCallback;
  /** 接口调用成功的回调函数 */
  success?: GetStorageSuccessCallback<T>;
}

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
type SetStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type SetStorageFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
type SetStorageSuccessCallback = (res: GeneralCallbackResult) => void;

interface SetStorageOption<T = any> {
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
type RemoveStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
type RemoveStorageFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
type RemoveStorageSuccessCallback = (res: GeneralCallbackResult) => void;

interface RemoveStorageOption {
  /** 本地缓存中指定的 key */
  key: string;
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: RemoveStorageCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: RemoveStorageFailCallback;
  /** 接口调用成功的回调函数 */
  success?: RemoveStorageSuccessCallback;
}

const storage: Record<string, any> = {};

const wxMock = {
  version: "test",
  env: {
    USER_DATA_PATH: "wxfile://",
  },

  /** [wx.getStorage(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorage.html)
*
* 从本地缓存中异步获取指定 key 的内容。缓存相关策略请查看 [存储](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/storage.html)。
*
* **示例代码**
*
*
* ```js
wx.getStorage({
  key: 'key',
  success (res) {
    console.log(res.data)
  }
})
```
*
* ```js
try {
  var value = wx.getStorageSync('key')
  if (value) {
    // Do something with return value
  }
} catch (e) {
  // Do something when catch error
}
``` */
  getStorage<T = any, U extends GetStorageOption<T> = GetStorageOption<T>>(
    option: U,

    // @ts-ignore
  ): PromisifySuccessResult<U, GetStorageOption<T>> {
    const value: T = Object.prototype.hasOwnProperty.call(storage, option.key)
      ? (storage[option.key] as T)
      : (undefined as unknown as T);

    if (!option.success && !option.fail && !option.complete)
      // @ts-ignore
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ data: value, errMsg: "" });
        }, 0);
      });

    setTimeout(() => {
      if (option.success) option.success({ data: value, errMsg: "" });
    }, 0);
  },
  /** [any wx.getStorageSync(string key)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorageSync.html)
*
* [wx.getStorage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorage.html) 的同步版本
*
* **示例代码**
*
*
* ```js
wx.getStorage({
  key: 'key',
  success (res) {
    console.log(res.data)
  }
})
```
*
* ```js
try {
  var value = wx.getStorageSync('key')
  if (value) {
    // Do something with return value
  }
} catch (e) {
  // Do something when catch error
}
``` */
  getStorageSync<T = any>(
    /** 本地缓存中指定的 key */
    key: string,
  ): T {
    return Object.prototype.hasOwnProperty.call(storage, key)
      ? (storage[key] as T)
      : (undefined as unknown as T);
  },

  /** [wx.setStorage(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)
*
* 将数据存储在本地缓存中指定的 key 中。会覆盖掉原来该 key 对应的内容。除非用户主动删除或因存储空间原因被系统清理，否则数据都一直可用。单个 key 允许存储的最大数据长度为 1MB，所有数据存储上限为 10MB。
*
* **示例代码**
*
*
* ```js
wx.setStorage({
  key:"key",
  data:"value"
})
```
* ```js
try {
  wx.setStorageSync('key', 'value')
} catch (e) { }
``` */
  setStorage<T = any, U extends SetStorageOption<T> = SetStorageOption<T>>(
    option: U,

    // @ts-ignore
  ): PromisifySuccessResult<U, SetStorageOption<T>> {
    if (!option.success && !option.fail && !option.complete)
      // @ts-ignore
      return new Promise((resolve) => {
        setTimeout(() => {
          storage[option.key] = option.data;
          resolve({ errMsg: "" });
        }, 0);
      });

    setTimeout(() => {
      storage[option.key] = option.data;
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  /** [wx.setStorageSync(string key, any data)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html)
*
* [wx.setStorage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html) 的同步版本
*
* **示例代码**
*
*
* ```js
wx.setStorage({
  key:"key",
  data:"value"
})
```
* ```js
try {
  wx.setStorageSync('key', 'value')
} catch (e) { }
``` */
  setStorageSync<T = any>(
    /** 本地缓存中指定的 key */
    key: string,
    /** 需要存储的内容。只支持原生类型、Date、及能够通过`JSON.stringify`序列化的对象。 */
    data: T,
  ): void {
    storage[key] = data;
  },

  removeStorage<T extends RemoveStorageOption = RemoveStorageOption>(
    option: T,

    // @ts-ignore
  ): PromisifySuccessResult<T, RemoveStorageOption> {
    if (!option.success && !option.fail && !option.complete)
      // @ts-ignore
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ errMsg: "" });
        }, 0);
      });

    setTimeout(() => {
      delete storage[option.key];
      if (option.success) option.success({ errMsg: "" });
    }, 0);
  },

  /** [wx.removeStorageSync(string key)](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.removeStorageSync.html)
*
* [wx.removeStorage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.removeStorage.html) 的同步版本
*
* **示例代码**
*
*
* ```js
wx.removeStorage({
  key: 'key',
  success (res) {
    console.log(res)
  }
})
```
*
* ```js
try {
  wx.removeStorageSync('key')
} catch (e) {
  // Do something when catch error
}
``` */
  removeStorageSync(
    /** 本地缓存中指定的 key */
    key: string,
  ): void {
    delete storage[key];
  },
  /** [[RealtimeLogManager](https://developers.weixin.qq.com/miniprogram/dev/api/base/debug/RealtimeLogManager.html) wx.getRealtimeLogManager()](https://developers.weixin.qq.com/miniprogram/dev/api/base/debug/wx.getRealtimeLogManager.html)
*
* 获取实时日志管理器对象。
*
* **示例代码**
*
*
* ```js
// 小程序端
const logger = wx.getRealtimeLogManager()
logger.info({str: 'hello world'}, 'info log', 100, [1, 2, 3])
logger.error({str: 'hello world'}, 'error log', 100, [1, 2, 3])
logger.warn({str: 'hello world'}, 'warn log', 100, [1, 2, 3])

// 插件端，基础库 2.16.0 版本后支持，只允许采用 key-value 的新格式上报
const logManager = wx.getRealtimeLogManager()
const logger = logManager.tag('plugin-log1')
logger.info('key1', 'value1')
logger.error('key2', {str: 'value2'})
logger.warn('key3', 'value3')
```
*
* 最低基础库： `2.7.1` */
  // TODO: Finish
  getRealtimeLogManager(): Pick<
    Console,
    "debug" | "error" | "group" | "groupEnd" | "info" | "log" | "warn"
  > {
    return console;
  },

  // TODO: Finish
  getFileSystemManager: (): any => ({}),
};

(global as typeof globalThis & { wx: typeof wxMock }).wx = wxMock;

export const wx = wxMock;

// oxlint-disable no-undefined
import { logger } from "@mptool/shared";

export interface StorageData<T> {
  data: T;
  expired: number;
}

/** 本次小程序启动的会话 ID */
const sessionId = Date.now();

logger.debug(`Current sessionId is ${sessionId}`);

const CACHE_PREFIX = "_cache_";

/** 存储 */
export const storage: Record<string, unknown> = {};

/**
 * 存放数据
 *
 * @param key 键
 * @param value 值
 */
export const put = <T = unknown>(key: string, value: T): void => {
  storage[key] = value;
};

/**
 * 取数据
 *
 * @param key 键
 *
 * @returns 值
 */
export const take = <T = unknown>(key: string): T | undefined => {
  const value = storage[key] as T | undefined;

  // release key
  storage[key] = undefined;

  return value;
};

/**
 * 处理并返回值
 *
 * @param key 键
 * @param value 值
 *
 * @returns 返回值
 */
const getData = <T = unknown>(key: string, value: StorageData<T> | null): T | undefined =>
  value
    ? value.expired
      ? value.expired === sessionId || Date.now() < value.expired
        ? // not expired
          value.data
        : // expired
          (wx.removeStorageSync(`${CACHE_PREFIX}${key}`), undefined)
      : // permanent
        value.data
    : // not exist
      undefined;

const prepareData = <T = unknown>(
  key: string,
  value: T,
  expire: number | "keep" | "once",
): StorageData<T> | undefined => {
  /** 默认保存数据格式 */
  const data: StorageData<T> = {
    expired: 0,
    data: value,
  };

  // 保持上一次的缓存时间
  if (expire === "keep") {
    const oldData = wx.getStorageSync<StorageData<T> | undefined>(`${CACHE_PREFIX}${key}`);

    // 上次没有缓存，本次也不更新
    // oxlint-disable-next-line no-undefined
    if (!oldData) return undefined;

    // 使用上次过期时间
    data.expired = oldData.expired || 0;
  } else if (expire) {
    data.expired =
      expire === "once"
        ? // 仅本次会话有效
          sessionId
        : // 计算过期时间
          expire + Date.now();
  }

  return data;
};

/**
 * 设置数据
 *
 * @param key key
 * @param value value
 * @param expire 过期时间
 *   - 0: 永久有效
 *   - 数字：过期时间，毫秒
 *   - `'keep'`: 表示保持上一次缓存时间
 *   - `'once'`: 仅本次启动有效
 */
export const set = <T = unknown>(
  key: string,
  value: T,
  expire: number | "keep" | "once" = 0,
): void => {
  wx.setStorageSync(`${CACHE_PREFIX}${key}`, prepareData(key, value, expire));
};

/**
 * 设置数据
 *
 * @param key key
 * @param value value
 * @param expire 过期时间
 *   - 0: 永久有效
 *   - 数字：过期时间，毫秒
 *   - `'keep'`: 表示保持上一次缓存时间
 *   - `'once'`: 仅本次启动有效
 * @param [asyncCB] 异步回调方法，不填为同步
 */
export const setAsync = <T = unknown>(
  key: string,
  value: T,
  expire: number | "keep" | "once" = 0,
): Promise<WechatMiniprogram.GeneralCallbackResult | void> =>
  wx
    .setStorage({
      key: `${CACHE_PREFIX}${key}`,
      data: prepareData(key, value, expire),
    })
    .catch(() => {
      logger.error(`set "${key}" fail`);
    });

/**
 * 获取
 *
 * @param key key
 *
 * @returns 设置值
 */
export const get = <T = unknown>(key: string): T | undefined =>
  getData(key, wx.getStorageSync<StorageData<T>>(`${CACHE_PREFIX}${key}`));

/**
 * 异步获取
 *
 * @param key key
 *
 * @returns 设置值
 */
export const getAsync = <T = unknown>(key: string): Promise<T | undefined> =>
  wx
    .getStorage<StorageData<T>>({
      key: `${CACHE_PREFIX}${key}`,
    })
    .then(({ data }) => getData(key, data))
    .catch(() => {
      logger.error(`set "${key}" fail`);

      // oxlint-disable-next-line unicorn/no-useless-undefined
      return undefined;
    });

/**
 * 移除
 *
 * @param key key
 */
export const remove = (key: string): void => {
  wx.removeStorageSync(`${CACHE_PREFIX}${key}`);
  getData(key, null);
};

/**
 * 异步移除存储
 *
 * @param key key
 * @param option 回调函数
 */
export const removeAsync = (key: string): Promise<WechatMiniprogram.GeneralCallbackResult> =>
  wx.removeStorage({
    key: `${CACHE_PREFIX}${key}`,
  });

/**
 * 清除失效数据
 *
 * @param key key
 */
export const check = (): void => {
  wx.getStorageInfoSync().keys.forEach((key) => {
    if (key.startsWith(CACHE_PREFIX)) {
      const value: StorageData<unknown> | undefined = wx.getStorageSync(key);

      if (!value || (value.expired !== sessionId && Date.now() >= value.expired))
        wx.removeStorageSync(key);
    }
  });
};

/**
 * 异步清除失效数据
 *
 * @param key key
 *
 * @returns 清除完成的 Promise
 */
export const checkAsync = async (): Promise<void> => {
  const { keys } = await wx.getStorageInfo();

  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) =>
        wx.getStorage<StorageData<unknown> | undefined>({ key }).then(({ data }) => {
          if (!data || (data.expired !== sessionId && Date.now() >= data.expired))
            return wx.removeStorage({ key });

          // oxlint-disable-next-line no-useless-return
          return;
        }),
      ),
  );
};

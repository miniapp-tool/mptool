import { MpError, logger } from "@mptool/shared";

export interface StorageData<T> {
  data: T;
  /**
   * Expiry of the value:
   *
   * - `0`: the value never expires
   * - A timestamp: the value expires at that moment
   * - Together with `once: true`: the session id that wrote the value
   */
  expired: number;
  /** Whether the value was written with the `'once'` expire mode */
  once?: boolean;
  /** Creation timestamp, used by timestamp based expiry */
  createdAt?: number;
}

/** 本次小程序启动的会话 ID */
const sessionId = Date.now();

logger.debug(`Current sessionId is ${sessionId}`);

const CACHE_PREFIX = "_cache_";

/** 存储 */
export const storage: Map<string, unknown> = new Map<string, unknown>();

/**
 * 存放数据
 *
 * @param key 键
 * @param value 值
 */
export const put = <T = unknown>(key: string, value: T): void => {
  storage.set(key, value);
};

/**
 * 取数据
 *
 * @param key 键
 * @returns 值
 */
export const take = <T = unknown>(key: string): T | undefined => {
  const value = storage.get(key) as T | undefined;

  // release key
  storage.delete(key);

  return value;
};

/**
 * Whether a stored value has expired
 *
 * `'once'` values are valid only within the session that wrote them.
 *
 * 判断已存储的值是否已过期。`'once'` 值仅在写入它的本次启动内有效。
 *
 * @param value 已存储的值
 * @returns 是否已过期
 */
const isExpired = (value: StorageData<unknown>): boolean => {
  if (value.once) return value.expired !== sessionId;

  // `expired === 0` marks a permanent value
  if (value.expired === 0) return false;

  const now = Date.now();

  // Timestamp based expiry: a value with a creation time in the future is treated as expired.
  if (typeof value.createdAt === "number" && now < value.createdAt) return true;

  return now >= value.expired;
};

/**
 * Extract the message of a wx storage error.
 *
 * @param err Error thrown by wx
 * @returns The error message
 */
const getErrorMessage = (err: unknown): string => {
  if (typeof err === "string") return err;

  const record = typeof err === "object" && err != null ? (err as { errMsg?: unknown }) : {};

  if (typeof record.errMsg === "string") return record.errMsg;
  if (err instanceof Error) return err.message;

  return String(err);
};

/**
 * Whether a wx storage error means the key does not exist.
 *
 * `wx.getStorage` fails with `getStorage:fail data not found` for a missing key, which is a normal
 * cache-miss branch; other failures (invalid key, storage corruption) must stay observable.
 *
 * @param err Error thrown by wx
 * @returns Whether the key is missing
 */
const isMissingStorageError = (err: unknown): boolean =>
  /data not found/iu.test(getErrorMessage(err));

/**
 * Convert a wx storage error into an `MpError`
 *
 * @param key Storage key, without the cache prefix
 * @param err Error thrown by wx
 * @param action Operation that failed, used in the message
 * @returns Normalized error
 */
const createStorageError = (key: string, err: unknown, action = "Write"): MpError => {
  const record = typeof err === "object" && err != null ? (err as { errCode?: unknown }) : {};

  return new MpError({
    ...(typeof record.errCode === "number" ? { code: record.errCode } : {}),
    message: `${action} storage "${key}" failed: ${getErrorMessage(err)}`,
  });
};

/**
 * 处理并返回值
 *
 * @param key 键
 * @param value 值
 * @returns 返回值
 */
const getData = <T = unknown>(
  key: string,
  value: StorageData<T> | null | undefined,
): T | undefined => {
  // oxlint-disable-next-line no-undefined
  if (!value) return undefined;

  if (!isExpired(value)) return value.data;

  wx.removeStorageSync(`${CACHE_PREFIX}${key}`);

  // oxlint-disable-next-line no-undefined
  return undefined;
};

const prepareData = <Value = unknown>(
  key: string,
  value: Value,
  expire: number | "keep" | "once",
): StorageData<Value> | undefined => {
  /** 默认保存数据格式 */
  const data: StorageData<Value> = {
    expired: 0,
    data: value,
  };

  // 保持上一次的缓存时间
  if (expire === "keep") {
    const oldData = wx.getStorageSync<StorageData<Value> | undefined>(`${CACHE_PREFIX}${key}`);

    // 上次没有缓存，本次也不更新
    // oxlint-disable-next-line no-undefined
    if (!oldData) return undefined;

    // Reuse the previous expiry, and the session / creation markers that come with it / 使用上次过期时间
    data.expired = oldData.expired || 0;
    if (oldData.once) data.once = true;
    if (typeof oldData.createdAt === "number") data.createdAt = oldData.createdAt;
  } else if (expire === "once") {
    // `'once'` values are bound to the current session instead of a timestamp / 仅本次会话有效
    data.expired = sessionId;
    data.once = true;
  } else if (expire) {
    // 计算过期时间并记录创建时间
    data.createdAt = Date.now();
    data.expired = data.createdAt + expire;
  }

  return data;
};

/**
 * 设置数据
 *
 * @param key Key
 * @param value Value
 * @param expire 过期时间
 *
 *   - 0: 永久有效
 *   - 数字：过期时间，毫秒
 *   - `'keep'`: 表示保持上一次缓存时间。该模式会先读取再写入，不是原子操作，不要与其它写入并发
 *   - `'once'`: 仅本次启动有效（按启动会话判断）
 * @throws {MpError} 写入失败时抛出，`message` 中包含微信返回的 `errMsg`
 */
export const set = <Value = unknown>(
  key: string,
  value: Value,
  expire: number | "keep" | "once" = 0,
): void => {
  try {
    const data = prepareData(key, value, expire);

    // prepareData returns undefined for "keep" without a previous cache; skip the
    // write so no undefined value is stored
    if (data) wx.setStorageSync(`${CACHE_PREFIX}${key}`, data);
  } catch (err) {
    logger.error(`set "${key}" fail`, err);

    throw createStorageError(key, err);
  }
};

/**
 * 设置数据
 *
 * @param key Key
 * @param value Value
 * @param expire 过期时间
 *
 *   - 0: 永久有效
 *   - 数字：过期时间，毫秒
 *   - `'keep'`: 表示保持上一次缓存时间。该模式会先读取再写入，不是原子操作，不要与其它写入并发
 *   - `'once'`: 仅本次启动有效（按启动会话判断）
 * @param [asyncCB] 异步回调方法，不填为同步
 * @returns 异步回调结果
 * @throws {MpError} 返回的 Promise 在写入失败时以 `MpError` reject，`message` 中包含微信返回的 `errMsg`
 */
export const setAsync = async <Value = unknown>(
  key: string,
  value: Value,
  expire: number | "keep" | "once" = 0,
): Promise<WechatMiniprogram.GeneralCallbackResult | void> => {
  let data: StorageData<Value> | undefined;

  try {
    data = prepareData(key, value, expire);
  } catch (err) {
    logger.error(`set "${key}" fail`, err);

    throw createStorageError(key, err);
  }

  // prepareData returns undefined for "keep" without a previous cache; skip the
  // write so no undefined value is stored
  if (!data) return;

  try {
    return await wx.setStorage({
      key: `${CACHE_PREFIX}${key}`,
      data,
    });
  } catch (err) {
    logger.error(`set "${key}" fail`, err);

    throw createStorageError(key, err);
  }
};

/**
 * 获取
 *
 * @param key Key
 * @returns 设置值
 */
export const get = <T = unknown>(key: string): T | undefined =>
  getData(key, wx.getStorageSync<StorageData<T>>(`${CACHE_PREFIX}${key}`));

/**
 * 异步获取
 *
 * @param key Key
 * @returns 设置值
 */
export const getAsync = async <T = unknown>(key: string): Promise<T | undefined> => {
  try {
    const { data } = await wx.getStorage<StorageData<T>>({
      key: `${CACHE_PREFIX}${key}`,
    });

    return getData(key, data);
  } catch (err) {
    // A missing key is a normal cache miss; permission / corrupt storage errors must not be
    // reported as "no cache" (that would silently reset user data).
    if (isMissingStorageError(err)) {
      // oxlint-disable-next-line no-undefined
      return undefined;
    }

    logger.error(`get "${key}" fail`, err);

    throw createStorageError(key, err, "Read");
  }
};

/**
 * 移除
 *
 * @param key Key
 */
export const remove = (key: string): void => {
  wx.removeStorageSync(`${CACHE_PREFIX}${key}`);
  getData(key, null);
};

/**
 * 异步移除存储
 *
 * @param key Key
 * @param option 回调函数
 * @returns 异步回调结果
 */
export const removeAsync = (key: string): Promise<WechatMiniprogram.GeneralCallbackResult> =>
  wx.removeStorage({
    key: `${CACHE_PREFIX}${key}`,
  });

/**
 * 清除失效数据
 *
 * @param key Key
 */
export const check = (): void => {
  wx.getStorageInfoSync().keys.forEach((key) => {
    if (!key.startsWith(CACHE_PREFIX)) return;

    const value: StorageData<unknown> | undefined = wx.getStorageSync(key);

    // Drop corrupt values and expired ones / 清除损坏与已过期的值
    if (!value || isExpired(value)) wx.removeStorageSync(key);
  });
};

/**
 * 异步清除失效数据
 *
 * @param key Key
 * @returns 异步回调结果
 */
export const checkAsync = async (): Promise<void> => {
  const { keys } = await wx.getStorageInfo();

  await Promise.all<void>(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map(async (key) => {
        try {
          const { data } = await wx.getStorage<StorageData<unknown> | undefined>({ key });

          // Drop corrupt values and expired ones / 清除损坏与已过期的值
          if (!data || isExpired(data)) await wx.removeStorage({ key });
        } catch {
          // The key can disappear between `getStorageInfo` and `getStorage` (another context
          // cleared the cache, or the entry expired); treat it as already cleaned up.
          logger.debug(`check async: "${key}" is gone, skip`);
        }
      }),
  );
};

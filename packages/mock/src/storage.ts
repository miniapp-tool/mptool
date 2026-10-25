// oxlint-disable typescript/no-explicit-any

// oxlint-disable no-undefined -- storage payloads and missing-key semantics are built around `undefined`
import { mockState } from "./state.js";
import { storage } from "./storageState.js";
import type { StoredValue } from "./storageState.js";
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

/** 接口调用结束的回调函数（调用成功、失败都会执行） */
export type ClearStorageCompleteCallback = (res: GeneralCallbackResult) => void;
/** 接口调用失败的回调函数 */
export type ClearStorageFailCallback = (res: GeneralCallbackResult) => void;
/** 接口调用成功的回调函数 */
export type ClearStorageSuccessCallback = (res: GeneralCallbackResult) => void;

export interface ClearStorageOption {
  /** 接口调用结束的回调函数（调用成功、失败都会执行） */
  complete?: ClearStorageCompleteCallback;
  /** 接口调用失败的回调函数 */
  fail?: ClearStorageFailCallback;
  /** 接口调用成功的回调函数 */
  success?: ClearStorageSuccessCallback;
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

/** Fallback error messages used by natural storage failures (no injection involved). */
const ERR_MSG = {
  invalidData: "setStorage:fail data should be JSON serializable",
  missingKey: "getStorage:fail data not found",
  quota: "setStorage:fail exceed storage max size",
} as const;

const DEFAULT_LIMIT_SIZE = 10240;
const DEFAULT_KEY_SIZE = 1024;
const BYTES_PER_KB = 1024;

const encoder = new TextEncoder();

const createStorageError = (errMsg: string): Error & { errMsg: string } => {
  const error = new Error(errMsg) as Error & { errMsg: string };

  error.errMsg = errMsg;

  return error;
};

const getErrorMsg = (error: unknown): string =>
  error instanceof Error && "errMsg" in error
    ? String((error as { errMsg: unknown }).errMsg)
    : "storage:fail";

interface StorageConfig {
  /** Total quota in bytes. */
  limitBytes: number;
  /** Single-key quota in bytes. */
  keyLimitBytes: number;
  /** Total quota in KB (what `getStorageInfo` reports). */
  limitSize: number;
  missingKey: "fail" | "resolve";
  missingKeySync: "empty-string" | "undefined";
  /** Whether missing keys use the legacy `success` + empty `errMsg` shape (compat flag). */
  legacyMissingKey: boolean;
}

/**
 * Resolve the effective storage configuration, honouring the 0.x compat flags.
 *
 * `storageResolveMissingKey` keeps the old "missing key resolves to `undefined`" behaviour for one
 * minor release; `MockStorageOptions` is the forward-looking way to configure the same thing.
 */
const resolveConfig = (): StorageConfig => {
  const { compat, storage: options } = mockState.config;
  const limitSize = options.limitSize ?? DEFAULT_LIMIT_SIZE;
  const keySize = options.keySize ?? DEFAULT_KEY_SIZE;

  return {
    keyLimitBytes: keySize * BYTES_PER_KB,
    limitBytes: limitSize * BYTES_PER_KB,
    limitSize,
    missingKey: compat.storageResolveMissingKey ? "resolve" : (options.missingKey ?? "fail"),
    missingKeySync: compat.storageResolveMissingKey
      ? "undefined"
      : (options.missingKeySync ?? "empty-string"),
    legacyMissingKey: Boolean(compat.storageResolveMissingKey),
  };
};

const byteLength = (text: string): number => encoder.encode(text).length;

/** Serialize a storage value. Throws `Error` (with `errMsg`) for non-serializable values. */
const serialize = (data: unknown): StoredValue => {
  if (data === undefined) return undefined;

  try {
    return JSON.stringify(data);
  } catch {
    throw createStorageError(ERR_MSG.invalidData);
  }
};

const deserialize = (value: StoredValue): unknown =>
  value === undefined ? undefined : (JSON.parse(value) as unknown);

/** Value bytes only; key names are not counted (real-device samples pending). */
const getValueSize = (value: StoredValue): number => (value === undefined ? 0 : byteLength(value));

const getStorageSize = (): number => {
  let size = 0;

  for (const value of storage.values()) size += getValueSize(value);

  return Math.ceil(size / BYTES_PER_KB);
};

/** Validate quotas for writing one entry; keeps the total limit consistent on overwrite. */
const assertQuota = (key: string, value: StoredValue): void => {
  const { keyLimitBytes, limitBytes } = resolveConfig();
  const entrySize = getValueSize(value);

  if (entrySize > keyLimitBytes) throw createStorageError(ERR_MSG.quota);

  const previous = storage.get(key);
  const previousSize = storage.has(key) ? getValueSize(previous) : 0;
  let total = 0;

  for (const stored of storage.values()) total += getValueSize(stored);

  if (total - previousSize + entrySize > limitBytes) throw createStorageError(ERR_MSG.quota);
};

/** Validate quotas for a batch write; the whole batch must fit before anything is written. */
const assertBatchQuota = (entries: { key: string; value: unknown }[]): void => {
  const { keyLimitBytes, limitBytes } = resolveConfig();
  const next = new Map(storage);

  for (const { key, value } of entries) {
    const serialized = serialize(value);

    if (getValueSize(serialized) > keyLimitBytes) throw createStorageError(ERR_MSG.quota);

    next.set(key, serialized);
  }

  let total = 0;

  for (const stored of next.values()) total += getValueSize(stored);

  if (total > limitBytes) throw createStorageError(ERR_MSG.quota);
};

const writeEntry = (key: string, data: unknown): void => {
  const serialized = serialize(data);

  assertQuota(key, serialized);
  storage.set(key, serialized);
};

const readEntry = (key: string): { found: true; value: unknown } | { found: false } =>
  storage.has(key) ? { found: true, value: deserialize(storage.get(key)) } : { found: false };

interface CallbackOption {
  complete?: (res: GeneralCallbackResult) => void;
  fail?: (res: GeneralCallbackResult) => void;
  success?: (res: GeneralCallbackResult) => void;
}

const asCallbackOption = (option: unknown): CallbackOption => option as CallbackOption;

/** Any `wx` option object with callbacks; the concrete result types differ per API. */
const hasCallbacks = (rawOption: unknown): boolean => {
  const option = asCallbackOption(rawOption);

  return (
    typeof option?.success === "function" ||
    typeof option?.fail === "function" ||
    typeof option?.complete === "function"
  );
};

/** Deliver a failure following the callback-or-promise convention. */
const deliverFailure = (rawOption: unknown, errMsg: string): unknown => {
  const option = asCallbackOption(rawOption);

  if (rawOption == null || !hasCallbacks(rawOption))
    return Promise.reject(createStorageError(errMsg));

  setTimeout(() => {
    option.fail?.({ errMsg });
    option.complete?.({ errMsg });
  }, 0);

  return undefined;
};

/** Deliver a result computed inside an async task (set/remove/clear/batch). */
const deliverResult = (rawOption: unknown, task: () => { errMsg: string }): unknown => {
  const option = asCallbackOption(rawOption);

  if (rawOption == null || !hasCallbacks(rawOption)) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(task());
        } catch (err) {
          reject(createStorageError(getErrorMsg(err)));
        }
      }, 0);
    });
  }

  setTimeout(() => {
    try {
      const result = task();

      option.success?.(result);
      option.complete?.(result);
    } catch (err) {
      const errMsg = getErrorMsg(err);

      option.fail?.({ errMsg });
      option.complete?.({ errMsg });
    }
  }, 0);

  return undefined;
};

export const storageApi = {
  getStorage<T = any, U extends GetStorageOption<T> = GetStorageOption<T>>(
    option: U,
  ): PromisifySuccessResult<U, GetStorageOption<T>> {
    const { legacyMissingKey, missingKey } = resolveConfig();

    if (!hasCallbacks(option)) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const result = readEntry(option.key);

          if (!result.found && missingKey === "fail") {
            reject(createStorageError(ERR_MSG.missingKey));

            return;
          }

          resolve(
            result.found
              ? { data: result.value as T, errMsg: "getStorage:ok" }
              : // Compat mode preserves the old success + `undefined` + empty `errMsg` shape.
                { data: undefined as T, errMsg: legacyMissingKey ? "" : "getStorage:ok" },
          );
        }, 0);
      }) as PromisifySuccessResult<U, GetStorageOption<T>>;
    }

    setTimeout(() => {
      const result = readEntry(option.key);

      if (!result.found && missingKey === "fail") {
        const { errMsg } = createStorageError(ERR_MSG.missingKey);

        option.fail?.({ errMsg });
        option.complete?.({ errMsg });

        return;
      }

      const successResult: GetStorageSuccessCallbackResult<T> = result.found
        ? { data: result.value as T, errMsg: "getStorage:ok" }
        : { data: undefined as T, errMsg: legacyMissingKey ? "" : "getStorage:ok" };

      option.success?.(successResult);
      option.complete?.({ errMsg: successResult.errMsg });
    }, 0);

    return undefined as never;
  },

  getStorageSync<T = any>(key: string): T {
    if (storage.has(key)) return deserialize(storage.get(key)) as T;

    const { missingKeySync } = resolveConfig();

    return (missingKeySync === "undefined" ? undefined : "") as unknown as T;
  },

  getStorageInfo<T extends GetStorageInfoOption = GetStorageInfoOption>(
    option?: T,
  ): PromisifySuccessResult<T, GetStorageInfoOption> {
    const result = {
      currentSize: getStorageSize(),
      errMsg: "getStorageInfo:ok",
      keys: [...storage.keys()],
      limitSize: resolveConfig().limitSize,
    };

    if (!option || !hasCallbacks(option))
      return Promise.resolve(result) as PromisifySuccessResult<T, GetStorageInfoOption>;

    setTimeout(() => {
      option.success?.(result);
      option.complete?.({ errMsg: result.errMsg });
    }, 0);

    return undefined as never;
  },

  getStorageInfoSync(): GetStorageInfoSyncOption {
    return {
      currentSize: getStorageSize(),
      keys: [...storage.keys()],
      limitSize: resolveConfig().limitSize,
    };
  },

  setStorage<T = any, U extends SetStorageOption<T> = SetStorageOption<T>>(
    option: U,
  ): PromisifySuccessResult<U, SetStorageOption<T>> {
    return deliverResult(option, () => {
      writeEntry(option.key, option.data);

      return { errMsg: "setStorage:ok" };
    }) as PromisifySuccessResult<U, SetStorageOption<T>>;
  },

  setStorageSync<T = any>(key: string, data: T): void {
    writeEntry(key, data);
  },

  removeStorage<T extends RemoveStorageOption = RemoveStorageOption>(
    option: T,
  ): PromisifySuccessResult<T, RemoveStorageOption> {
    return deliverResult(option, () => {
      storage.delete(option.key);

      return { errMsg: "removeStorage:ok" };
    }) as PromisifySuccessResult<T, RemoveStorageOption>;
  },

  removeStorageSync(key: string): void {
    storage.delete(key);
  },

  clearStorage<T extends ClearStorageOption = ClearStorageOption>(
    option?: T,
  ): PromisifySuccessResult<T, ClearStorageOption> {
    return deliverResult(option, () => {
      storage.clear();

      return { errMsg: "clearStorage:ok" };
    }) as PromisifySuccessResult<T, ClearStorageOption>;
  },

  clearStorageSync(): void {
    storage.clear();
  },

  batchGetStorage<T extends BatchGetStorageOption = BatchGetStorageOption>(
    option: T,
  ): PromisifySuccessResult<T, BatchGetStorageOption> {
    const { missingKey } = resolveConfig();
    const values = option.keyList.map((key) => readEntry(key));

    if (values.some((value) => !value.found) && missingKey === "fail") {
      return deliverFailure(
        option,
        "batchGetStorage:fail data not found",
      ) as PromisifySuccessResult<T, BatchGetStorageOption>;
    }

    const result: BatchGetStorageSuccessCallbackResult = {
      data: values.map((value) => (value.found ? value.value : undefined)),
      errMsg: "batchGetStorage:ok",
    };

    if (!hasCallbacks(option))
      return Promise.resolve(result) as PromisifySuccessResult<T, BatchGetStorageOption>;

    setTimeout(() => {
      option.success?.(result);
      option.complete?.({ errMsg: result.errMsg });
    }, 0);

    return undefined as never;
  },

  batchSetStorage<T extends BatchSetStorageOption = BatchSetStorageOption>(
    option: T,
  ): PromisifySuccessResult<T, BatchSetStorageOption> {
    return deliverResult(option, () => {
      const entries = option.kvList.map(({ key, value }) => ({ key, value: value as unknown }));

      assertBatchQuota(entries);

      for (const { key, value } of entries) storage.set(key, serialize(value));

      return { errMsg: "batchSetStorage:ok" };
    }) as PromisifySuccessResult<T, BatchSetStorageOption>;
  },

  batchSetStorageSync(kvList: KvList[]): void {
    const entries = kvList.map(({ key, value }) => ({ key, value: value as unknown }));

    assertBatchQuota(entries);

    for (const { key, value } of entries) storage.set(key, serialize(value));
  },
};

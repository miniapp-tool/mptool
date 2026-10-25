import type { WxApiKind, WxFailure } from "./typings.js";

/** APIs that return synchronously (and therefore throw on failure). */
const SYNC_APIS = new Set<string>([
  "batchSetStorageSync",
  "canIUse",
  "clearStorageSync",
  "getAccountInfoSync",
  "getAppAuthorizeSetting",
  "getAppBaseInfo",
  "getBatteryInfoSync",
  "getDeviceInfo",
  "getEnterOptionsSync",
  "getEnvInfoSync",
  "getExptInfoSync",
  "getLaunchOptionsSync",
  "getMenuButtonBoundingClientRect",
  "getStorageInfoSync",
  "getStorageSync",
  "getSystemInfoSync",
  "getSystemSetting",
  "getWindowInfo",
  "removeStorageSync",
  "setStorageSync",
]);

/** APIs that return task objects. */
const TASK_APIS = new Set<string>(["connectSocket", "downloadFile", "request", "uploadFile"]);

/** APIs that return manager / context objects. */
const MANAGER_APIS = new Set<string>([
  "createCanvasContext",
  "createInnerAudioContext",
  "createIntersectionObserver",
  "createMapContext",
  "createSelectorQuery",
  "createVideoContext",
  "getBackgroundAudioManager",
  "getFileSystemManager",
  "getLogManager",
  "getRealtimeLogManager",
  "getRecorderManager",
  "getUpdateManager",
]);

/** Fire-and-forget APIs without an option object. */
const VOID_APIS = new Set<string>([
  "hideKeyboard",
  "hideLoading",
  "hideToast",
  "nextTick",
  "reportAnalytics",
  "reportEvent",
]);

/** Classify a `wx` API, which decides how an injected failure is surfaced. */
export const getApiKind = (api: string): WxApiKind => {
  if (TASK_APIS.has(api)) return "task";
  if (api.startsWith("on") || api.startsWith("off")) return "event";
  if (SYNC_APIS.has(api)) return "sync";
  if (MANAGER_APIS.has(api)) return "manager";
  if (VOID_APIS.has(api)) return "void";

  return "callback";
};

/** Normalised `fail` payload. */
export interface FailureResult {
  errMsg: string;
  errno?: number;
  errCode?: number;
}

const withOptional = (
  errMsg: string,
  extra: { errno?: number; errCode?: number } = {},
): FailureResult => {
  const result: FailureResult = { errMsg };

  if (typeof extra.errno === "number") result.errno = extra.errno;
  if (typeof extra.errCode === "number") result.errCode = extra.errCode;

  return result;
};

const CANCEL_ERR_MSG: Record<string, string> = {
  navigateToMiniProgram: "navigateToMiniProgram:fail cancel",
  requestPayment: "requestPayment:fail cancel",
  showActionSheet: "showActionSheet:fail cancel",
  showModal: "showModal:fail cancel",
};

/**
 * Map a {@link WxFailure} to the `fail` payload of a concrete API.
 *
 * The exact strings of the real runtime differ between platforms and base library versions; tests
 * should match them with a prefix / `includes()` check.
 */
export const createFailureResult = (api: string, failure: WxFailure): FailureResult => {
  switch (failure.type) {
    case "network": {
      return withOptional(failure.errMsg ?? `${api}:fail`, { errno: failure.errno });
    }

    case "timeout": {
      return withOptional(failure.errMsg ?? `${api}:fail timeout`);
    }

    case "abort": {
      return withOptional(failure.errMsg ?? `${api}:fail abort`);
    }

    case "quota": {
      const errMsg =
        failure.errMsg ??
        (api.toLowerCase().includes("storage")
          ? "setStorage:fail exceed storage max size"
          : `${api}:fail exceed storage max size`);

      return withOptional(errMsg, { errno: failure.errno });
    }

    case "noent": {
      const suffix = failure.path ? ` ${failure.path}` : "";

      return withOptional(failure.errMsg ?? `${api}:fail no such file or directory${suffix}`, {
        errCode: failure.errCode ?? 1300002,
      });
    }

    case "permission": {
      const errMsg =
        failure.errMsg ??
        (api === "authorize" ? "authorize:fail auth deny" : `${api}:fail permission denied`);

      return withOptional(errMsg, { errCode: failure.errCode ?? 1300014 });
    }

    case "cancel": {
      return withOptional(failure.errMsg ?? CANCEL_ERR_MSG[api] ?? `${api}:fail cancel`);
    }

    case "fail": {
      return withOptional(failure.errMsg, { errCode: failure.errCode, errno: failure.errno });
    }

    case "http": {
      throw new TypeError(
        `[mockWx] ${api}: HTTP status codes are responses, not failures; use respond() or route() instead`,
      );
    }

    case "throw": {
      return { errMsg: failure.error.message };
    }

    default: {
      return withOptional(`${api}:fail`);
    }
  }
};

/**
 * Create the error thrown by synchronous APIs (and rejected by promise-style calls).
 *
 * The real runtime rejects with a plain `{ errMsg, errno }` object; the mock uses an `Error`
 * carrying the same properties so stack traces stay readable. Match on `errMsg` / `errno`.
 */
export const createFailureError = (api: string, failure: WxFailure): Error & FailureResult => {
  if (failure.type === "throw") return failure.error as Error & FailureResult;

  const result = createFailureResult(api, failure);

  return Object.assign(new Error(result.errMsg), result);
};

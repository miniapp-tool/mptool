import type { wx } from "./wx.js";

/** Any `wx` API name exposed by the mock. */
export type WxApiName = keyof typeof wx;

/**
 * How a `wx` API delivers its result, which decides how an injected failure is surfaced.
 *
 * - `callback`: option object with `success` / `fail` / `complete`
 * - `task`: returns a task object (`wx.request`)
 * - `sync`: returns a value or throws
 * - `event`: `onXxx` / `offXxx` listener registration
 * - `manager`: returns a manager / context object
 * - `void`: fire-and-forget API without an option object
 */
export type WxApiKind = "callback" | "task" | "sync" | "event" | "manager" | "void";

/** A failure that can be injected into a `wx` API. */
export type WxFailure =
  /** Network unreachable / DNS failure */
  | { type: "network"; errMsg?: string; errno?: number }
  /** Request timeout (`<api>:fail timeout`) */
  | { type: "timeout"; errMsg?: string }
  /** Request aborted (`<api>:fail abort`) */
  | { type: "abort"; errMsg?: string }
  /**
   * HTTP status code.
   *
   * This is not a `fail`: the success callback receives `{ statusCode, data, header }`. It is only
   * valid in `respond()` / `route()`.
   */
  | { type: "http"; statusCode: number; data?: unknown; header?: Record<string, string> }
  /** Storage quota exceeded (single key 1 MB / total 10 MB) */
  | { type: "quota"; errMsg?: string; errno?: number }
  /** File or directory does not exist (errCode 1300002) */
  | { type: "noent"; errMsg?: string; path?: string; errCode?: number }
  /** Permission denied (`authorize:fail auth deny` / errCode 1300014) */
  | { type: "permission"; errMsg?: string; errCode?: number }
  /** User cancelled a dialog / action sheet / payment */
  | { type: "cancel"; errMsg?: string }
  /** Custom `fail` payload */
  | { type: "fail"; errMsg: string; errno?: number; errCode?: number }
  /** Throw a synchronous error (sync APIs only) */
  | { type: "throw"; error: Error };

/** Options shared by all injection rules. */
export interface WxRuleOptions {
  /** Only match the next call (shorthand for `times: 1`). */
  once?: boolean;
  /** How many calls the rule matches; defaults to `Infinity`. */
  times?: number;
  /**
   * Match only calls whose first argument satisfies the predicate.
   *
   * `callIndex` is the zero-based index of the call matched by this rule.
   */
  match?: (arg: unknown, callIndex: number) => boolean;
  /** Delay (ms) before the injected result is delivered; defaults to `0`. */
  delay?: number;
}

/** Handle returned by every rule registration. */
export interface WxRuleHandle {
  /** Stable id of the rule(s). */
  readonly id: string;
  /** Number of calls matched so far. */
  readonly count: number;
  /** Remove the rule(s); idempotent. */
  dispose: () => void;
}

/** A successful response: a value, or a function computing it per call. */
export type WxResponder<R = unknown> = R | ((arg: unknown, callIndex: number) => R | Promise<R>);

/** Response shape used by `route()` for network APIs. */
export interface WxNetworkResponse {
  statusCode?: number;
  data?: unknown;
  header?: Record<string, string>;
  cookies?: string[];
  /** Delay (ms) before the response is delivered. */
  delay?: number;
}

/** `mockWx.storage()` options. */
export interface MockStorageOptions {
  /** Total quota in KB; defaults to `10240`. */
  limitSize?: number;
  /**
   * Single-key quota in KB.
   *
   * Not enforced by default: the developer tools accept multi-MB keys even though the official docs
   * mention a 1 MB per-key limit; set this (for example `1024`) to enforce it in tests.
   */
  keySize?: number;
  /** Behaviour of `getStorage` for a missing key; defaults to `"fail"` (developer-tools behaviour). */
  missingKey?: "fail" | "resolve";
  /** Behaviour of `batchGetStorage` for missing keys; defaults to `"resolve"` (returns `null`). */
  batchMissingKey?: "fail" | "resolve";
  /**
   * Behaviour of `getStorageSync` for a missing key; defaults to `"empty-string"` (developer-tools
   * behaviour).
   */
  missingKeySync?: "empty-string" | "undefined";
}

/** `mockWx.system()` options. */
export interface MockSystemOptions {
  platform?: "ios" | "android" | "devtools" | "windows" | "mac" | "ohos";
  system?: string;
  SDKVersion?: string;
  version?: string;
  theme?: "light" | "dark";
  language?: string;
  windowWidth?: number;
  windowHeight?: number;
  screenWidth?: number;
  screenHeight?: number;
  statusBarHeight?: number;
  safeArea?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
  pixelRatio?: number;
  brand?: string;
  model?: string;
  /** 用户字体大小（px）；默认 16。 */
  fontSizeSetting?: number;
  /** 是否已打开调试；默认 false。 */
  enableDebug?: boolean;
  bluetoothEnabled?: boolean;
  deviceOrientation?: "portrait" | "landscape";
  locationEnabled?: boolean;
  wifiEnabled?: boolean;
  /** `wx.env.USER_DATA_PATH`，默认 `wxfile://usr`。 */
  userDataPath?: string;
}

/** `mockWx.network()` options. */
export interface MockNetworkOptions {
  /** `wifi` / `2g` / `3g` / `4g` / `5g` / `none` / `unknown`. */
  networkType?: string;
  signalStrength?: number;
  weakNet?: boolean;
  /** Simulate a disconnected network. */
  offline?: boolean;
}

/** Compatibility switches for the 0.x migration period; removed in 1.0. */
export interface MockCompatFlags {
  /**
   * Old behaviour: `request` / `uploadFile` / `downloadFile` return a promise when no callbacks are
   * passed.
   */
  promisifyTaskApis?: boolean;
  /** Old behaviour: `getStorage` resolves with `undefined` for a missing key. */
  storageResolveMissingKey?: boolean;
  /** Old behaviour: `getCurrentPages()` is always empty and navigation does not mutate the stack. */
  staticPageStack?: boolean;
}

/** User decisions for UI APIs (consumed by PR-5). */
export interface UserDecisions {
  /** `showModal` / `confirm()`. */
  modal?: "confirm" | "cancel" | { confirm?: boolean; content?: string };
  /** `showActionSheet`: tapped button index, or cancel. */
  actionSheet?: number | "cancel";
  /** `requestPayment`. */
  payment?: "success" | "cancel" | "fail";
  /** `requestSubscribeMessage`. */
  subscribe?: "accept" | "reject" | "cancel";
  /** `getUserProfile` / `getUserInfo`. */
  userInfo?: "allow" | "deny";
  /** Whether the call happens in a user gesture context. */
  gesture?: boolean;
}

/** Read-only UI state exposed by `mockWx.ui()`. */
export interface MockUiState {
  actionSheet: { tapIndex: number } | null;
  loading: { title: string } | null;
  modal: { cancel: boolean; confirm: boolean; content?: string } | null;
  toast: { duration?: number; icon?: string; title: string } | null;
  update: {
    applied: boolean;
    checked: boolean;
    failed: string | null;
    hasUpdate: boolean;
    ready: boolean;
  };
}

/** A rectangle returned by `SelectorQuery.boundingClientRect`. */
export interface MockNodeRect {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
}

/** Fixture registered through `mockWx.node(selector, info)` for `SelectorQuery`. */
export interface MockNodeInfo extends MockNodeRect {
  id?: string;
  dataset?: Record<string, unknown>;
  /** Overrides for `fields()`; merged over the derived values. */
  fields?: Record<string, unknown>;
  /** Value returned by `fields({ node: true })` and `node(callback)`. */
  node?: unknown;
  /** Value returned by `fields({ context: true })` and `context(callback)`. */
  context?: unknown;
  /** Value returned by `fields({ ref: true })` and `ref(callback)`. */
  ref?: unknown;
  scrollLeft?: number;
  scrollTop?: number;
  scrollWidth?: number;
  scrollHeight?: number;
}

/** A viewport-relative rectangle used by `IntersectionObserver` results. */
export interface MockIntersectionRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

/** Result delivered to `IntersectionObserver.observe` callbacks. */
export interface MockIntersectionResult {
  boundingClientRect: MockIntersectionRect;
  intersectionRatio: number;
  intersectionRect: MockIntersectionRect;
  relativeRect: MockIntersectionRect;
  time: number;
}

/** A reversible state scope created by `mockWx.scope()`. */
export interface MockWxScope {
  /** Restore the state captured when the scope was created; idempotent. */
  restore: () => void;
}

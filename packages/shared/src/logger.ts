// oxlint-disable typescript/no-explicit-any
/* oxlint-disable typescript/no-unsafe-argument */
import { env } from "./env.js";

/** 实时日志管理器 */
// should not throw error when `wx.getRealtimeLogManager` is not supported
// oxlint-disable-next-line typescript/strict-boolean-expressions
const log = env === "js" ? console : wx.getRealtimeLogManager?.() || wx.getLogManager({ level: 1 });
const isRealtime = env !== "js" && "getRealtimeLogManager" in wx;
// The realtime manager is not guaranteed to implement `setFilterMsg` (the mock deliberately does
// not rely on it), so probe the capability instead of assuming it.
// 实时日志管理器不保证实现 `setFilterMsg`（mock 也不保证），这里探测能力而不是直接调用。
const canFilter =
  isRealtime && typeof (log as { setFilterMsg?: unknown }).setFilterMsg === "function";

/**
 * 写入普通日志（仅当 `wx.env.DEBUG` 为真时输出）
 *
 * 受 `wx.env.DEBUG` 控制，生产环境默认静默；需要线上日志请使用 `info` / `warn` / `error`。
 *
 * Only emitted when `wx.env.DEBUG` is set, so production builds stay quiet; use `info` / `warn` /
 * `error` for logs that must always be recorded.
 */
export const debug = (...args: any[]): void => {
  // js 环境直接输出到 console
  if (env === "js") {
    console.debug(...args);
    return;
  }

  // wx 环境仅在 DEBUG 模式下写入微信日志并输出到控制台
  if ((wx.env as Record<string, unknown>).DEBUG as boolean | undefined) {
    if (isRealtime) log.info("debug", ...args);
    else (log as WechatMiniprogram.LogManager).debug(...args);
    console.debug(...args);
  }
};

/**
 * 写入信息日志
 *
 * 在非 js 环境下**刻意双写**：既写入微信日志管理器，也输出到 `console`，便于在开发者工具中同时看到； 与 `debug` 不同， `info` / `warn` 不受
 * `wx.env.DEBUG` 控制（与 `error` 一致），线上也会输出。
 *
 * In non-js environments `info` / `warn` are intentionally written to both the wx log manager and
 * the console, and are **not** gated by `wx.env.DEBUG` (unlike `debug`), matching `error`. This is
 * the documented logging policy, not an oversight.
 */
export const info = (...args: any[]): void => {
  log.info(...args);
  if (log !== console) console.info(...args);
};

/**
 * 写入警告日志
 *
 * 在非 js 环境下**刻意双写**（微信日志管理器 + `console`），且不受 `wx.env.DEBUG` 控制，线上也会输出。
 *
 * In non-js environments `warn` is intentionally written to both the wx log manager and the
 * console, and is **not** gated by `wx.env.DEBUG` (unlike `debug`).
 */
export const warn = (...args: any[]): void => {
  log.warn(...args);
  if (log !== console) console.warn(...args);
};

/** 写入错误日志 */
export const error = (...args: any[]): void => {
  // js 环境直接输出到 console
  if (env === "js") {
    console.error(...args);
    return;
  }

  // LogManager 无 error 方法，非实时日志用 warn 兜底并加 "error" 前缀标识
  if (isRealtime) (log as WechatMiniprogram.RealtimeLogManager).error(...args);
  else log.warn("error", ...args);
  // Avoid printing twice when the log manager is `console` itself (the old mock behaviour).
  // 日志管理器本身就是 `console` 时避免重复输出。
  if (log !== console) console.error(...args);
};

/**
 * 写入过滤信息
 *
 * @param filterMsg 过滤信息
 */
export const filter = (filterMsg: string): void => {
  if (canFilter) (log as WechatMiniprogram.RealtimeLogManager).setFilterMsg(filterMsg);
};

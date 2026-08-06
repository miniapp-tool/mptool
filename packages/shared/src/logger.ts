// oxlint-disable typescript/no-explicit-any
/* oxlint-disable typescript/no-unsafe-argument */
import { env } from "./env.js";

/** 实时日志管理器 */
// should not throw error when `wx.getRealtimeLogManager` is not supported
// oxlint-disable-next-line typescript/strict-boolean-expressions
const log = env === "js" ? console : wx.getRealtimeLogManager?.() || wx.getLogManager({ level: 1 });
const isRealtime = env !== "js" && "getRealtimeLogManager" in wx;

/** 写入普通日志 */
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

/** 写入信息日志 */
export const info = (...args: any[]): void => {
  log.info(...args);
  if (log !== console) console.info(...args);
};

/** 写入警告日志 */
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
  console.error(...args);
};

/**
 * 写入过滤信息
 *
 * @param filterMsg 过滤信息
 */
export const filter = (filterMsg: string): void => {
  if (isRealtime) (log as WechatMiniprogram.RealtimeLogManager).setFilterMsg(filterMsg);
};

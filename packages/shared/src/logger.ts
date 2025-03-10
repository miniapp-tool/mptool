/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { env } from "./env.js";

/** 实时日志管理器 */
const log =
  env === "js"
    ? console
    : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      wx.getRealtimeLogManager?.() || wx.getLogManager({ level: 1 });
const isRealtime = env !== "js" && "getRealtimeLogManager" in wx;

/** 写入普通日志 */
export const debug = (...args: any[]): void => {
  if ((wx.env as Record<string, unknown>).DEBUG as boolean | undefined)
    if (isRealtime) log.info("debug", ...args);
    else (log as WechatMiniprogram.LogManager).debug(...args);
  if (log !== console) console.debug(...args);
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
  if (isRealtime) (log as WechatMiniprogram.RealtimeLogManager).error(...args);
  else log.warn("error", ...args);
  if (log !== console) console.error(...args);
};

/**
 * 写入过滤信息
 *
 * @param filterMsg 过滤信息
 */
export const filter = (filterMsg: string): void => {
  if (isRealtime)
    (log as WechatMiniprogram.RealtimeLogManager).setFilterMsg(filterMsg);
};

/** 运行环境（QQ 小程序已停止服务，不再识别 `qq` 全局） */
export type Env = "wx" | "donut" | "js";

/** 运行环境 */
export const env: Env = typeof wx === "object" ? ("miniapp" in wx ? "donut" : "wx") : "js";

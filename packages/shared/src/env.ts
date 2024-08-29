/** 运行环境 */
export type Env = "wx" | "qq" | "donut" | "js";

/** 运行环境 */
/*@__PURE__*/
export const env: Env =
  // @ts-expect-error: qq is not defined in wx mini app
  typeof qq === "object"
    ? "qq"
    : typeof wx === "object"
      ? "miniapp" in wx
        ? "donut"
        : "wx"
      : "js";

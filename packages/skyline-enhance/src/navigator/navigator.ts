import { getConfig } from "../config/index.js";

export type NavigatorType = "navigateTo" | "redirectTo" | "switchTab" | "reLaunch";

/**
 * Normalize a page path to a single leading slash.
 *
 * 统一页面路径为带前导斜杠的形式，避免相对路径被按当前页面解析，并保证与 `$go` / 路由 key 一致。
 *
 * @param path - Page path / 页面路径
 * @returns Normalized path / 规范化后的路径
 */
export const normalizePath = (path: string): string => `/${path.replace(/^\//u, "")}`;

export const getFullPath = (pageNameWithArg: string): string => {
  const config = getConfig();
  const [pageName, queryString] = pageNameWithArg.split("?");
  // Keep the same normalization as `@mptool/enhance`: always add a leading slash, so a route
  // configured without one (e.g. `{ pages: { main: "pages/main" } }`) still navigates absolutely
  // instead of being resolved relative to the current page.
  // 与 @mptool/enhance 保持一致：始终补前导斜杠，避免配置为相对路径时按当前页面解析。
  const path = normalizePath(pageName.startsWith("/") ? pageName : config.getPath(pageName));

  return `${path}${queryString ? `?${queryString}` : ""}`;
};

export function getTrigger(
  type: "navigateTo",
): (pageName: string) => Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>;
export function getTrigger(
  type: "redirectTo" | "switchTab" | "reLaunch",
): (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;

/**
 * Navigation trigger
 *
 * @param type - Navigation type
 * @returns Navigation trigger function
 */
export function getTrigger(
  type: NavigatorType,
  // oxlint-disable-next-line typescript/no-explicit-any
): (pageNameWithArg: string) => any {
  // oxlint-disable-next-line typescript/no-explicit-any
  return (pageNameWithArg: string): any => {
    const fullPath = getFullPath(pageNameWithArg);
    // wx.switchTab does not allow query parameters, only the path is used
    const url = type === "switchTab" ? fullPath.split("?")[0] : fullPath;

    // @ts-expect-error: argument can not union
    return wx[type]({ url });
  };
}

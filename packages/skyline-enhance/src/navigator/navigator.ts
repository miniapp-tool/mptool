import { getConfig } from "../config/index.js";

export type NavigatorType =
  | "navigateTo"
  | "redirectTo"
  | "switchTab"
  | "reLaunch";

export const getFullPath = (pageNameWithArg: string): string => {
  const config = getConfig();
  const [pageName, queryString] = pageNameWithArg.split("?");
  const path = pageName.startsWith("/") ? pageName : config.getPath(pageName);

  return `${path}${queryString ? `?${queryString}` : ""}`;
};

export function getTrigger(
  type: "navigateTo",
): (
  pageName: string,
) => Promise<WechatMiniprogram.NavigateToSuccessCallbackResult>;
export function getTrigger(
  type: "redirectTo",
): (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;
export function getTrigger(
  type: "switchTab",
): (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;
export function getTrigger(
  type: "reLaunch",
): (pageName: string) => Promise<WechatMiniprogram.GeneralCallbackResult>;

/**
 * Navigation trigger
 */
export function getTrigger(
  type: NavigatorType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (pageNameWithArg: string) => any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pageNameWithArg: string): any => {
    // @ts-expect-error: argument can not union

    return wx[type]({ url: getFullPath(pageNameWithArg) });
  };
}

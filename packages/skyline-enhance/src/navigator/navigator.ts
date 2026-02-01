import { getConfig } from "../config/index.js";

export type NavigatorType = "navigateTo" | "redirectTo" | "switchTab" | "reLaunch";

export const getFullPath = (pageNameWithArg: string): string => {
  const config = getConfig();
  const [pageName, queryString] = pageNameWithArg.split("?");
  const path = pageName.startsWith("/") ? pageName : config.getPath(pageName);

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
 * @param type Navigator type
 *
 * @returns Trigger function
 */
export function getTrigger(
  type: NavigatorType,
  // oxlint-disable-next-line typescript/no-explicit-any
): (pageNameWithArg: string) => any {
  // oxlint-disable-next-line arrow-body-style
  return (pageNameWithArg: string): any => {
    // @ts-expect-error: argument can not union
    return wx[type]({ url: getFullPath(pageNameWithArg) });
  };
}

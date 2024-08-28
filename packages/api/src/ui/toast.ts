import { MpError } from "@mptool/shared";

/**
 * 显示提示文字
 *
 * @param title 提示文字
 * @param duration 提示持续时间，单位 ms，默认为 `1500`
 * @param icon 提示图标，默认为 `'none'`
 */
export const showToast = (
  title: string,
  duration = 1500,
  icon: "success" | "error" | "loading" | "none" = "none",
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    wx.showToast({
      title,
      icon,
      duration,
      success: () => resolve(),
      fail: ({ errMsg }) => reject(new MpError({ message: errMsg })),
    });
  });

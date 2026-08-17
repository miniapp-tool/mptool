import { MpError } from "@mptool/shared";

import { withScope } from "./permission.js";

/**
 * 保存联系人到通讯录
 *
 * @param config 联系人信息
 * @returns 保存结果
 */
export const addContact = (
  config: Omit<WechatMiniprogram.AddPhoneContactOption, "success" | "fail" | "complete">,
): Promise<void> =>
  withScope(
    "scope.addPhoneContact",
    () =>
      new Promise<void>((resolve, reject) => {
        wx.addPhoneContact({
          ...config,
          success: () => {
            resolve();
          },
          fail: ({ errMsg }) => {
            reject(new MpError({ message: errMsg }));
          },
        });
      }),
    "如果想要保存联系人，请在“权限设置”允许添加到联系人权限",
  );

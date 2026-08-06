import { MpError, env } from "@mptool/shared";

import { showModal } from "../ui/index.js";

/**
 * 权限申请流程
 *
 * @param scope 权限 scope
 * @param run 目标操作
 * @param denyMessage 用户拒绝权限时的提示
 * @returns 权限申请结果
 */
export const withScope = (
  scope: keyof WechatMiniprogram.AuthSetting,
  run: () => Promise<void>,
  denyMessage: string,
): Promise<void> =>
  new Promise((resolve, reject) => {
    // 执行目标操作，成功后 resolve
    const execute = (): void => {
      void run().then(resolve, reject);
    };

    // donut 环境直接执行目标操作
    if (env === "donut") {
      execute();
      return;
    }

    wx.getSetting({
      success: ({ authSetting }) => {
        // 如果已经授权直接执行目标操作
        if (authSetting[scope]) {
          execute();
        }
        // 没有授权 —> 提示用户授权
        else {
          wx.authorize({
            scope,
            success: () => {
              execute();
            },

            // 用户拒绝权限，提示用户开启权限
            fail: () => {
              showModal("权限被拒", denyMessage, () => {
                void wx.openSetting();
                reject(new MpError({ message: "用户拒绝权限" }));
              });
            },
          });
        }
      },
      fail: ({ errMsg }) => {
        reject(new MpError({ message: errMsg }));
      },
    });
  });

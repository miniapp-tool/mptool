import { logger } from "@mptool/shared";

import { showToast } from "./ui/index.js";

export interface UpdateInfo {
  /** 是否进行强制更新 */
  force: boolean;
  /** 是否进行强制初始化 */
  reset: boolean;
}

/**
 * 检查小程序更新
 *
 * 如果检测到小程序更新，获取升级状态 (新版本号，是否立即更新、是否重置小程序) 并做相应处理
 *
 * @param onUpdateReady 当有更新准备好时的回调
 */
export const updateApp = (
  onUpdateReady: (applyUpdate: () => void) => Promise<void> | void,
): void => {
  if (!("getUpdateManager" in wx)) return;

  const updateManager = wx.getUpdateManager();

  // 检查更新
  updateManager.onCheckForUpdate(({ hasUpdate }) => {
    // 找到更新，提示用户获取到更新
    if (hasUpdate) void showToast("发现小程序更新，下载中...");
  });

  updateManager.onUpdateReady(() => {
    void onUpdateReady(() => {
      // 应用更新
      updateManager.applyUpdate();
    });
  });

  // 更新下载失败
  updateManager.onUpdateFailed((res) => {
    // 提示用户网络出现问题
    void showToast("小程序更新下载失败，请检查您的网络!");

    // 调试
    logger.error("更新应用失败", res);
  });
};

import { MpError, logger } from "@mptool/shared";

import { reportNetworkStatus } from "./report.js";
import { showToast } from "../ui/index.js";

/**
 * 下载文件
 *
 * @param path 下载路径
 * @param mask 遮罩层
 */
export const downLoad = (url: string, mask = false): Promise<string> =>
  new Promise((resolve, reject) => {
    const progress = wx.downloadFile({
      url,
      success: ({ statusCode, tempFilePath }) => {
        void wx.hideLoading();
        if (statusCode === 200) {
          resolve(tempFilePath);
        } else {
          const errMsg = `Download ${url} failed with statusCode: ${statusCode}`;

          void showToast("下载失败");
          logger.warn(errMsg);
          reject(new MpError({ code: statusCode, message: errMsg }));
        }
      },
      fail: ({ errMsg }) => {
        void wx.hideLoading();

        reject(new MpError({ message: errMsg }));

        reportNetworkStatus();
        logger.warn(`Download ${url} failed:`, errMsg);
      },
    });

    progress.onProgressUpdate(({ progress }) => {
      void wx.showLoading({ title: `下载中...${Math.round(progress)}%`, mask });
    });
  });

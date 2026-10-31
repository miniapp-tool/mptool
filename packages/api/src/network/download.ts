import { MpError, logger } from "@mptool/shared";

/**
 * 下载文件
 *
 * @param url 下载路径
 * @param mask 遮罩层
 * @returns 下载完成回调，返回临时文件路径
 */
export const download = (url: string, mask = false): Promise<string> =>
  new Promise((resolve, reject) => {
    // `showLoading` only runs from the progress callback, so a download that finishes without any
    // progress update never showed a loading. Hiding unconditionally would close a loading the
    // caller opened itself.
    let loadingShown = false;
    // Set as soon as the request settles, so a late `onProgressUpdate` cannot show a loading that
    // nobody will hide anymore.
    // 请求结束后忽略迟到的进度回调，避免弹出无人关闭的 loading。
    let settled = false;

    const hideLoading = (): void => {
      if (!loadingShown) return;

      loadingShown = false;
      void wx.hideLoading();
    };

    const downloadTask = wx.downloadFile({
      url,
      success: ({ statusCode, tempFilePath }) => {
        settled = true;
        hideLoading();
        if (statusCode === 200) {
          resolve(tempFilePath);
        } else {
          const errMsg = `Download ${url} failed with statusCode: ${statusCode}`;

          logger.warn(errMsg);
          reject(new MpError({ code: statusCode, message: errMsg }));
        }
      },
      fail: ({ errMsg }) => {
        settled = true;
        hideLoading();

        reject(new MpError({ message: errMsg }));
        logger.warn(`Download ${url} failed:`, errMsg);
      },
    });

    downloadTask.onProgressUpdate(({ progress }) => {
      if (!settled && progress > 1 && progress < 100) {
        loadingShown = true;
        void wx.showLoading({ title: `下载中...${Math.round(progress)}%`, mask });
      }
    });
  });

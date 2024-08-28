import { logger } from "@mptool/shared";

import { downLoad } from "../network/index.js";
import { showModal, showToast } from "../ui/index.js";

export const openDocument = (url: string): void => {
  downLoad(url)
    .then((filePath) => {
      wx.openDocument({
        filePath,
        showMenu: true,
        success: () => {
          logger.debug(`打开文档 ${filePath} 成功`);
        },
        fail: ({ errMsg }) => {
          logger.error(`打开文档 ${filePath} 失败`, errMsg);
        },
      });
    })
    .catch(() => {
      void showToast("下载文档失败");

      wx.reportEvent?.("resource_load_failed", {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        broken_url: url,
      });
    });
};

export const saveDocument = (
  url: string,
  filename = /\/([^/]+)\.[^/]+?$/.exec(url)?.[1] ?? "document",
): void => {
  // 首选添加到收藏
  if (wx.canIUse("addFileToFavorites"))
    downLoad(url)
      .then((filePath) => {
        const docType = url.split(".").pop()!;

        wx.addFileToFavorites({
          fileName: `${filename}.${docType}`,
          filePath,
          success: () => {
            showModal("文件已保存", "文件已保存至“微信收藏”");
            logger.debug(url, "添加至收藏成功");
          },
          fail: ({ errMsg }) => {
            logger.error(url, "添加至收藏失败", errMsg);
          },
        });
      })
      .catch(() => {
        void showToast("下载文档失败");

        wx.reportEvent?.("resource_load_failed", {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          broken_url: url,
        });
      });
};

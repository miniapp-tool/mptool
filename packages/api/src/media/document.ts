import { logger } from "@mptool/shared";

import { download } from "../network/index.js";
import { showModal, showToast } from "../ui/index.js";

export const openDocument = (url: string): void => {
  download(url)
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
        broken_url: url,
      });
    });
};

export const saveDocument = (url: string, filename?: string): void => {
  // 首选添加到收藏
  if (wx.canIUse("addFileToFavorites")) {
    // 去除 query 与 hash，避免污染文件名与扩展名
    const cleanUrl = url.replace(/[?#].*$/u, "");
    // 从 URL 末尾提取文件名（含扩展名），如 "doc.pdf"
    const urlName = /\/([^/]+)$/u.exec(cleanUrl)?.[1] ?? "document";
    // 从 URL 文件名提取扩展名，如 "pdf"
    const dotIndex = urlName.lastIndexOf(".");
    const docType = dotIndex === -1 ? "" : urlName.slice(dotIndex + 1);
    // 用户提供的文件名视为完整文件名：未含扩展名时补充 URL 推导的扩展名；未提供则用 URL 文件名
    const fileName = filename
      ? docType && !filename.includes(".")
        ? `${filename}.${docType}`
        : filename
      : urlName;

    download(url)
      .then((filePath) => {
        wx.addFileToFavorites({
          fileName,
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
          broken_url: url,
        });
      });
  }
};

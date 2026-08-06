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
    const name = /\/([^/]+)$/u.exec(cleanUrl)?.[1] ?? "document";
    const dotIndex = name.lastIndexOf(".");
    // 不含扩展名的文件名，可被调用方覆盖
    const baseName = filename ?? (dotIndex === -1 ? name : name.slice(0, dotIndex));
    const docType = dotIndex === -1 ? "" : name.slice(dotIndex + 1);
    // 用户提供的文件名：已含扩展名则直接使用，否则追加 URL 推导的扩展名
    const fileName = filename
      ? filename.includes(".") || !docType
        ? filename
        : `${filename}.${docType}`
      : docType
        ? `${baseName}.${docType}`
        : baseName;

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

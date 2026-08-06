import { MpError } from "@mptool/shared";

import { download } from "../network/index.js";
import { withScope } from "../private/withScope.js";

/**
 * 保存图片到相册
 *
 * @param imgPath 图片地址
 * @returns 保存回调
 */
export const savePhoto = (imgPath: string): Promise<void> =>
  download(imgPath).then((path) =>
    withScope(
      "scope.writePhotosAlbum",
      () =>
        new Promise<void>((resolve, reject) => {
          wx.saveImageToPhotosAlbum({
            filePath: path,
            success: () => {
              resolve();
            },
            fail: ({ errMsg }) => {
              reject(new MpError({ message: errMsg }));
            },
          });
        }),
      "如果想要保存图片，请在“权限设置”允许保存图片权限",
    ),
  );

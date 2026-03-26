import { MpError } from "@mptool/shared";

export const writeClipboard = (data = ""): Promise<void> =>
  data
    ? new Promise<void>((resolve, reject) => {
        wx.setClipboardData({
          data,
          success: () => {
            resolve();
          },
          fail: ({ errMsg }) => {
            reject(new MpError({ message: errMsg }));
          },
        });
      })
    : Promise.reject(new Error("data is empty"));

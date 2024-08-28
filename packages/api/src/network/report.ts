import { logger } from "@mptool/shared";

import { showToast } from "../ui/index.js";

/** 网络状态汇报 */
export const reportNetworkStatus = (): void => {
  // 获取网络信息
  wx.getNetworkType({
    success: ({ networkType }) => {
      switch (networkType) {
        case "wifi":
          wx.startWifi({
            success: () => {
              wx.getConnectedWifi({
                success: ({ wifi }) => {
                  if (wifi.signalStrength < 0.5)
                    void showToast("Wifi 信号不佳");
                },
                fail: () => {
                  void showToast("无法连接网络");
                },
              });
            },
            fail: () => {
              void showToast("无法连接网络");
            },
          });
          break;
        case "2g":
        case "3g":
          void showToast("您的网络状态不佳");
          break;

        case "none":
          void showToast("您没有连接到网络");
          break;
        default:
          void showToast("网络连接出现问题，请稍后重试");
      }

      logger.error("Request fail with", networkType);
    },
    fail: () => {
      void showToast("网络连接出现问题，请稍后重试");

      logger.error("Request fail and cannot get networkType");
    },
  });
};

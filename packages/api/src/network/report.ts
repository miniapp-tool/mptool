import { logger } from "@mptool/shared";

import { showToast } from "../ui/index.js";

/** 网络状态汇报 */
export const reportNetworkStatus = (): void => {
  // 获取网络信息
  wx.getNetworkType({
    success: ({ networkType }) => {
      switch (networkType) {
        case "wifi": {
          wx.startWifi({
            success: () => {
              wx.getConnectedWifi({
                success: ({ wifi }) => {
                  // signalStrength ranges 0~1 on iOS and 0~100 on Android
                  // oxlint-disable-next-line typescript/no-deprecated, typescript/strict-boolean-expressions
                  const isIos = (wx.getDeviceInfo || wx.getSystemInfoSync)().platform === "ios";

                  if (wifi.signalStrength < (isIos ? 0.5 : 50)) void showToast("Wifi 信号不佳");
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
        }
        case "2g":
        case "3g": {
          void showToast("您的网络状态不佳");
          break;
        }

        case "4g":
        case "5g": {
          // 4g/5g 网络状态良好，无需提示
          break;
        }

        case "none": {
          void showToast("您没有连接到网络");
          break;
        }
        default: {
          void showToast("网络连接出现问题，请稍后重试");
        }
      }

      logger.error("Request fail with", networkType);
    },
    fail: () => {
      void showToast("网络连接出现问题，请稍后重试");

      logger.error("Request fail and cannot get networkType");
    },
  });
};

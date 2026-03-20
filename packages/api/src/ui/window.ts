export const getWindowInfo = (): WechatMiniprogram.WindowInfo =>
  // oxlint-disable-next-line typescript/no-deprecated
  (wx.getWindowInfo || wx.getSystemInfoSync)();

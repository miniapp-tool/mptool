export const getWindowInfo = (): WechatMiniprogram.WindowInfo =>
  // oxlint-disable-next-line typescript/no-deprecated, typescript/strict-boolean-expressions
  (wx.getWindowInfo || wx.getSystemInfoSync)();

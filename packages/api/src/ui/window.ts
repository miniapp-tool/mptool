export const getWindowInfo = (): WechatMiniprogram.WindowInfo =>
  (wx.getWindowInfo || wx.getSystemInfoSync)();

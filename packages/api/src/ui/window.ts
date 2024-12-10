export const getWindowInfo = (): WechatMiniprogram.WindowInfo =>
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-deprecated
  (wx.getWindowInfo || wx.getSystemInfoSync)();

/**
 * 显示提示窗口
 *
 * @param title 提示文字
 * @param content 提示文字
 * @param confirmAction 点击确定的回调函数
 * @param cancelAction 点击取消的回调函数，不填则不显示取消按钮
 * @param failAction 弹窗打开失败的回调函数，不填则退回取消回调
 */
// oxlint-disable-next-line max-params -- keep the existing positional API and append the failure callback
export const showModal = (
  title: string,
  content: string,
  confirmAction?: () => void | Promise<void>,
  cancelAction?: () => void | Promise<void>,
  failAction?: () => void | Promise<void>,
): void => {
  wx.showModal({
    title,
    content,
    showCancel: Boolean(cancelAction),
    success: ({ confirm }) => {
      if (confirm) void confirmAction?.();
      else void cancelAction?.();
    },
    fail: () => void (failAction ?? cancelAction)?.(),
  });
};

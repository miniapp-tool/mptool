/**
 * 显示提示窗口
 *
 * @param title 提示文字
 * @param content 提示文字
 * @param confirmAction 点击确定的回调函数
 * @param cancelAction 点击取消的回调函数，不填则不显示取消按钮
 */
export const showModal = (
  title: string,
  content: string,
  confirmAction?: () => void | Promise<void>,
  cancelAction?: () => void | Promise<void>,
): void => {
  wx.showModal({
    title,
    content,
    showCancel: Boolean(cancelAction),
    // NOTE: For QQ only
    theme: "day",
    success: ({ confirm }) => {
      if (confirm) void confirmAction?.();
      else void cancelAction?.();
    },
    fail: () => cancelAction?.(),
  });
};

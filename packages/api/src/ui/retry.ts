export const retry = (
  title: string,
  content: string,
  retryAction: () => void | Promise<void>,
  navigateBack = false,
): void => {
  wx.showModal({
    title,
    content,
    confirmText: "重试",
    // NOTE: For QQ only
    theme: "day",
    success: ({ confirm }) => {
      if (confirm) void retryAction();
      else if (navigateBack && getCurrentPages().length > 1) void wx.navigateBack();
    },
  });
};

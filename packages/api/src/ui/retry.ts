export const retry = (
  title: string,
  content: string,
  navigateBack = false,
): Promise<void> =>
  new Promise<void>((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText: "重试",
      // NOTE: For QQ only
      theme: "day",
      success: ({ confirm }) => {
        if (confirm) resolve();
        else if (navigateBack && getCurrentPages().length > 1)
          void wx.navigateBack();
      },
      fail: () => {
        if (navigateBack && getCurrentPages().length > 1)
          void wx.navigateBack();
      },
    });
  });

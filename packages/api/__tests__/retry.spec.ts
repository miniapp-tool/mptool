import { frameworkApi } from "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { retry } from "../src/index.js";

describe(retry, () => {
  it("should call retry action on confirm", async () => {
    const retryAction = vi.fn<() => void>();

    retry("title", "content", retryAction);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(retryAction).toHaveBeenCalledTimes(1);
  });

  it("should navigate back on cancel when navigateBack is enabled", () => {
    const mockShowModalApi = wx as unknown as {
      showModal: (option: { success?: (result: { confirm: boolean }) => void }) => void;
    };

    mockShowModalApi.showModal = (option): void => {
      option.success?.({ confirm: false });
    };
    const navigateBack = vi.fn<() => void>();

    wx.navigateBack = navigateBack as unknown as typeof wx.navigateBack;
    frameworkApi.currentPages.length = 2;

    retry("title", "content", vi.fn<() => void>(), true);

    expect(navigateBack).toHaveBeenCalledWith();
  });

  it("should not navigate back when only one page exists", () => {
    const mockShowModalApi = wx as unknown as {
      showModal: (option: { success?: (result: { confirm: boolean }) => void }) => void;
    };

    mockShowModalApi.showModal = (option): void => {
      option.success?.({ confirm: false });
    };
    const navigateBack = vi.fn<() => void>();

    wx.navigateBack = navigateBack as unknown as typeof wx.navigateBack;
    frameworkApi.currentPages.length = 1;

    retry("title", "content", vi.fn<() => void>(), true);

    expect(navigateBack).not.toHaveBeenCalled();
  });
});

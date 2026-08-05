import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

import { confirm } from "../src/index.js";

describe(confirm, () => {
  it("should call confirm action", async () => {
    const action = vi.fn<() => void>();

    confirm("删除", action);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("should call cancel action on cancel", () => {
    const mockShowModalApi = wx as unknown as {
      showModal: (option: { success?: (result: { confirm: boolean }) => void }) => void;
    };

    mockShowModalApi.showModal = (option): void => {
      option.success?.({ confirm: false });
    };
    const cancelAction = vi.fn<() => void>();

    confirm("删除", vi.fn<() => void>(), "", cancelAction);

    expect(cancelAction).toHaveBeenCalledTimes(1);
  });

  it("should show confirm modal with warning", () => {
    const shown: { title: string; content: string }[] = [];
    const mockShowModalApi = wx as unknown as {
      showModal: (option: { title: string; content: string }) => void;
    };

    mockShowModalApi.showModal = (option): void => {
      shown.push({ title: option.title, content: option.content });
    };
    const action = vi.fn<() => void>();

    confirm("删除文件", action, "，此操作不可撤销");

    expect(shown).toStrictEqual([
      { title: "操作确认", content: "您确定要删除文件么?，此操作不可撤销" },
    ]);
    expect(action).not.toHaveBeenCalled();
  });
});

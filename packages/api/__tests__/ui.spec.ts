import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { getWindowInfo, showModal, showToast } from "../src/index.js";

describe(showToast, () => {
  it("should resolve on success", async () => {
    await expect(showToast("hello")).resolves.toBeUndefined();
  });
});

describe(showModal, () => {
  it("should call confirm action on confirm", async () => {
    let called = false;

    showModal("title", "content", () => {
      called = true;
    });

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(called).toBe(true);
  });

  it("should call cancel action on cancel", () => {
    (
      wx as unknown as {
        showModal: (option: {
          success?: (result: { confirm: boolean; cancel: boolean }) => void;
        }) => void;
      }
    ).showModal = (option): void => {
      option.success?.({ confirm: false, cancel: true });
    };

    let called = false;

    showModal("title", "content", undefined, () => {
      called = true;
    });

    expect(called).toBe(true);
  });
});

describe(getWindowInfo, () => {
  it("should return window info", () => {
    const info = getWindowInfo();

    expect(info.windowWidth).toBe(375);
    expect(info.windowHeight).toBe(667);
  });
});

import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { updateApp } from "../src/index.js";

describe(updateApp, () => {
  it("should not throw when registering update callbacks", () => {
    expect(() =>
      updateApp(() => {
        // noop
      }),
    ).not.toThrow();
  });

  it("should apply update when update is ready", () => {
    let readyCallback: (() => void) | undefined;
    let applyUpdate: (() => void) | undefined;
    let applied = false;

    const mockGetUpdateManager = wx as unknown as {
      getUpdateManager: () => {
        onCheckForUpdate: (cb: (result: { hasUpdate: boolean }) => void) => void;
        onUpdateReady: (cb: () => void) => void;
        onUpdateFailed: (cb: (result: { errMsg: string }) => void) => void;
        applyUpdate: () => void;
      };
    };

    mockGetUpdateManager.getUpdateManager = (): {
      onCheckForUpdate: (cb: (result: { hasUpdate: boolean }) => void) => void;
      onUpdateReady: (cb: () => void) => void;
      onUpdateFailed: (cb: (result: { errMsg: string }) => void) => void;
      applyUpdate: () => void;
    } => ({
      onCheckForUpdate: (): void => void 0,
      // oxlint-disable-next-line promise/prefer-await-to-callbacks -- 微信回调 API 需注册回调
      onUpdateReady: (cb: () => void): void => {
        readyCallback = cb;
      },
      onUpdateFailed: (): void => void 0,
      applyUpdate: (): void => {
        applied = true;
      },
    });

    updateApp((apply): void => {
      applyUpdate = apply;
    });

    readyCallback?.();

    expect(applyUpdate).toBeTypeOf("function");

    applyUpdate?.();

    expect(applied).toBe(true);
  });
});

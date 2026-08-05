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

  it("should show toast when an update is found", () => {
    const titles: string[] = [];
    const mockShowToastApi = wx as unknown as {
      showToast: (option: { title: string }) => void;
    };

    mockShowToastApi.showToast = (option): void => {
      titles.push(option.title);
    };
    let checkCallback: ((result: { hasUpdate: boolean }) => void) | undefined;

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
      // oxlint-disable-next-line promise/prefer-await-to-callbacks -- 微信回调 API 需注册回调
      onCheckForUpdate: (cb: (result: { hasUpdate: boolean }) => void): void => {
        checkCallback = cb;
      },
      onUpdateReady: (): void => void 0,
      onUpdateFailed: (): void => void 0,
      applyUpdate: (): void => void 0,
    });

    updateApp(() => {});

    checkCallback?.({ hasUpdate: true });

    expect(titles).toStrictEqual(["发现小程序更新，下载中..."]);
  });

  it("should show toast when update download fails", () => {
    const titles: string[] = [];
    const mockShowToastApi = wx as unknown as {
      showToast: (option: { title: string }) => void;
    };

    mockShowToastApi.showToast = (option): void => {
      titles.push(option.title);
    };
    let failedCallback: ((result: { errMsg: string }) => void) | undefined;

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
      onUpdateReady: (): void => void 0,
      // oxlint-disable-next-line promise/prefer-await-to-callbacks -- 微信回调 API 需注册回调
      onUpdateFailed: (cb: (result: { errMsg: string }) => void): void => {
        failedCallback = cb;
      },
      applyUpdate: (): void => void 0,
    });

    updateApp(() => {});

    failedCallback?.({ errMsg: "download fail" });

    expect(titles).toStrictEqual(["小程序更新下载失败，请检查您的网络!"]);
  });
});

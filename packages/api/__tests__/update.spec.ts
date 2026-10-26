import { mockWx } from "@mptool/mock";
import { afterEach, describe, expect, it } from "vitest";

import { updateApp } from "../src/index.js";

describe(updateApp, () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  it("should not throw when registering update callbacks", () => {
    expect(() =>
      updateApp(() => {
        // noop
      }),
    ).not.toThrow();
  });

  it("should apply update when update is ready", () => {
    let applyUpdate: (() => void) | undefined;

    updateApp((apply): void => {
      applyUpdate = apply;
    });

    mockWx.emit("updateReady");

    expect(applyUpdate).toBeTypeOf("function");

    applyUpdate?.();

    expect(mockWx.ui().update.applied).toBe(true);
  });

  it("should show toast when an update is found", () => {
    updateApp(() => {});

    mockWx.emit("updateCheck", { hasUpdate: true });

    expect(mockWx.ui().toast).toMatchObject({ title: "发现小程序更新，下载中..." });
  });

  it("should show toast when update download fails", () => {
    updateApp(() => {});

    mockWx.emit("updateFailed", { errMsg: "download fail" });

    expect(mockWx.ui().toast).toMatchObject({ title: "小程序更新下载失败，请检查您的网络!" });
  });

  it("should do nothing when getUpdateManager is unavailable", () => {
    const wxApi = wx as unknown as { getUpdateManager?: () => unknown };
    const originalGetUpdateManager = wxApi.getUpdateManager;

    delete wxApi.getUpdateManager;

    expect(() => updateApp(() => {})).not.toThrow();

    wxApi.getUpdateManager = originalGetUpdateManager;
  });

  it("should not show toast when no update is found", () => {
    updateApp(() => {});

    mockWx.emit("updateCheck", { hasUpdate: false });

    expect(mockWx.ui().toast).toBeNull();
  });
});

import { mockWx as mockWxControl } from "@mptool/mock";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { withScope } from "../src/index.js";

describe(withScope, () => {
  const mockGetSetting = (authorized: boolean): void => {
    const mockGetSettingApi = wx as unknown as {
      getSetting: (option: {
        success: (result: { authSetting: Record<string, boolean> }) => void;
      }) => void;
    };

    mockGetSettingApi.getSetting = (option): void => {
      option.success({ authSetting: authorized ? { "scope.camera": true } : {} });
    };
  };

  const mockAuthorize = (fail = false): void => {
    const mockAuthorizeApi = wx as unknown as {
      authorize: (option: { scope: string; success?: () => void; fail?: () => void }) => void;
    };

    mockAuthorizeApi.authorize = (option): void => {
      if (fail) option.fail?.();
      else option.success?.();
    };
  };

  const recordRuns = (): { run: () => Promise<void>; calls: { count: number } } => {
    const calls = { count: 0 };

    return {
      calls,
      run: () => {
        calls.count += 1;

        return Promise.resolve();
      },
    };
  };

  it("should run directly when already authorized", async () => {
    const scopes: string[] = [];
    const mockAuthorizeApi = wx as unknown as {
      authorize: (option: { scope: string }) => void;
    };

    mockAuthorizeApi.authorize = (option): void => {
      scopes.push(option.scope);
    };
    mockGetSetting(true);
    const { run, calls } = recordRuns();

    await expect(withScope("scope.camera", run, "测试权限")).resolves.toBeUndefined();

    expect(calls.count).toBe(1);
    expect(scopes).toStrictEqual([]);
  });

  it("should request authorization and then run", async () => {
    const scopes: string[] = [];
    const mockAuthorizeApi = wx as unknown as {
      authorize: (option: { scope: string; success?: () => void }) => void;
    };

    mockAuthorizeApi.authorize = (option): void => {
      scopes.push(option.scope);
      option.success?.();
    };
    mockGetSetting(false);
    const { run, calls } = recordRuns();

    await expect(withScope("scope.camera", run, "测试权限")).resolves.toBeUndefined();

    expect(calls.count).toBe(1);
    expect(scopes).toStrictEqual(["scope.camera"]);
  });

  it("should reject when user denies authorization", async () => {
    let modalTitle = "";
    const mockShowModalApi = wx as unknown as {
      showModal: (option: {
        title: string;
        content: string;
        success?: (result: { confirm: boolean }) => void;
      }) => void;
    };

    mockShowModalApi.showModal = (option): void => {
      modalTitle = option.title;
      option.success?.({ confirm: true });
    };
    const openCalls: string[] = [];
    const mockOpenSettingApi = wx as unknown as {
      openSetting: (option?: { success?: () => void }) => void;
    };

    mockOpenSettingApi.openSetting = (option): void => {
      openCalls.push("openSetting");
      option?.success?.();
    };
    mockAuthorize(true);
    mockGetSetting(false);
    const { run, calls } = recordRuns();

    await expect(withScope("scope.camera", run, "请在设置中开启权限")).rejects.toThrow(
      "用户拒绝权限",
    );

    expect(modalTitle).toBe("权限被拒");
    expect(openCalls).toStrictEqual(["openSetting"]);
    expect(calls.count).toBe(0);
  });

  it("should reject when getSetting fails", async () => {
    const mockGetSettingApi = wx as unknown as {
      getSetting: (option: { fail: (result: { errMsg: string }) => void }) => void;
    };

    mockGetSettingApi.getSetting = (option): void => {
      option.fail({ errMsg: "mock getSetting error" });
    };
    const { run, calls } = recordRuns();

    await expect(withScope("scope.camera", run, "测试权限")).rejects.toThrow(
      "mock getSetting error",
    );

    expect(calls.count).toBe(0);
  });
});

describe("withScope modal failure", () => {
  it("should reject when the denial modal fails to open", async () => {
    const mockWx = wx as unknown as {
      getSetting: (option: {
        success: (result: { authSetting: Record<string, boolean> }) => void;
      }) => void;
      authorize: (option: { scope: string; fail?: () => void }) => void;
      showModal: (option: { fail?: () => void }) => void;
    };

    mockWx.getSetting = (option): void => {
      option.success({ authSetting: {} });
    };
    mockWx.authorize = (option): void => {
      option.fail?.();
    };
    mockWx.showModal = (option): void => {
      option.fail?.();
    };

    await expect(withScope("scope.camera", () => Promise.resolve(), "测试权限")).rejects.toThrow(
      "权限提示框打开失败",
    );
  });
});

describe("withScope with mockWx decisions", () => {
  const recordRuns = (): { run: () => Promise<void>; calls: { count: number } } => {
    const calls = { count: 0 };

    return {
      calls,
      run: () => {
        calls.count += 1;

        return Promise.resolve();
      },
    };
  };

  // oxlint-disable-next-line vitest/no-hooks
  beforeEach(() => {
    mockWxControl.reset();
  });

  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWxControl.reset();
  });

  it("should run when the scope is already authorized", async () => {
    mockWxControl.auth({ "scope.camera": true });

    const { calls, run } = recordRuns();

    await expect(withScope("scope.camera", run, "deny")).resolves.toBeUndefined();
    expect(calls.count).toBe(1);
  });

  it("should reject through the mock modal / openSetting flow when denied", async () => {
    mockWxControl.authorize("deny");

    const { calls, run } = recordRuns();

    await expect(withScope("scope.camera", run, "请开启权限")).rejects.toThrow("用户拒绝权限");
    expect(calls.count).toBe(0);
    expect(mockWxControl.ui().modal).toMatchObject({ confirm: true });
  });

  it("should surface a getSetting failure", async () => {
    mockWxControl.failNext("getSetting", { type: "network" });

    const { run } = recordRuns();

    await expect(withScope("scope.camera", run, "deny")).rejects.toThrow(/getSetting:fail/u);
  });
});

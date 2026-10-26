import "@mptool/mock";
import { describe, expect, it, vi } from "vitest";

describe("withScope in donut environment", () => {
  it("should run the target action directly without querying permissions", async () => {
    const wxApi = wx as unknown as {
      miniapp?: unknown;
      getSetting: (option: unknown) => void;
    };
    const originalGetSetting = wxApi.getSetting;
    const getSetting = vi.fn<(option: unknown) => void>();
    const run = vi.fn<() => Promise<void>>(() => Promise.resolve());

    wxApi.miniapp = {};
    wxApi.getSetting = getSetting;

    // `@mptool/shared` reads the environment when it is first evaluated, so load `withScope` with a
    // fresh module registry after `wx.miniapp` has been installed.
    vi.resetModules();

    const { withScope } = await import("../src/permission.js");

    await expect(withScope("scope.camera", run, "deny message")).resolves.toBeUndefined();

    expect(run).toHaveBeenCalledTimes(1);
    expect(getSetting).not.toHaveBeenCalled();

    delete wxApi.miniapp;
    wxApi.getSetting = originalGetSetting;
  });
});

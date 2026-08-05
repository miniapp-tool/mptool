import { describe, expect, it } from "vitest";

import { wx } from "../src/index.js";

describe("ui mock", () => {
  it("showToast should resolve", async () => {
    await expect(wx.showToast({ title: "hi" })).resolves.toStrictEqual({
      errMsg: "showToast:ok",
    });
  });

  it("showModal should confirm by default", async () => {
    const res = (await wx.showModal({ title: "t", content: "c" })) as {
      confirm: boolean;
      cancel: boolean;
    };

    expect(res.confirm).toBe(true);
    expect(res.cancel).toBe(false);
  });

  it("getSetting should return empty authSetting", async () => {
    const res = (await wx.getSetting({})) as { authSetting: Record<string, boolean> };

    expect(res.authSetting).toStrictEqual({});
  });

  it("getWindowInfo should return window info", () => {
    expect(wx.getWindowInfo().windowWidth).toBe(375);
  });

  it("getUpdateManager should return update manager", () => {
    const updateManager = wx.getUpdateManager();

    expect(updateManager).toBeDefined();
    expect(updateManager.onUpdateReady).toBeTypeOf("function");
  });
});

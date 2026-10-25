import { afterEach, describe, expect, it } from "vitest";

import { mockWx, wx } from "../src/index.js";

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("ui decisions", () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("defaults (backward compatible)", () => {
    it("should keep the previous modal / actionSheet defaults", async () => {
      const modal = await wx.showModal({ content: "x" });

      expect(modal).toMatchObject({ cancel: false, confirm: true });

      const actionSheet = await wx.showActionSheet({ itemList: ["a", "b"] });

      expect(actionSheet).toMatchObject({ tapIndex: 0 });
    });

    it("should keep empty auth settings / clipboard by default", async () => {
      await expect(wx.getSetting({})).resolves.toMatchObject({ authSetting: {} });
      await expect(wx.getClipboardData({})).resolves.toMatchObject({ data: "" });
    });
  });

  describe("toast / loading state", () => {
    it("should expose and clear toast state", () => {
      void wx.showToast({ icon: "success", title: "saved" });

      expect(mockWx.ui().toast).toMatchObject({ icon: "success", title: "saved" });

      wx.hideToast();

      expect(mockWx.ui().toast).toBeNull();
    });

    it("should expose and clear loading state", () => {
      void wx.showLoading({ title: "loading" });

      expect(mockWx.ui().loading).toStrictEqual({ title: "loading" });

      wx.hideLoading();

      expect(mockWx.ui().loading).toBeNull();
    });
  });

  describe("showModal", () => {
    it("should return cancel when the user cancels", async () => {
      mockWx.user({ modal: "cancel" });

      const result = await wx.showModal({ content: "x" });

      expect(result).toMatchObject({ cancel: true, confirm: false });
      expect(mockWx.ui().modal).toMatchObject({ cancel: true, confirm: false });
    });

    it("should support editable content", async () => {
      mockWx.user({ modal: { confirm: true, content: "typed" } });

      const result = (await wx.showModal({ content: "x", editable: true })) as {
        confirm: boolean;
        content: string;
      };

      expect(result.confirm).toBe(true);
      expect(result.content).toBe("typed");
    });
  });

  describe("showActionSheet", () => {
    it("should return the configured index", async () => {
      mockWx.user({ actionSheet: 1 });

      const result = (await wx.showActionSheet({ itemList: ["a", "b"] })) as {
        tapIndex: number;
      };

      expect(result.tapIndex).toBe(1);
      expect(mockWx.ui().actionSheet).toStrictEqual({ tapIndex: 1 });
    });

    it("should fail when the user cancels", async () => {
      mockWx.user({ actionSheet: "cancel" });

      await expect(wx.showActionSheet({ itemList: ["a"] })).rejects.toMatchObject({
        errMsg: "showActionSheet:fail cancel",
      });
      expect(mockWx.ui().actionSheet).toBeNull();
    });

    it("should fail for an out-of-range index", async () => {
      mockWx.user({ actionSheet: 5 });

      await expect(wx.showActionSheet({ itemList: ["a"] })).rejects.toMatchObject({
        errMsg: "showActionSheet:fail index out of range",
      });
    });
  });

  describe("authorization", () => {
    it("should record a successful authorization in getSetting", async () => {
      await expect(wx.authorize({ scope: "scope.camera" })).resolves.toMatchObject({
        errMsg: "authorize:ok",
      });
      await expect(wx.getSetting({})).resolves.toMatchObject({
        authSetting: { "scope.camera": true },
      });
    });

    it("should fail when authorization is denied globally", async () => {
      mockWx.authorize("deny");

      await expect(wx.authorize({ scope: "scope.camera" })).rejects.toMatchObject({
        errMsg: "authorize:fail auth deny",
      });
      await expect(wx.getSetting({})).resolves.toMatchObject({
        authSetting: { "scope.camera": false },
      });
    });

    it("should fail for a pre-denied scope", async () => {
      mockWx.auth({ "scope.camera": false });

      await expect(wx.authorize({ scope: "scope.camera" })).rejects.toMatchObject({
        errMsg: "authorize:fail auth deny",
      });
    });

    it("should expose the auth setting through openSetting", async () => {
      mockWx.auth({ "scope.camera": true, "scope.writePhotosAlbum": false });

      await expect(wx.openSetting({})).resolves.toMatchObject({
        authSetting: { "scope.camera": true, "scope.writePhotosAlbum": false },
      });
    });
  });

  describe("clipboard", () => {
    it("should round-trip setClipboardData / getClipboardData", async () => {
      await wx.setClipboardData({ data: "copied" });

      await expect(wx.getClipboardData({})).resolves.toMatchObject({ data: "copied" });
    });

    it("should use the mockWx.clipboard preset", async () => {
      mockWx.clipboard("preset");

      await expect(wx.getClipboardData({})).resolves.toMatchObject({ data: "preset" });
    });
  });

  describe("photos album", () => {
    it("should fail when the album scope is denied", async () => {
      mockWx.auth({ "scope.writePhotosAlbum": false });

      await expect(wx.saveImageToPhotosAlbum({ filePath: "x" })).rejects.toMatchObject({
        errMsg: "saveImageToPhotosAlbum:fail auth deny",
      });
      await expect(wx.saveVideoToPhotosAlbum({ filePath: "x" })).rejects.toMatchObject({
        errMsg: "saveVideoToPhotosAlbum:fail auth deny",
      });
    });

    it("should succeed by default", async () => {
      await expect(wx.saveImageToPhotosAlbum({ filePath: "x" })).resolves.toMatchObject({
        errMsg: "saveImageToPhotosAlbum:ok",
      });
    });
  });

  describe("update manager", () => {
    it("should dispatch check / ready / failed events", async () => {
      const manager = wx.getUpdateManager();
      const checks: boolean[] = [];
      let ready = 0;
      const failed: string[] = [];

      manager.onCheckForUpdate(({ hasUpdate }) => {
        checks.push(hasUpdate);
      });
      manager.onUpdateReady(() => {
        ready += 1;
      });
      manager.onUpdateFailed(({ errMsg }) => {
        failed.push(errMsg);
      });

      mockWx.emit("updateCheck", { hasUpdate: true });
      mockWx.emit("updateReady");
      mockWx.emit("updateFailed", { errMsg: "network" });

      await tick();

      expect(checks).toStrictEqual([true]);
      expect(ready).toBe(1);
      expect(failed).toStrictEqual(["network"]);
    });

    it("should record applyUpdate in the UI state", () => {
      const manager = wx.getUpdateManager();

      manager.applyUpdate();

      expect(mockWx.ui().update.applied).toBe(true);
    });

    it("should be restorable through a scope", () => {
      const scope = mockWx.scope();

      void wx.showToast({ title: "inside" });
      mockWx.user({ modal: "cancel" });

      scope.restore();

      expect(mockWx.ui().toast).toBeNull();
      expect(mockWx.ui().modal).toBeNull();
    });
  });
});

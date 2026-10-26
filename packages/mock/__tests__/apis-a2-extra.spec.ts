import { afterEach, describe, expect, it } from "vitest";

import { mockWx, wx } from "../src/index.js";

describe("a2 media / share / audio api mock", () => {
  // oxlint-disable-next-line vitest/no-hooks
  afterEach(() => {
    mockWx.reset();
  });

  describe("media", () => {
    it("should return address / contact / invoice / poi selections", async () => {
      await expect(wx.chooseAddress({})).resolves.toMatchObject({
        cityName: "Shenzhen",
        errMsg: "chooseAddress:ok",
        telNumber: "13800000000",
        userName: "Mock User",
      });
      await expect(wx.chooseContact({})).resolves.toMatchObject({
        phoneNumber: "13800000000",
      });
      await expect(wx.chooseInvoice({})).resolves.toMatchObject({ invoiceInfo: "mock-invoice" });
      await expect(wx.chooseInvoiceTitle({})).resolves.toMatchObject({ title: "Mock Company" });
      await expect(wx.choosePoi({})).resolves.toMatchObject({ name: "Mock POI" });
    });

    it("should resolve preview / save / privacy / video editor calls", async () => {
      await expect(wx.previewMedia({ sources: [] })).resolves.toMatchObject({
        errMsg: "previewMedia:ok",
      });
      await expect(wx.saveFileToDisk({ filePath: "mock://tmp/a" })).resolves.toMatchObject({
        errMsg: "saveFileToDisk:ok",
      });
      await expect(wx.openPrivacyContract({})).resolves.toMatchObject({
        errMsg: "openPrivacyContract:ok",
      });
      await expect(wx.openVideoEditor({ filePath: "a.mp4" })).resolves.toMatchObject({
        tempFilePath: "mock://tmp/edited.mp4",
      });
    });

    it("should return temp files for compress / crop / edit", async () => {
      await expect(wx.compressVideo({ src: "a.mp4" })).resolves.toMatchObject({
        tempFilePath: "mock://tmp/compressed.mp4",
      });
      await expect(wx.cropImage({ src: "a.png" })).resolves.toMatchObject({
        tempFilePath: "mock://tmp/cropped.png",
      });
      await expect(wx.editImage({ src: "a.png" })).resolves.toMatchObject({
        tempFilePath: "mock://tmp/edited.png",
      });
    });
  });

  describe("share / lifecycle", () => {
    it("should resolve share APIs", async () => {
      for (const api of [
        "shareAppMessageToGroup",
        "shareEmojiToGroup",
        "shareFileMessage",
        "shareFileToGroup",
        "shareImageToGroup",
        "shareToOfficialAccount",
        "shareToWeRun",
        "shareVideoMessage",
        "shareVideoToGroup",
      ] as const)
        // oxlint-disable-next-line no-await-in-loop
        await expect(wx[api]({})).resolves.toMatchObject({ errMsg: `${api}:ok` });
    });

    it("should resolve mini-program lifecycle APIs", async () => {
      await expect(wx.restartMiniProgram({})).resolves.toMatchObject({
        errMsg: "restartMiniProgram:ok",
      });
      await expect(wx.updateWeChatApp({})).resolves.toMatchObject({
        errMsg: "updateWeChatApp:ok",
      });
      await expect(wx.exitMiniProgram({})).resolves.toMatchObject({
        errMsg: "exitMiniProgram:ok",
      });
      await expect(wx.postMessageToReferrerPage({})).resolves.toMatchObject({
        errMsg: "postMessageToReferrerPage:ok",
      });
      await expect(wx.postMessageToReferrerMiniProgram({})).resolves.toMatchObject({
        errMsg: "postMessageToReferrerMiniProgram:ok",
      });
    });
  });

  describe("audio", () => {
    it("should resolve voice APIs", async () => {
      await expect(wx.playVoice({ filePath: "a.mp3" })).resolves.toMatchObject({
        errMsg: "playVoice:ok",
      });
      await expect(wx.pauseVoice({})).resolves.toMatchObject({ errMsg: "pauseVoice:ok" });
      await expect(wx.stopVoice({})).resolves.toMatchObject({ errMsg: "stopVoice:ok" });
    });

    it("should resolve background audio APIs", async () => {
      await expect(wx.playBackgroundAudio({ title: "a" })).resolves.toMatchObject({
        errMsg: "playBackgroundAudio:ok",
      });
      await expect(wx.pauseBackgroundAudio({})).resolves.toMatchObject({
        errMsg: "pauseBackgroundAudio:ok",
      });
      await expect(wx.stopBackgroundAudio({})).resolves.toMatchObject({
        errMsg: "stopBackgroundAudio:ok",
      });
      await expect(wx.seekBackgroundAudio({ position: 1 })).resolves.toMatchObject({
        errMsg: "seekBackgroundAudio:ok",
      });
    });

    it("should return player state and audio options", async () => {
      await expect(wx.getBackgroundAudioPlayerState({})).resolves.toMatchObject({
        downloadPercent: 100,
        status: 0,
      });
      await expect(wx.setInnerAudioOption({ mixWithOther: true })).resolves.toMatchObject({
        errMsg: "setInnerAudioOption:ok",
      });
      await expect(wx.getAvailableAudioSources({})).resolves.toMatchObject({
        audioSources: expect.arrayContaining(["mic"]),
      });
      await expect(wx.getAudioFileInfo({ filePath: "a.mp3" })).resolves.toMatchObject({
        duration: 0,
        size: 0,
      });
    });

    it("should resolve record APIs", async () => {
      await expect(wx.startRecord({})).resolves.toMatchObject({ errMsg: "startRecord:ok" });
      await expect(wx.stopRecord({})).resolves.toMatchObject({
        tempFilePath: "mock://tmp/record.mp3",
      });
    });
  });

  describe("integration", () => {
    it("should expose the new APIs through canIUse", () => {
      for (const api of [
        "chooseAddress",
        "previewMedia",
        "compressVideo",
        "shareAppMessageToGroup",
        "playVoice",
        "getBackgroundAudioPlayerState",
        "stopRecord",
      ])
        expect(wx.canIUse(api)).toBe(true);
    });

    it("should support failure injection", async () => {
      mockWx.failNext("chooseAddress", { type: "cancel" });

      await expect(wx.chooseAddress({})).rejects.toThrow(/chooseAddress:fail/u);
    });
  });
});

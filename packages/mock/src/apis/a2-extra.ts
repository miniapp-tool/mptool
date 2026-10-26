import { callCallback } from "../ui.js";

const ok = (option: unknown, errMsg: string): unknown => callCallback(option, { errMsg });

/** Media / share / audio APIs (A2 batch 2). */
export const a2ExtraApi = {
  // ---- media ----
  chooseAddress(option?: unknown): unknown {
    return callCallback(option, {
      cityName: "Shenzhen",
      countyName: "Nanshan",
      detailInfo: "Science Park",
      errMsg: "chooseAddress:ok",
      nationalCode: "440305",
      postalCode: "518000",
      provinceName: "Guangdong",
      telNumber: "13800000000",
      userName: "Mock User",
    });
  },

  chooseContact(option?: unknown): unknown {
    return callCallback(option, { errMsg: "chooseContact:ok", phoneNumber: "13800000000" });
  },

  chooseInvoice(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "chooseInvoice:ok",
      invoiceInfo: "mock-invoice",
    });
  },

  chooseInvoiceTitle(option?: unknown): unknown {
    return callCallback(option, {
      bankAccount: "",
      bankName: "",
      companyAddress: "",
      errMsg: "chooseInvoiceTitle:ok",
      taxNumber: "",
      telephone: "",
      title: "Mock Company",
      type: 0,
    });
  },

  choosePoi(option?: unknown): unknown {
    return callCallback(option, {
      address: "Science Park",
      errMsg: "choosePoi:ok",
      latitude: 22.54,
      longitude: 113.93,
      name: "Mock POI",
    });
  },

  previewMedia(option?: unknown): unknown {
    return ok(option, "previewMedia:ok");
  },

  compressVideo(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "compressVideo:ok",
      size: 0,
      tempFilePath: "mock://tmp/compressed.mp4",
    });
  },

  cropImage(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "cropImage:ok",
      tempFilePath: "mock://tmp/cropped.png",
    });
  },

  editImage(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "editImage:ok",
      tempFilePath: "mock://tmp/edited.png",
    });
  },

  saveFileToDisk(option?: unknown): unknown {
    return ok(option, "saveFileToDisk:ok");
  },

  openPrivacyContract(option?: unknown): unknown {
    return ok(option, "openPrivacyContract:ok");
  },

  openVideoEditor(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "openVideoEditor:ok",
      tempFilePath: "mock://tmp/edited.mp4",
    });
  },

  // ---- share / mini-program lifecycle ----
  shareAppMessageToGroup(option?: unknown): unknown {
    return ok(option, "shareAppMessageToGroup:ok");
  },

  shareEmojiToGroup(option?: unknown): unknown {
    return ok(option, "shareEmojiToGroup:ok");
  },

  shareFileMessage(option?: unknown): unknown {
    return ok(option, "shareFileMessage:ok");
  },

  shareFileToGroup(option?: unknown): unknown {
    return ok(option, "shareFileToGroup:ok");
  },

  shareImageToGroup(option?: unknown): unknown {
    return ok(option, "shareImageToGroup:ok");
  },

  shareToOfficialAccount(option?: unknown): unknown {
    return ok(option, "shareToOfficialAccount:ok");
  },

  shareToWeRun(option?: unknown): unknown {
    return ok(option, "shareToWeRun:ok");
  },

  shareVideoMessage(option?: unknown): unknown {
    return ok(option, "shareVideoMessage:ok");
  },

  shareVideoToGroup(option?: unknown): unknown {
    return ok(option, "shareVideoToGroup:ok");
  },

  restartMiniProgram(option?: unknown): unknown {
    return ok(option, "restartMiniProgram:ok");
  },

  updateWeChatApp(option?: unknown): unknown {
    return ok(option, "updateWeChatApp:ok");
  },

  exitMiniProgram(option?: unknown): unknown {
    return ok(option, "exitMiniProgram:ok");
  },

  postMessageToReferrerPage(option?: unknown): unknown {
    return ok(option, "postMessageToReferrerPage:ok");
  },

  postMessageToReferrerMiniProgram(option?: unknown): unknown {
    return ok(option, "postMessageToReferrerMiniProgram:ok");
  },

  // ---- audio ----
  playVoice(option?: unknown): unknown {
    return ok(option, "playVoice:ok");
  },

  pauseVoice(option?: unknown): unknown {
    return ok(option, "pauseVoice:ok");
  },

  stopVoice(option?: unknown): unknown {
    return ok(option, "stopVoice:ok");
  },

  playBackgroundAudio(option?: unknown): unknown {
    return ok(option, "playBackgroundAudio:ok");
  },

  pauseBackgroundAudio(option?: unknown): unknown {
    return ok(option, "pauseBackgroundAudio:ok");
  },

  stopBackgroundAudio(option?: unknown): unknown {
    return ok(option, "stopBackgroundAudio:ok");
  },

  seekBackgroundAudio(option?: unknown): unknown {
    return ok(option, "seekBackgroundAudio:ok");
  },

  getBackgroundAudioPlayerState(option?: unknown): unknown {
    return callCallback(option, {
      bufferedPercent: 100,
      currentPosition: 0,
      downloadPercent: 100,
      duration: 0,
      errMsg: "getBackgroundAudioPlayerState:ok",
      status: 0,
    });
  },

  setInnerAudioOption(option?: unknown): unknown {
    return ok(option, "setInnerAudioOption:ok");
  },

  getAvailableAudioSources(option?: unknown): unknown {
    return callCallback(option, {
      audioSources: ["auto", "buildInMic", "headsetMic", "mic", "camcorder"],
      errMsg: "getAvailableAudioSources:ok",
    });
  },

  getAudioFileInfo(option?: unknown): unknown {
    return callCallback(option, {
      duration: 0,
      errMsg: "getAudioFileInfo:ok",
      size: 0,
    });
  },

  startRecord(option?: unknown): unknown {
    return ok(option, "startRecord:ok");
  },

  stopRecord(option?: unknown): unknown {
    return callCallback(option, {
      errMsg: "stopRecord:ok",
      tempFilePath: "mock://tmp/record.mp3",
    });
  },
};

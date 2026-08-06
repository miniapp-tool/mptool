import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { savePhoto } from "../src/index.js";

describe(savePhoto, () => {
  const mockDownloadFile = (): void => {
    const mockDownloadFileApi = wx as unknown as {
      downloadFile: (option: {
        success?: (result: { statusCode: number; tempFilePath: string }) => void;
      }) => void;
    };

    mockDownloadFileApi.downloadFile = (option): void => {
      option.success?.({ statusCode: 200, tempFilePath: "mock://temp/img.png" });
    };
  };

  const mockGetSetting = (authorized: boolean): void => {
    const mockGetSettingApi = wx as unknown as {
      getSetting: (option: {
        success: (result: { authSetting: Record<string, boolean> }) => void;
      }) => void;
    };

    mockGetSettingApi.getSetting = (option): void => {
      option.success({
        authSetting: authorized ? { "scope.writePhotosAlbum": true } : {},
      });
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

  const mockSaveImage = (): string[] => {
    const paths: string[] = [];
    const mockSaveImageApi = wx as unknown as {
      saveImageToPhotosAlbum: (option: { filePath: string; success?: () => void }) => void;
    };

    mockSaveImageApi.saveImageToPhotosAlbum = (option): void => {
      paths.push(option.filePath);
      option.success?.();
    };

    return paths;
  };

  it("should save image directly when authorized", async () => {
    const paths = mockSaveImage();
    mockDownloadFile();
    mockGetSetting(true);

    await expect(savePhoto("https://example.com/img.png")).resolves.toBeUndefined();

    expect(paths).toStrictEqual(["mock://temp/img.png"]);
  });

  it("should request authorization and save image", async () => {
    const scopes: string[] = [];
    const mockAuthorizeApi = wx as unknown as {
      authorize: (option: { scope: string; success?: () => void }) => void;
    };

    mockAuthorizeApi.authorize = (option): void => {
      scopes.push(option.scope);
      option.success?.();
    };
    const paths = mockSaveImage();
    mockDownloadFile();
    mockGetSetting(false);

    await expect(savePhoto("https://example.com/img.png")).resolves.toBeUndefined();

    expect(scopes).toStrictEqual(["scope.writePhotosAlbum"]);
    expect(paths).toStrictEqual(["mock://temp/img.png"]);
  });

  it("should reject when user denies authorization", async () => {
    let modalShown = false;
    const mockShowModalApi = wx as unknown as {
      showModal: (option: {
        title: string;
        success?: (result: { confirm: boolean }) => void;
      }) => void;
    };

    mockShowModalApi.showModal = (option): void => {
      modalShown = true;
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
    mockDownloadFile();
    mockGetSetting(false);

    await expect(savePhoto("https://example.com/img.png")).rejects.toThrow("用户拒绝权限");

    expect(modalShown).toBe(true);
    expect(openCalls).toStrictEqual(["openSetting"]);
  });

  it("should reject when download fails", async () => {
    const mockDownloadFileApi = wx as unknown as {
      downloadFile: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockDownloadFileApi.downloadFile = (option): void => {
      option.fail?.({ errMsg: "download fail" });
    };

    await expect(savePhoto("https://example.com/img.png")).rejects.toThrow("download fail");
  });

  it("should reject when getSetting fails", async () => {
    const mockGetSettingApi = wx as unknown as {
      getSetting: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockGetSettingApi.getSetting = (option): void => {
      option.fail?.({ errMsg: "getSetting fail" });
    };
    mockDownloadFile();

    await expect(savePhoto("https://example.com/img.png")).rejects.toThrow("getSetting fail");
  });

  it("should reject when saveImageToPhotosAlbum fails", async () => {
    const mockSaveImageApi = wx as unknown as {
      saveImageToPhotosAlbum: (option: {
        filePath: string;
        fail?: (result: { errMsg: string }) => void;
      }) => void;
    };

    mockSaveImageApi.saveImageToPhotosAlbum = (option): void => {
      option.fail?.({ errMsg: "saveImage fail" });
    };
    mockDownloadFile();
    mockGetSetting(true);

    await expect(savePhoto("https://example.com/img.png")).rejects.toThrow("saveImage fail");
  });
});

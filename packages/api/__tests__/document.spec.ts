import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { openDocument, saveDocument } from "../src/index.js";

/**
 * 等待异步回调链完成
 *
 * @returns 等待完成的 Promise
 */
const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const mockDownloadFile = (fail = false): void => {
  const mockDownloadFileApi = wx as unknown as {
    downloadFile: (option: {
      success?: (result: { statusCode: number; tempFilePath: string }) => void;
      fail?: (result: { errMsg: string }) => void;
    }) => void;
  };

  mockDownloadFileApi.downloadFile = (option): void => {
    if (fail) option.fail?.({ errMsg: "download fail" });
    else option.success?.({ statusCode: 200, tempFilePath: "mock://temp/doc.pdf" });
  };
};

const mockShowToast = (): string[] => {
  const titles: string[] = [];
  const mockShowToastApi = wx as unknown as {
    showToast: (option: { title: string }) => void;
  };

  mockShowToastApi.showToast = (option): void => {
    titles.push(option.title);
  };

  return titles;
};

const mockShowModal = (): string[] => {
  const titles: string[] = [];
  const mockShowModalApi = wx as unknown as {
    showModal: (option: { title: string }) => void;
  };

  mockShowModalApi.showModal = (option): void => {
    titles.push(option.title);
  };

  return titles;
};

const mockReportEvent = (): string[] => {
  const events: string[] = [];
  const mockReportEventApi = wx as unknown as {
    reportEvent: (name: string) => void;
  };

  mockReportEventApi.reportEvent = (name): void => {
    events.push(name);
  };

  return events;
};

const mockCanIUse = (result: boolean): void => {
  const mockCanIUseApi = wx as unknown as { canIUse: () => boolean };

  mockCanIUseApi.canIUse = (): boolean => result;
};

describe(openDocument, () => {
  it("should open the downloaded document", async () => {
    const openCalls: string[] = [];
    const mockOpenDocumentApi = wx as unknown as {
      openDocument: (option: { filePath: string; showMenu: boolean }) => void;
    };

    mockOpenDocumentApi.openDocument = (option): void => {
      openCalls.push(option.filePath);
    };
    mockDownloadFile();

    openDocument("https://example.com/doc.pdf");
    await flush();

    expect(openCalls).toStrictEqual(["mock://temp/doc.pdf"]);
  });

  it("should show toast and report when download fails", async () => {
    const titles = mockShowToast();
    const events = mockReportEvent();
    mockDownloadFile(true);

    openDocument("https://example.com/broken.pdf");
    await flush();

    expect(titles).toStrictEqual(["下载文档失败"]);
    expect(events).toStrictEqual(["resource_load_failed"]);
  });
});

describe(saveDocument, () => {
  it("should add the document to favorites", async () => {
    const saved: { fileName: string; filePath: string }[] = [];
    const mockAddFileToFavoritesApi = wx as unknown as {
      addFileToFavorites: (option: {
        fileName: string;
        filePath: string;
        success?: () => void;
      }) => void;
    };

    mockAddFileToFavoritesApi.addFileToFavorites = (option): void => {
      saved.push({ fileName: option.fileName, filePath: option.filePath });
      option.success?.();
    };
    const modalTitles = mockShowModal();
    mockDownloadFile();

    saveDocument("https://example.com/doc.pdf");
    await flush();

    expect(saved).toStrictEqual([{ fileName: "doc.pdf", filePath: "mock://temp/doc.pdf" }]);
    expect(modalTitles).toStrictEqual(["文件已保存"]);
  });

  it("should show toast and report when download fails", async () => {
    const titles = mockShowToast();
    const events = mockReportEvent();
    mockDownloadFile(true);

    saveDocument("https://example.com/broken.pdf");
    await flush();

    expect(titles).toStrictEqual(["下载文档失败"]);
    expect(events).toStrictEqual(["resource_load_failed"]);
  });

  it("should do nothing when addFileToFavorites is unsupported", async () => {
    const saved: unknown[] = [];
    const mockAddFileToFavoritesApi = wx as unknown as {
      addFileToFavorites: (option: unknown) => void;
    };

    mockAddFileToFavoritesApi.addFileToFavorites = (option): void => {
      saved.push(option);
    };
    const titles = mockShowToast();
    mockCanIUse(false);

    saveDocument("https://example.com/doc.pdf");
    await flush();

    expect(saved).toStrictEqual([]);
    expect(titles).toStrictEqual([]);
  });

  it("should strip query and hash from the url before deriving the file name", async () => {
    const saved: { fileName: string; filePath: string }[] = [];
    const mockAddFileToFavoritesApi = wx as unknown as {
      addFileToFavorites: (option: { fileName: string; filePath: string }) => void;
    };

    mockAddFileToFavoritesApi.addFileToFavorites = (option): void => {
      saved.push({ fileName: option.fileName, filePath: option.filePath });
    };
    mockCanIUse(true);
    mockDownloadFile();

    saveDocument("https://example.com/files/doc.pdf?token=abc&x=1");
    await flush();

    expect(saved).toStrictEqual([{ fileName: "doc.pdf", filePath: "mock://temp/doc.pdf" }]);
  });

  it("should use the full name when the url has no extension", async () => {
    const saved: { fileName: string }[] = [];
    const mockAddFileToFavoritesApi = wx as unknown as {
      addFileToFavorites: (option: { fileName: string }) => void;
    };

    mockAddFileToFavoritesApi.addFileToFavorites = (option): void => {
      saved.push({ fileName: option.fileName });
    };
    mockCanIUse(true);
    mockDownloadFile();

    saveDocument("https://example.com/download");
    await flush();

    expect(saved).toStrictEqual([{ fileName: "download" }]);
  });

  it("should keep the user-provided filename", async () => {
    const saved: { fileName: string }[] = [];
    const mockAddFileToFavoritesApi = wx as unknown as {
      addFileToFavorites: (option: { fileName: string }) => void;
    };

    mockAddFileToFavoritesApi.addFileToFavorites = (option): void => {
      saved.push({ fileName: option.fileName });
    };
    mockCanIUse(true);
    mockDownloadFile();

    saveDocument("https://example.com/files/doc.pdf?token=abc", "custom");
    await flush();

    expect(saved).toStrictEqual([{ fileName: "custom.pdf" }]);
  });
});

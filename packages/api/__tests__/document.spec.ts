import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { openDocument, saveDocument } from "../src/index.js";

describe(openDocument, () => {
  it("should not throw", () => {
    expect(() => openDocument("https://example.com/doc.pdf")).not.toThrow();
  });

  it("should not throw when download fails", () => {
    const mockDownloadFile = wx as unknown as {
      downloadFile: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockDownloadFile.downloadFile = (option): void => {
      option.fail?.({ errMsg: "download fail" });
    };

    expect(() => openDocument("https://example.com/doc.pdf")).not.toThrow();
  });
});

describe(saveDocument, () => {
  it("should not throw", () => {
    expect(() => saveDocument("https://example.com/doc.pdf")).not.toThrow();
  });
});

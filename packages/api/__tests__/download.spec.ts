import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { download } from "../src/index.js";

describe(download, () => {
  it("should resolve a temp file path", async () => {
    const path = await download("https://example.com/file.png");

    expect(path).toBeDefined();
  });

  it("should reject when download fails", async () => {
    const mockDownloadFile = wx as unknown as {
      downloadFile: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockDownloadFile.downloadFile = (option): void => {
      option.fail?.({ errMsg: "download fail" });
    };

    await expect(download("https://example.com/file.png")).rejects.toThrow("download fail");
  });
});

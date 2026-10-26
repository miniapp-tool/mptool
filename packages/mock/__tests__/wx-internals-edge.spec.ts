import { afterEach, describe, expect, it } from "vitest";

import { mockWx, wx } from "../src/index.js";

describe("wx internals edge cases", () => {
  // oxlint-disable-next-line vitest/no-hooks -- reset the mock after every case
  afterEach(() => {
    mockWx.reset();
  });

  it("should expose every download task method", () => {
    const task = wx.downloadFile({
      success: () => {},
      url: "https://example.com/file",
    }) as unknown as {
      abort: () => void;
      offHeadersReceived: () => void;
      offProgressUpdate: () => void;
      onHeadersReceived: () => void;
      onProgressUpdate: () => void;
    };

    expect(() => {
      task.onProgressUpdate();
      task.offProgressUpdate();
      task.onHeadersReceived();
      task.offHeadersReceived();
      task.abort();
    }).not.toThrow();
  });

  it("should download a file with only a fail callback", async () => {
    void wx.downloadFile({ fail: () => {}, url: "https://example.com/file" });

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  it("should resolve downloadFile without an option object", async () => {
    await expect((wx.downloadFile as () => Promise<unknown>)()).resolves.toStrictEqual({
      statusCode: 0,
      tempFilePath: "",
    });
  });

  it("should report empty canIUse names as unavailable", () => {
    expect(wx.canIUse("")).toBe(false);
    expect(wx.canIUse(".request")).toBe(false);
  });
});

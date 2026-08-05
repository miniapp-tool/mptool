import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { savePhoto } from "../src/index.js";

describe(savePhoto, () => {
  it("should resolve when saved", async () => {
    await expect(savePhoto("https://example.com/img.png")).resolves.toBeUndefined();
  });

  it("should resolve when already authorized", async () => {
    const mockGetSetting = wx as unknown as {
      getSetting: (option: {
        success?: (result: { authSetting: Record<string, boolean> }) => void;
      }) => void;
    };

    mockGetSetting.getSetting = (option): void => {
      option.success?.({ authSetting: { "scope.writePhotosAlbum": true } });
    };

    await expect(savePhoto("https://example.com/img.png")).resolves.toBeUndefined();
  });
});

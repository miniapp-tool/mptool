import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { addContact } from "../src/index.js";

describe(addContact, () => {
  it("should resolve when authorized", async () => {
    await expect(addContact({ firstName: "test" })).resolves.toBeUndefined();
  });

  it("should resolve when already authorized", async () => {
    const mockGetSetting = wx as unknown as {
      getSetting: (option: {
        success?: (result: { authSetting: Record<string, boolean> }) => void;
      }) => void;
    };

    mockGetSetting.getSetting = (option): void => {
      option.success?.({ authSetting: { "scope.addPhoneContact": true } });
    };

    await expect(addContact({ firstName: "test" })).resolves.toBeUndefined();
  });
});

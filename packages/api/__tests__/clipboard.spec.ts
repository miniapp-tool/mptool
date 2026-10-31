import "@mptool/mock";
import { MpError } from "@mptool/shared";
import { describe, expect, it } from "vitest";

import { writeClipboard } from "../src/index.js";

describe(writeClipboard, () => {
  it("should resolve on success", async () => {
    await expect(writeClipboard("data")).resolves.toBeUndefined();
  });

  it("should reject with MpError on empty data", async () => {
    const error = await writeClipboard("").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(MpError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ message: "data is empty" });
  });

  it("should reject with MpError when called without data", async () => {
    await expect(writeClipboard()).rejects.toThrow(MpError);
    await expect(writeClipboard()).rejects.toThrow("data is empty");
  });

  it("should reject on fail", async () => {
    const mockSetClipboardData = wx as unknown as {
      setClipboardData: (option: { fail?: (result: { errMsg: string }) => void }) => void;
    };

    mockSetClipboardData.setClipboardData = (option): void => {
      option.fail?.({ errMsg: "clipboard fail" });
    };

    await expect(writeClipboard("data")).rejects.toThrow("clipboard fail");
  });
});

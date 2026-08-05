import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { writeClipboard } from "../src/index.js";

describe(writeClipboard, () => {
  it("should resolve on success", async () => {
    await expect(writeClipboard("data")).resolves.toBeUndefined();
  });

  it("should reject on empty data", async () => {
    await expect(writeClipboard("")).rejects.toThrow("data is empty");
  });
});

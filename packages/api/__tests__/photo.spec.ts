import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { savePhoto } from "../src/index.js";

describe(savePhoto, () => {
  it("should resolve when saved", async () => {
    await expect(savePhoto("https://example.com/img.png")).resolves.toBeUndefined();
  });
});

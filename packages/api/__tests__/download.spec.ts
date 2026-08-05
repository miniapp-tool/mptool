import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { download } from "../src/index.js";

describe(download, () => {
  it("should resolve a temp file path", async () => {
    const path = await download("https://example.com/file.png");

    expect(path).toBeDefined();
  });
});

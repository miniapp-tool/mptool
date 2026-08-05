import "@mptool/mock";
import { describe, expect, it } from "vitest";

import { openDocument, saveDocument } from "../src/index.js";

describe(openDocument, () => {
  it("should not throw", () => {
    expect(() => openDocument("https://example.com/doc.pdf")).not.toThrow();
  });
});

describe(saveDocument, () => {
  it("should not throw", () => {
    expect(() => saveDocument("https://example.com/doc.pdf")).not.toThrow();
  });
});

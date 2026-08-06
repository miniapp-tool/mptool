import { describe, expect, it } from "vitest";

import { convertSVGToDataURI } from "../src/index.js";

describe(convertSVGToDataURI, () => {
  it("should convert svg to data uri", () => {
    expect(convertSVGToDataURI('<svg width="100"></svg>')).toBe(
      "data:image/svg+xml,%3Csvg width='100'%3E%3C/svg%3E",
    );
  });

  it("should encode hash", () => {
    expect(convertSVGToDataURI("#fff")).toBe("data:image/svg+xml,%23fff");
  });

  it("should encode percent signs", () => {
    expect(convertSVGToDataURI('<svg width="100%"></svg>')).toBe(
      "data:image/svg+xml,%3Csvg width='100%25'%3E%3C/svg%3E",
    );
  });
});

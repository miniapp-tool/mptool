import { describe, expect, it } from "vitest";

import { convertSVGToDataURI } from "../src/index.js";

describe(convertSVGToDataURI, () => {
  it("should convert svg to data uri without encoding safe characters", () => {
    expect(convertSVGToDataURI('<svg width="100"></svg>')).toBe(
      "data:image/svg+xml,%3Csvg%20width=%22100%22%3E%3C/svg%3E",
    );
  });

  it("should encode URI-significant characters", () => {
    expect(convertSVGToDataURI("#fff")).toBe("data:image/svg+xml,%23fff");
    expect(convertSVGToDataURI('<svg width="100%"></svg>')).toBe(
      "data:image/svg+xml,%3Csvg%20width=%22100%25%22%3E%3C/svg%3E",
    );
    expect(convertSVGToDataURI("<text>a & b</text>")).toBe(
      "data:image/svg+xml,%3Ctext%3Ea%20%26%20b%3C/text%3E",
    );
    expect(convertSVGToDataURI('<svg viewBox="0 0 1 1"></svg>')).toBe(
      "data:image/svg+xml,%3Csvg%20viewBox=%220%200%201%201%22%3E%3C/svg%3E",
    );
  });

  it("should encode whitespace and non-ascii characters", () => {
    expect(convertSVGToDataURI("<svg>\n  <text>中文</text>\n</svg>")).toBe(
      "data:image/svg+xml,%3Csvg%3E%0A%20%20%3Ctext%3E%E4%B8%AD%E6%96%87%3C/text%3E%0A%3C/svg%3E",
    );
  });
});

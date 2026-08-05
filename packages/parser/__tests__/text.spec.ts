import { describe, expect, it } from "vitest";

import { getText } from "../src/index.js";

describe(getText, () => {
  it("should extract text from html", () => {
    expect(getText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("should handle nested tags", () => {
    expect(getText("<div><span>a</span><span>b</span></div>")).toBe("ab");
  });

  it("should return empty string for empty content", () => {
    expect(getText("")).toBe("");
  });

  it("should return empty string for content without text", () => {
    expect(getText("<div></div>")).toBe("");
  });
});

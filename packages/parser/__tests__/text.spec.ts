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

  it("should ignore comments", () => {
    expect(getText("<!-- comment -->hello")).toBe("hello");
    expect(getText("<!-- only comment -->")).toBe("");
  });

  it("should insert a line break between block elements", () => {
    expect(getText("<p>a</p><p>b</p>")).toBe("a\nb");
    expect(getText("<div><p>a</p><p>b</p></div>")).toBe("a\nb");
    expect(getText("<ul><li>a</li><li>b</li></ul>")).toBe("a\nb");
  });

  it("should insert a line break for br", () => {
    expect(getText("<p>a<br>b</p>")).toBe("a\nb");
  });

  it("should collapse consecutive whitespace and trim", () => {
    expect(getText("<p>  a   b  </p>")).toBe("a b");
    expect(getText("<p>a</p>  <p>b</p>")).toBe("a\nb");
  });
});

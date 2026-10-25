import { parseDocument } from "htmlparser2";
import { describe, expect, it } from "vitest";

import { getText, parseHTML } from "../src/index.js";

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

  it("should ignore script content", () => {
    expect(getText("<script>alert(1)</script>")).toBe("");
  });

  it("should ignore invisible element content", () => {
    expect(getText("<style>.a{color:red}</style><p>正文</p>")).toBe("正文");
    expect(getText("<title>T</title><noscript>NS</noscript><p>正文</p>")).toBe("正文");
    expect(getText("<template><p>tpl</p></template><p>正文</p>")).toBe("正文");
  });

  it("should ignore invisible content in pre-parsed nodes", () => {
    // parseHTML keeps <style> (only <script> is removed), getText must filter it itself
    // parseHTML 会保留 <style>（只删 <script>），getText 必须自行过滤
    expect(getText(parseHTML("<p>a</p><style>.x{}</style>"))).toBe("a");
    // raw DOM nodes (e.g. from htmlparser2) still contain scripts
    // 原始 DOM 节点（例如 htmlparser2 产出）仍含 script
    expect(getText(parseDocument("<p>a</p><script>evil()</script>").children)).toBe("a");
  });

  it("should keep text inside unknown container tags", () => {
    expect(getText("<figure><figcaption>图 1</figcaption></figure>")).toBe("图 1");
    expect(getText("<main><p>正文</p></main>")).toBe("正文");
  });
});

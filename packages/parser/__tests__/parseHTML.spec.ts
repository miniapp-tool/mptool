import { describe, expect, it } from "vitest";

import { getHTML, parseHTML } from "../src/index.js";

describe(parseHTML, () => {
  it("should parse html string to nodes", () => {
    const cases = [
      // snippet
      '<div class="test">hello</div>',
      '<div class="test"><span>hello</span></div>',
      '<div class="test"><span>hello</span><span>world</span></div>',
      "<table><tr><td>hello</td></tr></table>",
      "<table><tr><td>hello</td><td>world</td></tr></table>",

      // full document
      "<!doctype html><html><head><title>hello</title></head><body>world</body></html>",

      // svg
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='red'/></svg>",
    ];

    cases.forEach((content) => {
      expect(parseHTML(content)).toMatchSnapshot();
    });
  });

  it("should remove script elements", () => {
    const nodes = parseHTML("<script>alert(1)</script><p>ok</p>");

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ type: "tag", name: "p" });
  });

  it("should relink the siblings of a removed script in the middle", () => {
    const nodes = parseHTML("<p>a</p><script>evil()</script><p>b</p>");

    expect(nodes).toHaveLength(2);
    expect(nodes[0].next).toBe(nodes[1]);
    expect(nodes[1].prev).toBe(nodes[0]);
  });

  it("should remove a trailing script", () => {
    const nodes = parseHTML("<p>ok</p><script>evil()</script>");

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ type: "tag", name: "p" });
    expect(nodes[0].next).toBeNull();
  });
});

describe(getHTML, () => {
  it("should render a parsed html string", () => {
    expect(getHTML('<p class="test">hello</p>')).toBe('<p class="test">hello</p>');
    expect(getHTML("<div><span>a</span><span>b</span></div>")).toBe(
      "<div><span>a</span><span>b</span></div>",
    );
  });

  it("should render pre-parsed nodes", () => {
    const nodes = parseHTML("<p>hello</p>");

    expect(getHTML(nodes)).toBe("<p>hello</p>");
  });
});

import { expect, it } from "vitest";

import { parseHTML } from "../src/index.js";

it("parseHTML()", () => {
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

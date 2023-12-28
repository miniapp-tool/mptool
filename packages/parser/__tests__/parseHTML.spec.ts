import { expect, it } from "vitest";

import { parseHTML } from "../src/index.js";

it("parseHTML()", () => {
  const cases = [
    '<div class="test">hello</div>',
    '<div class="test"><span>hello</span></div>',
    '<div class="test"><span>hello</span><span>world</span></div>',
    "<table><tr><td>hello</td></tr></table>",
    "<table><tr><td>hello</td><td>world</td></tr></table>",

    "<!doctype html><html><head><title>hello</title></head><body>world</body></html>",
  ];

  cases.forEach((content) => {
    expect(parseHTML(content)).toMatchSnapshot();
  });
});

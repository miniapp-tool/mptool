import { describe, expect, it } from "vitest";

import { getRichTextNodes, getText, parseHTML } from "../src/index.js";

describe("input immutability", () => {
  it("should not mutate pre-parsed SVG nodes", async () => {
    const nodes = parseHTML(
      "<svg viewbox='0 0 10 20' preserveaspectratio='xMidYMid'><lineargradient gradientunits='userSpaceOnUse'></lineargradient></svg>",
    );
    const svg = nodes[0] as unknown as {
      attribs: Record<string, string>;
      children: { attribs: Record<string, string> }[];
    };
    const before = JSON.stringify(svg.attribs);
    const childBefore = JSON.stringify(svg.children[0].attribs);

    await getRichTextNodes(nodes);

    expect(JSON.stringify(svg.attribs)).toBe(before);
    expect(JSON.stringify(svg.children[0].attribs)).toBe(childBefore);
    expect(svg.attribs.viewBox).toBeUndefined();
    expect(svg.attribs.viewbox).toBe("0 0 10 20");
    expect(svg.children[0].attribs.gradientunits).toBe("userSpaceOnUse");
  });

  it("should produce the same result on repeated conversions", async () => {
    const nodes = parseHTML("<svg viewbox='0 0 10 20'><circle r='1'></circle></svg>");

    await expect(getRichTextNodes(nodes)).resolves.toStrictEqual(await getRichTextNodes(nodes));
  });

  it("should not mutate pre-parsed text nodes", () => {
    const nodes = parseHTML("<p>a</p><style>.x{}</style>");

    expect(getText(nodes)).toBe("a");
    expect(getText(nodes)).toBe("a");
  });
});

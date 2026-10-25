import { parseDocument } from "htmlparser2";
import { describe, expect, it } from "vitest";

import type { RichTextNode } from "../src/index.js";
import { getRichTextNodes } from "../src/index.js";

describe(getRichTextNodes, () => {
  it("normalizes CRLF and CR in text nodes to LF", async () => {
    await expect(getRichTextNodes("<p>a\rb\r\nc</p>")).resolves.toStrictEqual([
      {
        attrs: { class: "p" },
        children: [{ text: "a\nb\nc", type: "text" }],
        name: "p",
        type: "node",
      },
    ]);
  });

  it("should keep whitespace inside inline elements", async () => {
    await expect(getRichTextNodes("<p>a<b> </b>c</p>")).resolves.toStrictEqual([
      {
        attrs: { class: "p" },
        children: [
          { text: "a", type: "text" },
          {
            attrs: { class: "b" },
            children: [{ text: " ", type: "text" }],
            name: "b",
            type: "node",
          },
          { text: "c", type: "text" },
        ],
        name: "p",
        type: "node",
      },
    ]);
  });

  it("should trim whitespace around block containers", async () => {
    await expect(getRichTextNodes("<div> <p>a</p> </div>")).resolves.toStrictEqual([
      {
        attrs: { class: "div" },
        children: [
          {
            attrs: { class: "p" },
            children: [{ text: "a", type: "text" }],
            name: "p",
            type: "node",
          },
        ],
        name: "div",
        type: "node",
      },
    ]);
  });

  it("parses simple text nodes", async () => {
    const cases: [content: string, nodes: RichTextNode[]][] = [
      [
        '<div class="test">hello</div>',
        [
          {
            attrs: {
              class: "div test",
            },
            children: [
              {
                text: "hello",
                type: "text",
              },
            ],
            name: "div",
            type: "node",
          },
        ],
      ],
      [
        '<div class="test"><span>hello</span></div>',
        [
          {
            attrs: {
              class: "div test",
            },
            children: [
              {
                attrs: {
                  class: "span",
                },
                children: [
                  {
                    text: "hello",
                    type: "text",
                  },
                ],
                name: "span",
                type: "node",
              },
            ],
            name: "div",
            type: "node",
          },
        ],
      ],
      [
        '<div class="test"><span>hello</span><span>world</span></div>',
        [
          {
            attrs: {
              class: "div test",
            },
            children: [
              {
                attrs: {
                  class: "span",
                },
                children: [
                  {
                    text: "hello",
                    type: "text",
                  },
                ],
                name: "span",
                type: "node",
              },
              {
                attrs: {
                  class: "span",
                },
                children: [
                  {
                    text: "world",
                    type: "text",
                  },
                ],
                name: "span",
                type: "node",
              },
            ],
            name: "div",
            type: "node",
          },
        ],
      ],
      [
        "<table><tr><td>hello</td></tr></table>",
        [
          {
            attrs: {
              class: "table",
            },
            children: [
              {
                attrs: {
                  class: "tr",
                },
                children: [
                  {
                    children: [
                      {
                        text: "hello",
                        type: "text",
                      },
                    ],
                    attrs: {
                      class: "td",
                    },
                    name: "td",
                    type: "node",
                  },
                ],
                name: "tr",
                type: "node",
              },
            ],
            name: "table",
            type: "node",
          },
        ],
      ],
      [
        "<table><tr><td>hello</td><td>world</td></tr></table>",
        [
          {
            attrs: {
              class: "table",
            },
            children: [
              {
                attrs: {
                  class: "tr",
                },
                children: [
                  {
                    attrs: {
                      class: "td",
                    },
                    children: [
                      {
                        text: "hello",
                        type: "text",
                      },
                    ],
                    name: "td",
                    type: "node",
                  },
                  {
                    attrs: {
                      class: "td",
                    },
                    children: [
                      {
                        text: "world",
                        type: "text",
                      },
                    ],
                    name: "td",
                    type: "node",
                  },
                ],
                name: "tr",
                type: "node",
              },
            ],
            name: "table",
            type: "node",
          },
        ],
      ],
      [
        "<!doctype html><html><head><title>hello</title></head><body>world</body></html>",
        [
          {
            attrs: {
              class: "html",
            },
            children: [
              {
                attrs: {
                  class: "body",
                },
                children: [
                  {
                    text: "world",
                    type: "text",
                  },
                ],
                name: "div",
                type: "node",
              },
            ],
            name: "div",
            type: "node",
          },
        ],
      ],
      [
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='red'/></svg>",
        [
          {
            attrs: {
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='red'/%3E%3C/svg%3E",
              style: "width:100px;height:100px;",
            },
            name: "img",
            type: "node",
          },
        ],
      ],
    ];

    await Promise.all(
      cases.map(async ([content, nodes]) => {
        await expect(getRichTextNodes(content)).resolves.toStrictEqual(nodes);
      }),
    );
  });

  it("with transform", async () => {
    await expect(
      getRichTextNodes('<p class="test">hello<img src="test.jpg"></p>', {
        transform: {
          img: (node) => {
            // oxlint-disable-next-line vitest/no-conditional-in-test
            if (node.attrs?.src && !node.attrs.src.startsWith("http")) {
              return {
                ...node,
                attrs: {
                  ...node.attrs,
                  src: `https://example.com/${node.attrs.src}`,
                },
              };
            }

            return node;
          },
        },
      }),
    ).resolves.toStrictEqual([
      {
        attrs: {
          class: "p test",
        },
        children: [
          {
            text: "hello",
            type: "text",
          },
          {
            attrs: {
              class: "img",
              src: "https://example.com/test.jpg",
            },
            name: "img",
            type: "node",
          },
        ],
        name: "p",
        type: "node",
      },
    ]);
  });

  it("converts svg to image node", async () => {
    const nodes = await getRichTextNodes('<svg viewbox="0 0 100 50"></svg>');

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "img",
        attrs: {
          src: expect.stringContaining("viewBox='0 0 100 50'"),
          style: "width:100px;height:50px;",
        },
      },
    ]);
  });

  it("restores camel case attributes in svg and its children", async () => {
    const nodes = await getRichTextNodes(
      '<svg viewBox="0 0 100 50" preserveAspectRatio="xMidYMid"><linearGradient gradientUnits="userSpaceOnUse"></linearGradient></svg>',
    );
    const [node] = nodes;

    expect(node).toMatchObject({
      type: "node",
      name: "img",
      attrs: {
        style: "width:100px;height:50px;",
      },
    });

    const {
      attrs: { src },
    } = node as unknown as { attrs: { src: string } };

    expect(src).toContain("viewBox='");
    expect(src).toContain("preserveAspectRatio='");
    expect(src).toContain("gradientUnits='");
  });

  it("parses comma separated viewBox", async () => {
    const nodes = await getRichTextNodes('<svg viewBox="0,0,100,50"></svg>');

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "img",
        attrs: {
          src: expect.stringContaining("data:image/svg+xml,"),
          style: "width:100px;height:50px;",
        },
      },
    ]);
  });

  it("keeps class when appendClass is false", async () => {
    const nodes = await getRichTextNodes('<div class="test">hello</div>', {
      appendClass: false,
    });

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "div",
        attrs: { class: "test" },
        children: [{ type: "text", text: "hello" }],
      },
    ]);
  });

  it("filters disallowed tags", async () => {
    const nodes = await getRichTextNodes("<div><script>alert(1)</script><p>hi</p></div>");

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "div",
        attrs: { class: "div" },
        children: [
          {
            type: "node",
            name: "p",
            attrs: { class: "p" },
            children: [{ type: "text", text: "hi" }],
          },
        ],
      },
    ]);
  });

  it("omits attrs when appendClass is false and there are none", async () => {
    const nodes = await getRichTextNodes("<span>hello</span>", {
      appendClass: false,
    });

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "span",
        children: [{ type: "text", text: "hello" }],
      },
    ]);
  });

  it("appends a full link to anchor text", async () => {
    const nodes = await getRichTextNodes('<a href="https://example.com">link</a>', {
      appendClass: false,
    });

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "a",
        children: [
          { type: "text", text: "link" },
          { type: "text", text: " (https://example.com)" },
        ],
      },
    ]);
  });

  it("does not append non-full links to anchor text", async () => {
    const relative = await getRichTextNodes('<a href="/relative">link</a>', {
      appendClass: false,
    });

    expect(relative).toStrictEqual([
      {
        type: "node",
        name: "a",
        children: [{ type: "text", text: "link" }],
      },
    ]);

    const noHref = await getRichTextNodes("<a>link</a>", { appendClass: false });

    expect(noHref).toStrictEqual([
      {
        type: "node",
        name: "a",
        children: [{ type: "text", text: "link" }],
      },
    ]);
  });

  it("converts svg with numeric width and height", async () => {
    const nodes = await getRichTextNodes('<svg width="100" height="50"></svg>');

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "img",
        attrs: {
          src: expect.stringContaining("data:image/svg+xml,"),
          style: "width:100px;height:50px;",
        },
      },
    ]);
  });

  it("keeps existing units in svg width and height", async () => {
    const nodes = await getRichTextNodes('<svg width="100%" height="50%"></svg>');

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "img",
        attrs: {
          src: expect.stringContaining("width='100%25'"),
          style: "width:100%;height:50%;",
        },
      },
    ]);
  });

  it("omits style for non-numeric viewBox", async () => {
    const nodes = await getRichTextNodes('<svg viewbox="0 0 abc def"></svg>');

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "img",
        attrs: { src: expect.stringContaining("data:image/svg+xml,") },
      },
    ]);
  });

  it("accepts pre-parsed nodes", async () => {
    const nodes = await getRichTextNodes([{ type: "text", data: "hello" }] as never);

    expect(nodes).toStrictEqual([{ type: "text", text: "hello" }]);
  });

  it("removes leading and trailing empty text nodes", async () => {
    const nodes = await getRichTextNodes("<div>  <p>hi</p>  </div>");

    expect(nodes).toStrictEqual([
      {
        type: "node",
        name: "div",
        attrs: { class: "div" },
        children: [
          {
            type: "node",
            name: "p",
            attrs: { class: "p" },
            children: [{ type: "text", text: "hi" }],
          },
        ],
      },
    ]);
  });
});

describe("unknown and invisible elements", () => {
  it("should unwrap unknown container tags", async () => {
    await expect(
      getRichTextNodes("<figure><figcaption>图 1</figcaption></figure>"),
    ).resolves.toStrictEqual([{ type: "text", text: "图 1" }]);
    await expect(getRichTextNodes("<main><p>正文</p></main>")).resolves.toStrictEqual([
      {
        attrs: { class: "p" },
        children: [{ text: "正文", type: "text" }],
        name: "p",
        type: "node",
      },
    ]);
  });

  it("should drop invisible elements and their content", async () => {
    const invisible = [
      "<script>evil()</script>",
      "<style>.a{}</style>",
      "<template><p>tpl</p></template>",
      "<noscript>ns</noscript>",
      "<title>title</title>",
    ];

    const results = await Promise.all(
      invisible.map((html) => getRichTextNodes(`${html}<p>ok</p>`)),
    );
    const expected = {
      attrs: { class: "p" },
      children: [{ text: "ok", type: "text" }],
      name: "p",
      type: "node",
    };

    results.forEach((result) => expect(result).toStrictEqual([expected]));
  });

  it("should keep text of inline unknown wrappers", async () => {
    const [paragraph] = await getRichTextNodes("<p>a<unknown> b </unknown>c</p>");

    expect(paragraph).toMatchObject({
      children: [
        { type: "text", text: "a" },
        { type: "text", text: " b " },
        { type: "text", text: "c" },
      ],
      name: "p",
    });
  });

  it("should drop invisible elements from pre-parsed nodes", async () => {
    const nodes = parseDocument("<p>ok</p><script>evil()</script>").children;

    await expect(getRichTextNodes(nodes)).resolves.toStrictEqual([
      {
        attrs: { class: "p" },
        children: [{ text: "ok", type: "text" }],
        name: "p",
        type: "node",
      },
    ]);
  });
});

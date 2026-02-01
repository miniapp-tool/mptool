import { expect, it } from "vitest";

import type { RichTextNode } from "../src/index.js";
import { getRichTextNodes } from "../src/index.js";

it("getRichTextNodes()", async () => {
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
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewbox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='red'/%3E%3C/svg%3E",
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
      expect(await getRichTextNodes(content)).toEqual(nodes);
    }),
  );
});

it("getRichTextNodes() with transform", async () => {
  expect(
    await getRichTextNodes('<p class="test">hello<img src="test.jpg"></p>', {
      transform: {
        img: (node) => {
          if (node.attrs?.src && !node.attrs.src.startsWith("http"))
            return {
              ...node,
              attrs: {
                ...node.attrs,
                src: `https://example.com/${node.attrs.src}`,
              },
            };

          return node;
        },
      },
    }),
  ).toEqual([
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

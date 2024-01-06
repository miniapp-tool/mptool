import { expect, it } from "vitest";

import { type RichTextNode, getRichTextNodes } from "../src/index.js";

it("getRichTextNodes()", async () => {
  const cases: [content: string, nodes: RichTextNode[]][] = [
    [
      '<div class="test">hello</div>',
      [
        {
          attrs: {
            class: "test div",
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
            class: "test div",
          },
          children: [
            {
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
            class: "test div",
          },
          children: [
            {
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
          children: [
            {
              children: [
                {
                  children: [
                    {
                      text: "hello",
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
      "<table><tr><td>hello</td><td>world</td></tr></table>",
      [
        {
          children: [
            {
              children: [
                {
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
      [],
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
        class: "test p",
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

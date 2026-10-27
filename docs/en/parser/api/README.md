---
title: "@mptool/parser"
icon: folder
index: false
---

## parseHTML

```ts
export const parseHTML: (content: string) => AnyNode[];
```

## getRichTextNodes

```ts
export interface ElementNode {
  type: "node";
  name: string;
  attrs?: Record<string, string>;
  children?: RichTextNode[];
}

export interface TextNode {
  type: "text";
  text: string;
}

export type RichTextNode = ElementNode | TextNode;

export type NodeHandler = (node: ElementNode) => ElementNode | null | Promise<ElementNode | null>;

export interface ParserOptions {
  /**
   * Whether to append the tag name to the class
   *
   * @default true
   */
  appendClass?: boolean;
  /**
   * Tag handler
   */
  transform?: Partial<Record<AllowTag, NodeHandler>>;
}

export const getRichTextNodes: (
  content: string | AnyNode[],
  { appendClass, transform }?: ParserOptions,
) => Promise<RichTextNode[]>;
```

## getText

```ts
export const getText: (content: string | AnyNode[]) => string;
```

Extracts the text content of an HTML snippet.

## getHTML

```ts
export const getHTML: (content: string | AnyNode | AnyNode[]) => string;
```

Converts a node or an array of nodes to an HTML string.

## convertSVGToDataURI

```ts
export const convertSVGToDataURI: (content: string) => string;
```

Converts SVG content to a Data URI.

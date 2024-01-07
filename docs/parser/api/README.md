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

export type NodeHandler = (
  node: ElementNode,
) => ElementNode | null | Promise<ElementNode | null>;

export interface ParserOptions {
  /**
   * 是否附加标签名到 class
   *
   * @default true
   */
  appendClass?: boolean;
  /**
   * 处理 Tag
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

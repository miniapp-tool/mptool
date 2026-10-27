---
title: "@mptool/parser"
icon: network-wired
---

HTML parser for mini-programs, only 3.5 kB.

<!-- more -->

## getText

Gets the text content of an HTML snippet. The contents of non-visible elements such as `script` / `style` / `noscript` / `template` are excluded from the result (this applies to both string input and pre-parsed node input).

```js
import { getText } from "@mptool/parser";

const html = "<div>hello <span>world</span></div>";

console.log(getText(html)); // hello world
```

## getRichTextNodes

Parses an HTML snippet and returns an array of nodes asynchronously; the second argument contains behavior options

- Any tag or attribute not supported by mini-program `<rich-text>` is removed; unsupported **container** tags are "unwrapped", and their text and child nodes are preserved.
- Non-visible elements such as `script` / `style` / `template` / `noscript` / `title` / `head` are dropped entirely.
- By default, every node gets a class name equal to the **output** tag name (`html`/`body` are converted to `div` and also get the class name `div`); disable this with `appendClass: false`
- You can transform nodes with the `transform` behavior option; the return value replaces the original node

  The transform method receives an object whose keys are node tag names and whose values are functions that read the current node object and return a new object or `null`.

## getHTML

Converts a node or an array of nodes to an HTML string.

```js
import { parseHTML, getHTML } from "@mptool/parser";

const nodes = parseHTML("<div>hello</div>");
const html = getHTML(nodes); // <div>hello</div>
```

## convertSVGToDataURI

Converts SVG content to a Data URI, which can be used to display SVG images in `<rich-text>`.

```js
import { convertSVGToDataURI } from "@mptool/parser";

const dataUri = convertSVGToDataURI('<svg viewBox="0 0 100 100"></svg>');
// data:image/svg+xml,%3Csvg%20viewBox=%220%200%20100%20100%22%3E%3C/svg%3E
```

## Input trust and resource limits

- **Input is not modified**: when `getRichTextNodes` / `getText` receive pre-parsed nodes, they do not modify the caller's DOM (SVG conversion is done on a clone), so they can be called repeatedly safely.
- **Input must be trusted**: this package is **not a sanitizer** — `class` / `style` on allowed tags pass through as-is, `style` content is not filtered, and `img.src` protocols are not validated; sanitize the input yourself first.
- **Resource limits** (unlimited by default; enable as needed): `maxInputLength` (UTF-16 code units) and `maxDepth` (node nesting depth) throw a `RangeError` when exceeded; deeply nested parsing and text extraction use an explicit stack / async yielding to avoid host stack overflow.
- **Transformation is asynchronous**: each node produces a Promise, and `transform` is called after its children have been processed (post-order).

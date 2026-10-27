---
title: "@mptool/encoder"
icon: code
---

`TextEncoder` / `TextDecoder` implementations for mini-program environments that lack GBK / GB18030 support, plus the standard UTF-8 implementation.

## Installation

```bash
npm i @mptool/encoder
# Equivalent: pnpm add @mptool/encoder
```

Importing the package does not modify globals; import the classes from the package and use them as needed (mount them globally yourself if you need a polyfill).

## Supported encodings

| Encoding | Available labels (case-insensitive)                                            |
| -------- | ------------------------------------------------------------------------------ |
| UTF-8    | `utf-8`, `utf8`, `unicode-1-1-utf-8`                                           |
| GBK      | `gbk`, `gb2312`, `gb_2312`, `gb_2312-80`, `csgb2312`, `chinese`, `x-gbk`, etc. |
| GB18030  | `gb18030`                                                                      |

The label list matches the WHATWG Encoding standard. GB2312 is served through the GBK labels; there is no separate GB2312 encoding.

## TextDecoder

```ts
import { TextDecoder } from "@mptool/encoder";

const decoder = new TextDecoder("gbk");

decoder.encoding; // "gbk"
decoder.decode(new Uint8Array([0xd6, 0xd0, 0xce, 0xc4])); // "中文"
```

Constructor options:

- `fatal`: when `true`, invalid bytes throw a `TypeError`; otherwise the replacement character `�` is emitted
- `ignoreBOM`: when `true`, the BOM is kept

## TextEncoder

`TextEncoder` encodes as UTF-8 by default; as a **non-standard extension** (WHATWG's `TextEncoder` only supports UTF-8), it also accepts other encoding labels:

```ts
import { TextEncoder } from "@mptool/encoder";

new TextEncoder().encode("中文"); // UTF-8
new TextEncoder("gbk").encode("中文"); // Uint8Array [0xd6, 0xd0, 0xce, 0xc4]
new TextEncoder("gb18030").encode("中文");
```

- An unknown label throws a `RangeError`
- `new TextEncoder(label)` is not a function call: `new` is required
- The `encoding` property returns the current encoding (`"utf-8"`, `"gbk"` or `"gb18030"`)

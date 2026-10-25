---
title: "@mptool/encoder"
icon: code
---

小程序环境缺少 GBK / GB18030 支持时的 `TextEncoder` / `TextDecoder` 实现，同时提供 UTF-8 的标准实现。

## 安装

```bash
npm i @mptool/encoder
# 等价写法：pnpm add @mptool/encoder
```

引入包不会修改全局对象，请从包中导入类并按需使用（需要全局 polyfill 时自行挂载）。

## 支持的编码

| 编码    | 可用标签（不区分大小写）                                                    |
| ------- | --------------------------------------------------------------------------- |
| UTF-8   | `utf-8`、`utf8`、`unicode-1-1-utf-8`                                        |
| GBK     | `gbk`、`gb2312`、`gb_2312`、`gb_2312-80`、`csgb2312`、`chinese`、`x-gbk` 等 |
| GB18030 | `gb18030`                                                                   |

标签列表与 WHATWG Encoding 标准一致，GB2312 通过 GBK 的标签提供，没有独立的 GB2312 编码。

## TextDecoder

```ts
import { TextDecoder } from "@mptool/encoder";

const decoder = new TextDecoder("gbk");

decoder.encoding; // "gbk"
decoder.decode(new Uint8Array([0xd6, 0xd0, 0xce, 0xc4])); // "中文"
```

构造选项：

- `fatal`: 为 `true` 时遇到非法字节抛 `TypeError`，否则输出替换字符 `�`
- `ignoreBOM`: 为 `true` 时保留 BOM

## TextEncoder

`TextEncoder` 默认编码 UTF-8；作为**非标准扩展**（WHATWG 的 `TextEncoder` 只支持 UTF-8），它也接受其他编码标签：

```ts
import { TextEncoder } from "@mptool/encoder";

new TextEncoder().encode("中文"); // UTF-8
new TextEncoder("gbk").encode("中文"); // Uint8Array [0xd6, 0xd0, 0xce, 0xc4]
new TextEncoder("gb18030").encode("中文");
```

- 未知标签会抛 `RangeError`
- `new TextEncoder(label)` 不是函数调用：必须使用 `new`
- `encoding` 属性返回当前编码（`"utf-8"`、`"gbk"` 或 `"gb18030"`）

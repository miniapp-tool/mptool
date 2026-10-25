---
title: "@mptool/parser"
icon: network-wired
---

小程序 HTML 解析器，大小仅 3.5kb。

<!-- more -->

## getText

获取一段 HTML 中的文本内容。`script` / `style` / `noscript` / `template` 等不可见元素的内容不会进入结果（字符串与预解析节点输入均生效）。

```js
import { getText } from "@mptool/parser";

const html = "<div>hello <span>world</span></div>";

console.log(getText(html)); // hello world
```

## getRichTextNodes

解析一段 HTML，异步返回节点数组数组，第二个参数是行为选项

- 任何小程序 `<rich-text>` 不支持的标签和属性都会被移除；不支持的**容器**标签会被"解包"，其中的文本与子节点仍会保留。
- `script` / `style` / `template` / `noscript` / `title` / `head` 等不可见元素会整棵丢弃。
- 所有节点会默认附加和**输出**标签名相同的类名（`html`/`body` 转换为 `div` 时类名同样为 `div`），可以通过 `appendClass: false` 取消
- 你可以通过行为选项中的 `transform` 方法对节点进行转换，返回值会被用于替换原节点

  transform 方法接收一个对象，键名为节点标签，值是一个读取当前节点对象并返回新对象或 `null` 的函数。

## getHTML

将节点或节点数组转换为 HTML 字符串。

```js
import { parseHTML, getHTML } from "@mptool/parser";

const nodes = parseHTML("<div>hello</div>");
const html = getHTML(nodes); // <div>hello</div>
```

## convertSVGToDataURI

将 SVG 内容转换为 Data URI 格式，用于在 `<rich-text>` 中显示 SVG 图片。

```js
import { convertSVGToDataURI } from "@mptool/parser";

const dataUri = convertSVGToDataURI('<svg viewBox="0 0 100 100"></svg>');
// data:image/svg+xml,%3Csvg%20viewBox=%220%200%20100%20100%22%3E%3C/svg%3E
```

## 输入信任与资源限制

- **不修改入参**：`getRichTextNodes` / `getText` 接收预解析节点时不会改写调用方 DOM（SVG 转换在克隆上完成），可安全重复调用。
- **输入需可信**：本包**不是净化器**——白名单标签的 `class` / `style` 会原样透传，`style` 内容不做过滤，`img.src` 也不校验协议；请先自行消毒。
- **资源限制**（默认不限制，按需开启）：`maxInputLength`（UTF-16 code unit）、`maxDepth`（节点嵌套深度），超限抛出 `RangeError`；深嵌套解析与文本提取使用显式栈/异步让出，避免宿主栈溢出。
- **转换是异步的**：每个节点会产生 Promise，`transform` 在子节点处理完成后（后序）调用。

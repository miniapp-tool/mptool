---
title: "@mptool/parser"
icon: network-wired
---

小程序 HTML 解析器，大小仅 3.5kb。

<!-- more -->

## getText

获取一段 HTML 中的文本内容。

```js
import { getText } from "@mptool/parser";

const html = "<div>hello <span>world</span></div>";

console.log(getText(html)); // hello world
```

## getRichTextNodes

解析一段 HTML，异步返回节点数组数组，第二个参数是行为选项

- 任何小程序 `<rich-text>` 不支持的标签和属性都会被移除。
- 所有节点会默认附加和标签名相同的类名，可以通过 `appendClass: false` 取消
- 你可以通过行为选项中的 `transform` 方法对节点进行转换，返回值会被用于替换原节点.

  transform 方法接收一个对象，键名为节点标签，值是一个读取当前节点对象并返回新对象或 `null` 的函数。

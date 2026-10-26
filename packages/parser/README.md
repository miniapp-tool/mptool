# @mptool/parser

微信小程序富文本解析器：把 HTML 转为 `<rich-text>` 节点，并提供纯文本、SVG 转换与 HTML 解析辅助。

> 完整 API、支持标签清单与行为说明见仓库 [`docs/parser/README.md`](../../docs/parser/README.md)。

## 快速开始

```ts
import { getRichTextNodes, getText, parseHTML, getHTML, convertSVGToDataURI } from "@mptool/parser";

const nodes = await getRichTextNodes("<p>Hello <b>world</b></p>");
const text = getText("<style>.a{}</style><p>Hello</p>"); // "Hello"

const dom = parseHTML("<div>...</div>");
const html = getHTML(dom);

const uri = convertSVGToDataURI('<svg viewBox="0 0 10 10"></svg>'); // data:image/svg+xml,...
```

## 选项

| 选项             | 默认值 | 说明                                                      |
| ---------------- | ------ | --------------------------------------------------------- |
| `appendClass`    | `true` | 自动附加与输出标签名相同的 class（`html`/`body` → `div`） |
| `transform`      | `{}`   | 按标签转换回调（子节点处理完后调用，可返回 Promise）      |
| `maxInputLength` | 不限制 | 输入字符串长度上限，超出抛 `RangeError`                   |
| `maxDepth`       | 不限制 | 节点嵌套深度上限，超出抛 `RangeError`                     |

## 行为与限制

- 白名单外**容器**会解包保留其文本；`script`/`style`/`template`/`noscript`/`head`/`title` 等不可见元素整棵丢弃
- 输入**不会被修改**（预解析 DOM 可安全复用），转换是异步的
- **不是净化器**：`class`/`style` 原样透传，`style` 不过滤，`img.src` 不校验协议——输入需可信或先自行消毒
- 深嵌套/超大输入建议显式设置 `maxDepth` / `maxInputLength`

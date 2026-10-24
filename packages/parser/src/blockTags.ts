/**
 * Block-level tags, which start a new line at their content boundaries.
 *
 * Shared by the plain-text extraction (block tags become line breaks) and the rich-text conversion
 * (only block containers trim leading / trailing whitespace, inline elements must keep it so that
 * `<p>a<b> </b>c</p>` stays `a c`).
 *
 * 块级标签：在内容边界产生换行。纯文本提取用它生成换行，rich-text 转换只对这些容器裁剪首尾空白， 内联元素必须保留空白，否则 `a<b> </b>c` 会变成 `ac`。
 */
export const BLOCK_TAGS: Set<string> = new Set<string>([
  "address",
  "article",
  "aside",
  "blockquote",
  "div",
  "dl",
  "dt",
  "dd",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

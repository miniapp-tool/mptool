import { isTag } from "domhandler";
import type { AnyNode } from "domhandler";

/**
 * Elements whose content is never rendered as text and must not leak into parsed rich text.
 *
 * `script` / `style` / `template` / `noscript` / `head` / `title` never show up in the rendered
 * page; `iframe` / `object` / `embed` are embedded content without meaningful fallback text.
 *
 * 这些元素的内容不会作为文本渲染，也不能混入解析结果：`script` / `style` / `template` / `noscript` / `head` / `title`
 * 不会出现在页面上；`iframe` / `object` / `embed` 属于内嵌内容，没有有意义的回退文本。
 */
export const INVISIBLE_TAGS: ReadonlySet<string> = new Set<string>([
  "script",
  "style",
  "template",
  "noscript",
  "head",
  "title",
  "iframe",
  "object",
  "embed",
]);

/**
 * Whether a node is an element whose content must be ignored entirely.
 *
 * 判断节点是否为内容必须整体忽略的元素。
 *
 * @param node - DOM node / DOM 节点
 * @returns Whether its content is invisible / 内容是否不可见
 */
export const isInvisibleTag = (node: AnyNode): boolean =>
  isTag(node) && INVISIBLE_TAGS.has(node.name);

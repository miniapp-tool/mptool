import { render } from "dom-serializer";
import { isTag } from "domhandler";
import type { AnyNode } from "domhandler";
import { parseDocument } from "htmlparser2";

/**
 * 递归删除 `script` 元素，对齐 cheerio `$.parseHTML` 的默认剔除行为
 *
 * @param nodes - 节点数组
 */
const removeScript = (nodes: AnyNode[]): void => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];

    // domhandler v6 中 script 元素的 type 为 "script" 而非 "tag"，用 isTag 判断
    if (isTag(node) && node.name === "script") {
      const { next, prev } = node;

      if (prev) prev.next = next;
      if (next) next.prev = prev;

      node.next = null;
      node.prev = null;
      node.parent = null;
      nodes.splice(i, 1);
    } else if ("children" in node) {
      removeScript(node.children);
    }
  }
};

export const parseHTML = (content: string): AnyNode[] => {
  if (!content) return [];

  const document = parseDocument(content);

  removeScript(document.children);

  // 返回数组副本，对齐 cheerio `$.parseHTML` 的语义（结果不随后续 DOM 操作变化）
  return [...document.children];
};

export const getHTML = (content: string | AnyNode | AnyNode[]): string =>
  render(typeof content === "string" ? parseHTML(content) : content, { xmlMode: true });

/* oxlint-disable typescript/no-unsafe-enum-comparison */
import type { AnyNode } from "domhandler";

import { BLOCK_TAGS } from "./blockTags.js";
import { isInvisibleTag } from "./invisibleTags.js";
import type { ParserOptions } from "./options.js";
import { parseHTML } from "./parser.js";

/**
 * Extract text from parsed nodes with a depth budget, using an explicit stack so deeply nested
 * input cannot overflow the host call stack.
 *
 * 在深度预算内提取已解析节点的文本；使用显式栈，深嵌套输入不会撑爆宿主调用栈。
 *
 * @param nodes - Parsed nodes / 已解析节点
 * @param maxDepth - Maximum depth / 最大深度
 * @returns Extracted text / 提取出的文本
 */
const getTextNodes = (nodes: AnyNode[], maxDepth: number): string => {
  const parts: string[] = [];
  const stack: { nodes: AnyNode[]; index: number; depth: number; blockAfter: boolean }[] = [
    { nodes, index: 0, depth: 1, blockAfter: false },
  ];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];

    if (frame.index >= frame.nodes.length) {
      stack.pop();

      if (frame.blockAfter) parts.push("\n");

      continue;
    }

    const node = frame.nodes[frame.index];

    frame.index += 1;

    if (frame.depth > maxDepth)
      throw new RangeError(`Input nesting is too deep (limit ${maxDepth} levels)`);

    if (node.type === "text") {
      parts.push(node.data);
      continue;
    }

    // script/style/... never contribute text, whether parsed from a string or passed in
    // script/style/... 不贡献文本（无论来自字符串解析还是预解析节点）
    if (isInvisibleTag(node)) continue;

    if ("childNodes" in node) {
      stack.push({
        nodes: node.childNodes,
        index: 0,
        depth: frame.depth + 1,
        blockAfter: node.type === "tag" && (BLOCK_TAGS.has(node.name) || node.name === "br"),
      });
    }
  }

  return parts.join("");
};

export const getText = (
  content: string | AnyNode[],
  {
    maxInputLength = Number.POSITIVE_INFINITY,
    maxDepth = Number.POSITIVE_INFINITY,
  }: ParserOptions = {},
): string => {
  if (typeof content === "string" && content.length > maxInputLength) {
    throw new RangeError(
      `Input length ${content.length} exceeds the limit of ${maxInputLength} code units`,
    );
  }

  const nodes = typeof content === "string" ? parseHTML(content) : content;

  return (
    getTextNodes(nodes, maxDepth)
      // collapse consecutive whitespace, strip whitespace around line breaks
      // and trim, producing a readable plain-text extraction
      .replace(/[ \t\r]+/gu, " ")
      .replace(/\n+/gu, "\n")
      .replace(/ ?\n ?/gu, "\n")
      .trim()
  );
};

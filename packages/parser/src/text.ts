/* oxlint-disable typescript/no-unsafe-enum-comparison */
import type { AnyNode } from "domhandler";

import { BLOCK_TAGS } from "./blockTags.js";
import { isInvisibleTag } from "./invisibleTags.js";
import { parseHTML } from "./parser.js";

export const getText = (content: string | AnyNode[]): string => {
  const nodes = typeof content === "string" ? parseHTML(content) : content;

  return (
    nodes
      .map((node) => {
        if (node.type === "text") return node.data;
        // script/style/... never contribute text, whether parsed from a string or passed in
        // script/style/... 不贡献文本（无论来自字符串解析还是预解析节点）
        if (isInvisibleTag(node)) return "";
        if ("childNodes" in node) {
          const inner = getText(node.childNodes);

          if (node.type === "tag" && (BLOCK_TAGS.has(node.name) || node.name === "br"))
            return `${inner}\n`;
          return inner;
        }

        return "";
      })
      .join("")
      // collapse consecutive whitespace, strip whitespace around line breaks
      // and trim, producing a readable plain-text extraction
      .replace(/[ \t\r]+/gu, " ")
      .replace(/\n+/gu, "\n")
      .replace(/ ?\n ?/gu, "\n")
      .trim()
  );
};

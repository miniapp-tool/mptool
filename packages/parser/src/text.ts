/* oxlint-disable typescript/no-unsafe-enum-comparison */
import type { AnyNode } from "domhandler";

import { parseHTML } from "./parser.js";

/** 块级标签，在内容边界产生换行 */
const BLOCK_TAGS = new Set([
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

export const getText = (content: string | AnyNode[]): string => {
  const nodes = typeof content === "string" ? parseHTML(content) : content;

  return (
    nodes
      .map((node) => {
        if (node.type === "text") return node.data;
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

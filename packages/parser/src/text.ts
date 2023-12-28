/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import type { AnyNode } from "cheerio/lib/slim";

import { parseHTML } from "./parser.js";

export const getText = (content: string | AnyNode[]): string => {
  const nodes =
    typeof content === "string" ? parseHTML(content) || [] : content;

  return nodes
    .map((node) => {
      if (node.type === "text") return node.data;
      if ("childNodes" in node) return getText(node.childNodes);

      return "";
    })
    .join("");
};

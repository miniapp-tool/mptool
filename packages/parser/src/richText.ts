/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import type { AnyNode } from "domhandler";

import type { AllowTag } from "./allowedTags.js";
import { ALLOWED_TAGS } from "./allowedTags.js";
import type { ParserOptions } from "./options.js";
import { parseHTML } from "./parser.js";
import type { ElementNode, RichTextNode } from "./typings.js";

const handleNodes = (nodes: (RichTextNode | null)[]): RichTextNode[] => {
  const result: RichTextNode[] = nodes.filter((item): item is RichTextNode =>
    Boolean(item),
  );

  const first = result[0];

  // remove first text node if it's empty
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (first && first.type === "text" && !first.text.trim()) result.shift();

  const last = result[result.length - 1];

  // remove last text node if it's empty
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (last && last.type === "text" && !last.text.trim()) result.pop();

  return result;
};

const handleNode = async (
  node: AnyNode,
  { appendClass, transform }: Required<ParserOptions>,
): Promise<RichTextNode | null> => {
  // remove \r in text node
  if (node.type === "text")
    return { type: "text", text: node.data.replace(/\r/g, "") };

  if (node.type === "tag") {
    const config = ALLOWED_TAGS.find(([tag]) => node.name === tag);

    if (config) {
      const attrs = Object.fromEntries(
        node.attributes
          .filter(
            ({ name }) =>
              ["class", "style"].includes(name) || config[1]?.includes(name),
          )
          .map<[string, string]>(({ name, value }) => [name, value]),
      );

      const children = handleNodes(
        await Promise.all(
          node.children.map((node) =>
            handleNode(node, { appendClass, transform }),
          ),
        ),
      );

      if (appendClass)
        attrs.class = attrs.class ? `${attrs.class} ${node.name}` : node.name;

      const convertedNode: ElementNode = {
        type: "node",
        name: node.name,
        ...(Object.keys(attrs).length ? { attrs } : {}),
        ...(children.length ? { children } : {}),
      };

      const converter = transform[node.name as AllowTag];

      return await (converter ? converter(convertedNode) : convertedNode);
    }
  }

  return null;
};

export const getRichTextNodes = async (
  content: string | AnyNode[],
  { appendClass = true, transform = {} }: ParserOptions = {},
): Promise<RichTextNode[]> =>
  handleNodes(
    await Promise.all(
      (Array.isArray(content) ? content : parseHTML(content)).map((node) =>
        handleNode(node, { appendClass, transform }),
      ),
    ),
  );

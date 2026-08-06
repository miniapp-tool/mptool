/* oxlint-disable typescript/no-unsafe-enum-comparison */
import type { AnyNode, Element } from "domhandler";

import type { AllowTag } from "./allowedTags.js";
import { ALLOWED_TAGS } from "./allowedTags.js";
import type { ParserOptions } from "./options.js";
import { getHTML, parseHTML } from "./parser.js";
import { convertSVGToDataURI } from "./svg.js";
import type { ElementNode, RichTextNode } from "./typings.js";

// SVG attribute names are case-sensitive, but cheerio lowercases them during
// HTML parsing. Restore the rendering-critical ones; filter and other rare
// attributes are intentionally left out
const SVG_CAMEL_CASE_ATTRS = [
  "viewBox",
  "preserveAspectRatio",
  "gradientUnits",
  "gradientTransform",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "markerStart",
  "markerMid",
  "markerEnd",
  "refX",
  "refY",
  "clipPathUnits",
  "maskUnits",
  "maskContentUnits",
] as const;

/**
 * Restores camel-case attribute names on the svg node and its children
 *
 * @param node - The svg node
 */
const restoreSVGAttrs = (node: Element): void => {
  SVG_CAMEL_CASE_ATTRS.forEach((attr) => {
    const lowerAttr = attr.toLowerCase();

    if (node.attribs[lowerAttr]) {
      node.attribs[attr] = node.attribs[lowerAttr];
      // oxlint-disable-next-line typescript/no-dynamic-delete
      delete node.attribs[lowerAttr];
    }
  });

  node.children.forEach((child) => {
    if (child.type === "tag") restoreSVGAttrs(child);
  });
};

const handleSVG = (node: Element): RichTextNode => {
  // Restore camel-case attribute names so the svg renders correctly
  restoreSVGAttrs(node);

  const { width, height, viewBox } = node.attribs;

  let style = "";

  if (width) style += `width:${width}${/^[\d.]*\d$/u.test(width) ? "px" : ""};`;

  if (height) style += `height:${height}${/^[\d.]*\d$/u.test(height) ? "px" : ""};`;

  if (!style && viewBox) {
    // viewBox 支持空格或逗号分隔，取宽高
    const [viewboxWidth, viewboxHeight] = viewBox
      .split(/[\s,]+/u)
      .slice(2)
      .map(Number);

    if (Number.isFinite(viewboxWidth) && Number.isFinite(viewboxHeight))
      style = `width:${viewboxWidth}px;height:${viewboxHeight}px;`;
  }

  return {
    type: "node",
    name: "img",
    attrs: {
      src: convertSVGToDataURI(getHTML(node)),
      ...(style ? { style } : {}),
    },
  };
};

const handleNodes = (nodes: (RichTextNode | null)[]): RichTextNode[] => {
  const result: RichTextNode[] = nodes.filter((item): item is RichTextNode => item != null);

  const [first] = result;

  // remove first text node if it's empty
  if (first?.type === "text" && !first.text.trim()) result.shift();

  const last = result[result.length - 1];

  // remove last text node if it's empty
  if (last?.type === "text" && !last.text.trim()) result.pop();

  return result;
};

const handleNode = async (
  node: AnyNode,
  { appendClass, transform }: Required<ParserOptions>,
): Promise<RichTextNode | null> => {
  // remove \r in text node
  if (node.type === "text") return { type: "text", text: node.data.replace(/\r/gu, "") };

  if (node.type === "tag") {
    const config = ALLOWED_TAGS.find(([tag]) => node.name === tag);

    if (config) {
      if (node.name === "svg") return handleSVG(node);

      const attrs: Record<string, string> = {};

      node.attributes
        .filter(({ name }) => ["class", "style"].includes(name) || config[1]?.includes(name))
        .forEach(({ name, value }) => {
          attrs[name] = value;
        });

      const children = handleNodes(
        await Promise.all(
          node.children.map((childNode) => handleNode(childNode, { appendClass, transform })),
        ),
      );

      // `a` 标签在 rich-text 中无法点击；若 href 是完整链接，以括号形式附加到文本后，方便查看
      if (node.name === "a") {
        const href = node.attributes.find(({ name }) => name === "href")?.value;

        if (href && /^https?:\/\//u.test(href)) children.push({ type: "text", text: ` (${href})` });
      }

      if (appendClass) attrs.class = attrs.class ? `${node.name} ${attrs.class}` : node.name;

      const convertedNode: ElementNode = {
        type: "node",
        name: ["html", "body"].includes(node.name) ? "div" : node.name,
        ...(Object.keys(attrs).length ? { attrs } : {}),
        ...(children.length ? { children } : {}),
      };

      const converter = transform[node.name as AllowTag];

      return converter ? converter(convertedNode) : convertedNode;
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

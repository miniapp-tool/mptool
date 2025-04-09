import { load } from "cheerio/slim";
import type { AnyNode } from "domhandler";

export const $ = load("");

export const parseHTML = (content: string): AnyNode[] =>
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  $.parseHTML(content) ?? [];

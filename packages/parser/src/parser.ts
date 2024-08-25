import { load } from "cheerio/slim";
import type { AnyNode } from "domhandler";

const $ = load("");

export const parseHTML = (content: string): AnyNode[] =>
  $.parseHTML(content) ?? [];

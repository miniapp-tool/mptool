import type { AnyNode } from "cheerio/lib/slim";
import { load } from "cheerio/lib/slim";

const $ = load("");

export const parseHTML = (content: string): AnyNode[] =>
  $.parseHTML(content) ?? [];

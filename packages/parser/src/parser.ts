import { load } from "cheerio/slim";
import type { AnyNode } from "domhandler";

const $ = load("");

export const getHTML = (content: string | AnyNode | AnyNode[]): string => $.xml(content);

export const parseHTML = (content: string): AnyNode[] =>
  // oxlint-disable-next-line typescript/no-unnecessary-condition
  $.parseHTML(content) ?? [];

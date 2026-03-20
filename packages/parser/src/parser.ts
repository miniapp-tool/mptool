import { load } from "cheerio/slim";
import type { AnyNode } from "domhandler";

// oxlint-disable-next-line id-length
const $ = load("");

export const getHTML = (content: string | AnyNode | AnyNode[]): string => $.xml(content);

export const parseHTML = (content: string): AnyNode[] => $.parseHTML(content) ?? [];

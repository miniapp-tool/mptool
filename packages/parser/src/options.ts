import type { AllowTag } from "./allowedTags.js";
import type { ElementNode } from "./typings.js";

export type NodeHandler = (node: ElementNode) => ElementNode | null | Promise<ElementNode | null>;

export interface ParserOptions {
  /**
   * 是否附加标签名到 class
   *
   * @default true
   */
  appendClass?: boolean;

  /**
   * 处理 Tag
   */
  transform?: Partial<Record<AllowTag, NodeHandler>>;
}

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

  /** 处理 Tag */
  transform?: Partial<Record<AllowTag, NodeHandler>>;

  /**
   * 输入字符串长度上限（UTF-16 code unit），超限抛出 `RangeError`
   *
   * @default Infinity
   */
  maxInputLength?: number;

  /**
   * 节点嵌套深度上限，超限抛出 `RangeError`
   *
   * @default Infinity
   */
  maxDepth?: number;
}

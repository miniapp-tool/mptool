/**
 * Internal control-flow signal for `return`.
 *
 * `return` 的内部控制流信号。
 *
 * Thrown through the tree by `Runtime.evalStatement` and caught at the enclosing function boundary
 * (see `Runtime` in `./interpreter.js`).
 *
 * 由 `Runtime.evalStatement` 沿树抛出，在所属函数边界捕获（见 `./interpreter.js` 中的 `Runtime`）。
 */
export class ReturnSignalError extends Error {
  constructor(public readonly value: unknown) {
    super("return");
    this.name = "ReturnSignalError";
  }
}

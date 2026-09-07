/**
 * Internal control-flow signal for `continue`.
 *
 * `continue` 的内部控制流信号。
 *
 * Thrown through the tree by `Runtime.evalStatement` and caught at the enclosing loop or
 * labeled-statement boundary (see `Runtime` in `./interpreter.js`).
 *
 * 由 `Runtime.evalStatement` 沿树抛出，在所属循环或标签语句边界捕获（见 `./interpreter.js` 中的 `Runtime`）。
 */
export class ContinueSignalError extends Error {
  constructor(public readonly label: string | null) {
    super("continue");
    this.name = "ContinueSignalError";
  }
}

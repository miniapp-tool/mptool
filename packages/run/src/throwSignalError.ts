/**
 * Internal signal wrapping a user `throw` value.
 *
 * 包装用户 `throw` 值的内部控制流信号。
 *
 * Wraps an arbitrary user-thrown value so it can be rethrown across evaluator boundaries without
 * being confused with genuine host errors (see `Runtime` in `./interpreter.js`).
 *
 * 包装用户抛出的任意值，使其能跨求值边界重抛，且不与真实宿主错误混淆（见 `./interpreter.js` 中的 `Runtime`）。
 */
export class ThrowSignalError extends Error {
  constructor(public readonly value: unknown) {
    super("throw");
    this.name = "ThrowSignalError";
  }
}

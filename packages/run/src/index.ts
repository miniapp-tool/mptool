import { Runtime } from "./interpreter.js";
import { parse } from "./parser.js";

/**
 * Interpreter options
 *
 * 解释器选项
 */
export interface RunOptions {
  /**
   * Host capabilities to inject explicitly (wx, console, etc.)
   *
   * 显式注入宿主能力（wx、console 等）
   */
  globals?: Record<string, unknown>;

  /**
   * Whether to automatically expose every own property of the host global object (`globalThis`) to
   * the sandbox, `false` by default
   *
   * 是否自动将宿主全局对象（`globalThis`）的全部自有属性暴露到沙箱，默认 `false`
   */
  global?: boolean;

  /**
   * Max steps count, `1e6` by default
   *
   * 步数上限，默认 `1e6`
   */
  maxSteps?: number;

  /**
   * Max call stack depth, `512` by default
   *
   * 调用栈深度上限，默认 `512`
   */
  maxStack?: number;

  /**
   * Whether to parse and run in strict mode, `false` by default
   *
   * 是否以严格模式解析执行，默认 `false`
   */
  strict?: boolean;

  /**
   * Feature toggles
   *
   * 特性开关
   */
  features?: {
    /**
     * Whether to allow `class`, `true` by default
     *
     * 是否允许 class，默认 `true`
     */
    class?: boolean;

    /**
     * Whether to allow `for...of`, `true` by default
     *
     * 是否允许 for...of，默认 `true`
     */
    forOf?: boolean;

    /**
     * Whether to allow `async`/`await`, `true` by default
     *
     * 是否允许 async/await，默认 `true`
     */
    async?: boolean;

    /**
     * Whether to allow BigInt literals, `true` by default
     *
     * 是否允许 BigInt 字面量，默认 `true`
     */
    bigint?: boolean;
  };
}

/**
 * A run result: either a plain value, or a `Promise` when the code contains async operations
 *
 * 运行结果：普通值，或含 async 代码时的 Promise
 */
export type RunResult = unknown;

/**
 * Reusable sandbox sharing the global environment
 *
 * 可复用沙箱（共享全局环境，多次运行）
 */
export interface Sandbox {
  /**
   * Run code, returns a `Promise` when the code contains async operations
   *
   * 运行代码，含 async 时返回 Promise
   */
  run: (code: string) => RunResult;

  /**
   * Set a global variable
   *
   * 设置全局变量
   */
  setGlobal: (name: string, value: unknown) => void;

  /**
   * Get a global variable
   *
   * 获取全局变量
   */
  getGlobal: (name: string) => unknown;
}

/**
 * Run code once, returns a `Promise` when the code contains async operations
 *
 * 一次性执行（含 async 时返回 Promise）
 *
 * @param code - Code to run / 要运行的代码
 * @param options - Interpreter options / 解释器选项
 * @returns Run result, maybe a `Promise` / 运行结果，可能为 Promise
 */
export const run = (code: string, options?: RunOptions): RunResult => {
  const runtime = new Runtime(options);

  return runtime.run(parse(code, runtime.features));
};

/**
 * Run code synchronously, throws when the code triggers async operations
 *
 * 同步执行（代码触发 async 则抛错）
 *
 * @param code - Code to run / 要运行的代码
 * @param options - Interpreter options / 解释器选项
 * @returns Run result / 运行结果
 */
export const runSync = (code: string, options?: RunOptions): unknown => {
  const result = run(code, options);

  if (result instanceof Promise)
    throw new Error("The code triggered async operations, which runSync does not support");

  return result;
};

/**
 * Create a reusable sandbox sharing the global environment
 *
 * 创建可复用沙箱（共享全局环境）
 *
 * @param options - Interpreter options / 解释器选项
 * @returns Sandbox instance / 沙箱实例
 */
export const createSandbox = (options?: RunOptions): Sandbox => {
  const runtime = new Runtime(options);

  return {
    run: (code: string): RunResult => runtime.run(parse(code, runtime.features)),
    setGlobal: (name: string, value: unknown): void => {
      runtime.setGlobal(name, value);
    },
    getGlobal: (name: string): unknown => runtime.getGlobal(name),
  };
};

/**
 * Create a function to replace `new Function`
 *
 * 创建函数以替代 `new Function`
 *
 * The returned function preserves the caller's `this` — use `.call(page)` to run the body with a
 * page instance as `this`, e.g. for hot-update scenarios.
 *
 * 返回的函数保留调用方的 `this`——可用 `.call(page)` 以页面实例作为 `this` 执行函数体，例如用于热更新场景。
 *
 * @param args - Parameter names / 参数名列表
 * @param body - Function body / 函数体
 * @param options - Interpreter options / 解释器选项
 * @returns The created function / 创建的函数
 */
export const createFunction = (
  args: string[],
  body: string,
  options?: RunOptions,
): ((...args: unknown[]) => RunResult) => {
  const runtime = new Runtime(options);

  // `(function(a, b) { ... })` — an independent function with its own sandbox
  // `(function(a, b) { ... })` —— 拥有独立沙箱的函数
  const fn = runtime.run(parse(`(function(${args.join(", ")}) { ${body} })`, runtime.features)) as (
    ...callArgs: unknown[]
  ) => unknown;

  // a plain (non-arrow) function preserves `this` from the call site and forwards it to the
  // interpreter function, so `.call(page)` exposes the page instance to the body
  // 使用普通函数（非箭头）保留调用点的 `this` 并转发给解释器函数，`.call(page)` 可将页面实例暴露给函数体
  return function hotUpdate(this: unknown, ...callArgs: unknown[]): RunResult {
    return fn.apply(this, callArgs);
  };
};

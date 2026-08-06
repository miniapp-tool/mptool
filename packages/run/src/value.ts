/**
 * Value helpers for `@mptool/run`: host-delegated coercion and interpreter function wrappers.
 *
 * `@mptool/run` 的值工具：宿主委托的类型转换与解释器函数包装。
 *
 * Per the host-delegation value model (design doc §4.1), numbers, strings, booleans and objects are
 * plain host values, so coercions delegate to the host runtime. The only interpreter-specific value
 * is the **interpreter function**: a host-callable wrapper carrying the function metadata
 * (`InterpreterFunctionMeta`). Host code (e.g. `Array.map(cb)`) can call the wrapper directly — it
 * routes back into the interpreter via an injected `invoke` callback.
 *
 * 按宿主委托值模型（设计文档 §4.1），数字/字符串/布尔/对象直接使用宿主值，转换全部委托宿主运行时。唯一
 * 解释器特有的值是**解释器函数**：一个宿主可调用的包装，携带函数元数据（`InterpreterFunctionMeta`）。 宿主代码（如 `Array.map(cb)`）可直接调用该包装
 * —— 它通过注入的 `invoke` 回调回到解释器执行。
 */
import type { BlockStatement, Expression, Pattern } from "./ast.js";
import type { Environment } from "./environment.js";

/** How `this` is handled when a function is called / 调用时 `this` 的处理方式 */
export type ThisMode = "sloppy" | "strict" | "arrow";

/** Interpreter function metadata / 解释器函数元数据 */
export interface InterpreterFunctionMeta {
  /** Function name (`null` for anonymous) / 函数名（匿名函数为 `null`） */
  readonly name: string | null;

  /** Parameter patterns / 参数模式 */
  readonly params: readonly Pattern[];

  /** Function body — a block, or an expression for expression-bodied arrows / 函数体——块，或箭头函数的表达式体 */
  readonly body: BlockStatement | Expression;

  /** Closure environment / 闭包环境 */
  readonly closure: Environment;

  /** How `this` is handled / `this` 的处理方式 */
  readonly thisMode: ThisMode;

  /** Whether this is an async function / 是否为 async 函数 */
  readonly isAsync: boolean;

  /** Whether this is a class constructor / 是否为类构造器 */
  readonly isClassConstructor: boolean;

  /** Whether the function can be used with `new` / 是否可被 `new` 调用 */
  readonly constructable: boolean;

  /** Instance prototype for constructors (`null` for arrows/methods) / 构造器的实例原型（箭头/方法为 `null`） */
  readonly prototype: object | null;

  /** Parent constructor for `super()` in derived constructors / 派生构造器 `super()` 的父构造器 */
  readonly superClass: unknown;

  /** Base object for `super.x` lookups / `super.x` 查找的基准对象 */
  readonly superBase: object | null;

  /** Whether the function binds an `arguments` object / 是否绑定 `arguments` 对象 */
  readonly hasArguments: boolean;

  /**
   * Simple (non-destructured) parameter names for sloppy `arguments` mapping / 供 sloppy `arguments`
   * 映射的简单参数名
   */
  readonly simpleParamNames: readonly (string | null)[];

  /** Whether this is the implicit constructor of a derived class / 是否为派生类的隐式构造器 */
  readonly implicitDerived: boolean;

  /**
   * Lexical `this` captured by an arrow function (`null` for non-arrows) / 箭头函数捕获的词法 `this`（非箭头为
   * `null`）
   */
  readonly lexicalThis: { value: unknown } | null;

  /** Lexical `super` base captured by an arrow function / 箭头函数捕获的词法 `super` 基准 */
  readonly lexicalSuperBase: object | null;

  /** Lexical `super` constructor captured by an arrow function / 箭头函数捕获的词法 `super` 构造器 */
  readonly lexicalSuperClass: unknown;

  /**
   * The host wrapper itself, back-filled by `makeInterpreterFunction` / 宿主包装本身（由
   * `makeInterpreterFunction` 回填）
   */
  callee: InterpreterFunction | null;
}

/**
 * The host-callable wrapper of an interpreter function.
 *
 * 解释器函数的宿主可调用包装。
 */
export type InterpreterFunction = ((...args: unknown[]) => unknown) & {
  /** Non-enumerable marker holding the metadata / 持有元数据的不可枚举标记 */
  readonly interpreterMeta: InterpreterFunctionMeta;
};

/**
 * The callback that routes a wrapper call back into the interpreter.
 *
 * 将包装调用路由回解释器的回调。
 *
 * @param meta - Function metadata / 函数元数据
 * @param args - Call arguments / 调用参数
 * @param thisArg - The host `this` at the call site / 调用点的宿主 `this`
 * @param constructed - Whether the wrapper was invoked via host `new` / 是否经宿主 `new` 调用
 * @returns The call result / 调用结果
 */
export type InterpreterInvoke = (
  meta: InterpreterFunctionMeta,
  args: unknown[],
  thisArg: unknown,
  constructed: boolean,
) => unknown;

/** WeakSet tracking interpreter function wrappers / 跟踪解释器函数包装的 WeakSet */
const interpreterFunctionSet = new WeakSet<object>();

/**
 * Whether a value is an interpreter function wrapper.
 *
 * 判断值是否为解释器函数包装。
 *
 * @param value - Value to check / 待判断的值
 * @returns Whether it is an interpreter function / 是否为解释器函数
 */
export const isInterpreterFunction = (value: unknown): boolean =>
  typeof value === "function" && interpreterFunctionSet.has(value);

/**
 * Get the metadata of an interpreter function, or `null` for other values.
 *
 * 获取解释器函数的元数据，其他值返回 `null`。
 *
 * @param value - Value to check / 待判断的值
 * @returns The metadata or `null` / 元数据或 `null`
 */
export const getInterpreterMeta = (value: unknown): InterpreterFunctionMeta | null =>
  isInterpreterFunction(value) ? (value as InterpreterFunction).interpreterMeta : null;

/**
 * Create the host-callable wrapper of an interpreter function.
 *
 * 创建解释器函数的宿主可调用包装。
 *
 * The wrapper is a plain host function, so `Function.prototype.call/apply/bind`, `instanceof` and
 * host callbacks (e.g. `Array.map`) all work on it natively. The host `this` and whether it was
 * constructed via host `new` are forwarded to `invoke`.
 *
 * 包装是普通宿主函数，因此 `Function.prototype.call/apply/bind`、`instanceof` 与宿主回调（如 `Array.map`） 都能原生工作。宿主
 * `this` 与是否经宿主 `new` 构造会被转发给 `invoke`。
 *
 * @param meta - Function metadata / 函数元数据
 * @param invoke - The interpreter routing callback / 解释器路由回调
 * @returns The host-callable wrapper / 宿主可调用包装
 */
export const makeInterpreterFunction = (
  meta: InterpreterFunctionMeta,
  invoke: InterpreterInvoke,
): InterpreterFunction => {
  const wrapper = function wrapper(this: unknown, ...args: unknown[]): unknown {
    return invoke(meta, args, this, new.target != null);
  } as InterpreterFunction;

  Object.defineProperty(wrapper, "interpreterMeta", {
    value: meta,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  Object.defineProperty(wrapper, "prototype", {
    value: meta.constructable ? (meta.prototype ?? { constructor: wrapper }) : void 0,
    enumerable: false,
    configurable: false,
    writable: true,
  });

  interpreterFunctionSet.add(wrapper);

  meta.callee = wrapper;

  return wrapper;
};

/**
 * `typeof` for any value: interpreter functions report `"function"`.
 *
 * 任意值的 `typeof`：解释器函数报告 `"function"`。
 *
 * @param value - Value to inspect / 待检查的值
 * @returns The `typeof` string / `typeof` 字符串
 */
export const typeOf = (value: unknown): string =>
  isInterpreterFunction(value) ? "function" : typeof value;

/* oxlint-disable unicorn/prefer-native-coercion-functions -- required coercion helpers */

/**
 * Convert a value to boolean (host `Boolean`).
 *
 * 将值转换为布尔值（宿主 `Boolean`）。
 *
 * @param value - Value to convert / 待转换的值
 * @returns The boolean / 布尔值
 */
export const toBoolean = (value: unknown): boolean => Boolean(value);

/**
 * Convert a value to number (host `Number`).
 *
 * 将值转换为数字（宿主 `Number`）。
 *
 * Throws `TypeError` for `bigint` since the implicit `ToNumber` of a BigInt is an error.
 *
 * 对 `bigint` 抛出 `TypeError` —— BigInt 的隐式 `ToNumber` 属于错误。
 *
 * @param value - Value to convert / 待转换的值
 * @returns The number / 数字
 */
export const toNumber = (value: unknown): number => {
  if (typeof value === "bigint") throw new TypeError("Cannot convert a BigInt value to a number");

  return Number(value);
};

/**
 * Convert a value to string (host `String`).
 *
 * 将值转换为字符串（宿主 `String`）。
 *
 * @param value - Value to convert / 待转换的值
 * @returns The string / 字符串
 */
export const toString = (value: unknown): string => String(value);

/* oxlint-enable unicorn/prefer-native-coercion-functions */

/**
 * Whether a value is strictly `undefined` (used for default-value semantics).
 *
 * 值是否严格为 `undefined`（用于默认值语义）。
 *
 * @param value - Value to check / 待检查的值
 * @returns Whether it is `undefined` / 是否为 `undefined`
 */
export const isUndefined = (value: unknown): boolean => value === void 0;

/**
 * Convert a value to a property key: symbols pass through, everything else becomes a string.
 *
 * 将值转换为属性键：symbol 原样返回，其余转字符串。
 *
 * @param value - Value to convert / 待转换的值
 * @returns The property key / 属性键
 */
export const toPropertyKey = (value: unknown): string | symbol =>
  typeof value === "symbol" ? value : String(value);

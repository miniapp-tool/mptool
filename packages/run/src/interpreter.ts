/**
 * Tree-walking interpreter (evaluator core) for `@mptool/run`.
 *
 * `@mptool/run` 的树遍历求值器（解释器核心）。
 *
 * The `Runtime` holds the sandbox global object, the global `Environment`, step/stack limits and an
 * explicit execution-context stack (resolving `this`/`super`). It evaluates a parsed `Program` by
 * recursive tree traversal; control flow (`return`/`break`/`continue`/`throw`) uses internal signal
 * objects thrown through the tree and caught at the appropriate boundary. All builtins are host
 * values delegated to the host runtime (design doc §4.4).
 *
 * Async support is implemented with a generator-based runner: `async` functions return a host
 * `Promise` driven by a resumable generator; `await` yields the pending promise and the driver
 * resumes on settlement. While suspended, the async call's `contextStack` frames and `stackDepth`
 * are released and restored on resume (see the "Async functions" section below).
 *
 * `Runtime` 持有沙箱全局对象、全局 `Environment`、步数/栈上限与显式执行上下文栈（解析 `this`/`super`）。 它通过递归树遍历求值已解析的
 * `Program`；控制流（`return`/`break`/`continue`/`throw`）使用内部信号对象 沿树抛出，并在相应边界捕获。全部内建均为委托宿主的宿主值（设计文档
 * §4.4）。
 *
 * Async 支持由生成器运行器实现：`async` 函数返回由可恢复生成器驱动的宿主 `Promise`；`await` 挂起 pending promise，结算后由驱动恢复。挂起期间
 * async 调用的 `contextStack` 帧与 `stackDepth` 会被释放，恢复时还原（见下文 "Async functions" 一节）。
 */
import type {
  ArrayExpr,
  ArrayPattern,
  ArrowFunctionExpr,
  AssignmentExpr,
  AssignmentTarget,
  BinaryExpr,
  BinaryOperator,
  BlockStatement,
  CallExpr,
  ClassBody,
  ClassDeclaration,
  ClassMethod,
  DoWhileStatement,
  Expression,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionExpr,
  IfStatement,
  LabeledStatement,
  LogicalExpr,
  MemberExpr,
  NewExpr,
  ObjectExpr,
  ObjectPattern,
  Pattern,
  Program,
  SpreadExpr,
  Statement,
  SwitchStatement,
  TemplateExpr,
  TryStatement,
  UnaryExpr,
  UpdateExpr,
  VariableDeclaration,
  WhileStatement,
} from "./ast.js";
import { Environment } from "./environment.js";
import type { FeatureOptions } from "./parser.js";
import {
  getInterpreterMeta,
  isUndefined,
  makeInterpreterFunction,
  toBoolean,
  toNumber,
  toPropertyKey,
  toString,
  typeOf,
} from "./value.js";
import type { InterpreterFunction, InterpreterFunctionMeta, InterpreterInvoke } from "./value.js";

/** Options for creating a `Runtime` / 创建 `Runtime` 的选项 */
export interface RuntimeOptions {
  /** Host capabilities to inject into the sandbox global / 注入沙箱全局的宿主能力 */
  globals?: Record<string, unknown>;

  /** Max steps before aborting, `1e6` by default / 步数上限，默认 `1e6` */
  maxSteps?: number;

  /** Max call stack depth before aborting, `512` by default / 调用栈深度上限，默认 `512` */
  maxStack?: number;

  /** Whether the program runs in strict mode, `false` by default / 是否严格模式，默认 `false` */
  strict?: boolean;

  /** Feature toggles / 特性开关 */
  features?: Partial<FeatureOptions>;
}

/** Default feature flags / 默认特性开关 */
const DEFAULT_FEATURES: FeatureOptions = {
  class: true,
  forOf: true,
  async: true,
  bigint: true,
};

/**
 * Sentinel for the uninitialized `this` of a derived constructor before `super()` / 派生构造器在
 * `super()` 前未初始化 `this` 的哨兵
 */
const UNINITIALIZED = Symbol("uninitialized this");

/** Empty block used by implicit constructors / 隐式构造器使用的空块 */
const EMPTY_BLOCK: BlockStatement = { type: "block", body: [], start: 0, end: 0 };

/**
 * Generic AST walk: whether any node in the subtree has a `type` matching the predicate.
 *
 * 通用 AST 遍历：子树中是否存在 `type` 匹配谓词的节点。
 *
 * @param node - The node or value / 节点或值
 * @param pred - Type predicate / 类型谓词
 * @returns Whether any node matches / 是否存在匹配节点
 */
const walkContains = (node: unknown, pred: (type: string) => boolean): boolean => {
  if (Array.isArray(node)) return node.some((item) => walkContains(item, pred));

  if (node != null && typeof node === "object") {
    const record = node as Record<string, unknown>;

    if (typeof record.type === "string" && pred(record.type)) return true;

    for (const key of Object.keys(record)) {
      if (key === "start" || key === "end") continue;
      if (walkContains(record[key], pred)) return true;
    }
  }

  return false;
};

/**
 * Whether a node subtree contains an `await` expression / 子树是否含 `await` 表达式
 *
 * @param node - The node or value / 节点或值
 * @returns Whether it contains `await` / 是否含 `await`
 */
const containsAwait = (node: unknown): boolean => walkContains(node, (type) => type === "await");

/**
 * Whether a node subtree contains a call or `new` / 子树是否含调用或 `new`
 *
 * @param node - The node or value / 节点或值
 * @returns Whether it contains a call or `new` / 是否含调用或 `new`
 */
const containsCall = (node: unknown): boolean =>
  walkContains(node, (type) => type === "call" || type === "new");

/**
 * Whether a node subtree contains control-flow altering statements / 子树是否含改变控制流的语句
 *
 * @param node - The node or value / 节点或值
 * @returns Whether it contains control flow / 是否含控制流
 */
const containsControlFlow = (node: unknown): boolean =>
  walkContains(
    node,
    (type) =>
      type === "return" ||
      type === "break" ||
      type === "continue" ||
      type === "throw" ||
      type === "try" ||
      type === "labeled",
  );

/**
 * Whether a statement can be evaluated synchronously inside an async body / 语句是否可在 async 体内同步求值
 *
 * @param stmt - The statement / 语句
 * @returns Whether it is safe to evaluate synchronously / 是否可安全同步求值
 */
const isSafeSyncStatement = (stmt: Statement): boolean =>
  !containsAwait(stmt) && !containsCall(stmt) && !containsControlFlow(stmt);

/**
 * Whether an expression can be evaluated synchronously inside an async body / 表达式是否可在 async 体内同步求值
 *
 * @param expr - The expression / 表达式
 * @returns Whether it is safe to evaluate synchronously / 是否可安全同步求值
 */
const isSafeSyncExpression = (expr: Expression): boolean =>
  !containsAwait(expr) && !containsCall(expr);

/**
 * Whether a value is a thenable (promise-like) / 值是否为 thenable（类 Promise）
 *
 * @param value - The value / 值
 * @returns Whether it is thenable / 是否为 thenable
 */
const isThenable = (value: unknown): boolean =>
  value != null &&
  (typeof value === "object" || typeof value === "function") &&
  typeof (value as { then?: unknown }).then === "function";

/**
 * Read a property, throwing the host-like `TypeError` on `null`/`undefined` receivers.
 *
 * 读取属性，对 `null`/`undefined` 接收者抛出宿主风格 `TypeError`。
 *
 * @param object - The receiver / 接收者
 * @param key - The property key / 属性键
 * @returns The property value / 属性值
 */
const getProperty = (object: unknown, key: PropertyKey): unknown => {
  if (object == null) {
    throw new TypeError(
      `Cannot read properties of ${typeof object === "object" ? "null" : "undefined"} (reading '${String(key)}')`,
    );
  }

  return (object as Record<PropertyKey, unknown>)[key];
};

/**
 * Write a property, throwing the host-like `TypeError` on `null`/`undefined` receivers.
 *
 * 写入属性，对 `null`/`undefined` 接收者抛出宿主风格 `TypeError`。
 *
 * @param object - The receiver / 接收者
 * @param key - The property key / 属性键
 * @param value - New value / 新值
 */
const setProperty = (object: unknown, key: PropertyKey, value: unknown): void => {
  if (object == null) {
    throw new TypeError(
      `Cannot set properties of ${typeof object === "object" ? "null" : "undefined"} (setting '${String(key)}')`,
    );
  }

  (object as Record<PropertyKey, unknown>)[key] = value;
};

/**
 * Apply a binary operator, delegating to the host operator.
 *
 * 应用二元运算符，委托宿主运算符。
 *
 * @param op - The operator / 运算符
 * @param left - Left operand / 左操作数
 * @param right - Right operand / 右操作数
 * @returns The result / 结果
 */
const binaryOp = (op: BinaryOperator, left: unknown, right: unknown): unknown => {
  switch (op) {
    case "==": {
      // eslint-disable-next-line eqeqeq -- abstract equality is delegated to the host
      return left == right;
    }
    case "!=": {
      // eslint-disable-next-line eqeqeq -- abstract inequality is delegated to the host
      return left != right;
    }
    case "===": {
      return left === right;
    }
    case "!==": {
      return left !== right;
    }
    case "<": {
      return (left as number) < (right as number);
    }
    case ">": {
      return (left as number) > (right as number);
    }
    case "<=": {
      return (left as number) <= (right as number);
    }
    case ">=": {
      return (left as number) >= (right as number);
    }
    case "<<": {
      // eslint-disable-next-line no-bitwise -- shift is the operator semantics
      return (left as number) << (right as number);
    }
    case ">>": {
      // eslint-disable-next-line no-bitwise -- shift is the operator semantics
      return (left as number) >> (right as number);
    }
    case ">>>": {
      // eslint-disable-next-line no-bitwise -- shift is the operator semantics
      return (left as number) >>> (right as number);
    }
    case "+": {
      return (left as number) + (right as number);
    }
    case "-": {
      return (left as number) - (right as number);
    }
    case "*": {
      return (left as number) * (right as number);
    }
    case "/": {
      return (left as number) / (right as number);
    }
    case "%": {
      return (left as number) % (right as number);
    }
    case "**": {
      return (left as number) ** (right as number);
    }
    case "|": {
      // eslint-disable-next-line no-bitwise -- bitwise OR is the operator semantics
      return (left as number) | (right as number);
    }
    case "^": {
      // eslint-disable-next-line no-bitwise -- bitwise XOR is the operator semantics
      return (left as number) ^ (right as number);
    }
    case "&": {
      // eslint-disable-next-line no-bitwise -- bitwise AND is the operator semantics
      return (left as number) & (right as number);
    }
    case "in": {
      return (left as PropertyKey) in (right as object);
    }
    case "instanceof": {
      return left instanceof (right as { [Symbol.hasInstance]: (value: unknown) => boolean });
    }
    default: {
      throw new Error("Unreachable operator");
    }
  }
};

/**
 * Analyze parameters, extracting simple identifier names (for sloppy `arguments` mapping).
 *
 * 分析参数，提取简单标识符名（供 sloppy `arguments` 映射）。
 *
 * @param params - Parameter patterns / 参数模式
 * @returns Simple identifier names, or `null` per non-simple parameter / 简单标识符名，非简单参数为 `null`
 */
const analyzeParams = (params: readonly Pattern[]): (string | null)[] =>
  params.map((param) => (param.type === "identifier" ? param.name : null));

/**
 * Create a fresh per-iteration environment copying bindings from `previous` (or `base` for the
 * first iteration), so `let` bindings in a loop body get fresh closures each iteration.
 *
 * 创建新的逐迭代环境，从 `previous`（首迭代从 `base`）复制绑定，使循环体内的 `let` 绑定每次迭代获得独立闭包。
 *
 * @param base - The loop environment holding the `let` declarations / 持有 `let` 声明的循环环境
 * @param previous - The previous iteration environment, or `null` for the first / 上一迭代环境，首迭代为
 *   `null`
 * @returns The fresh iteration environment / 新的迭代环境
 */
const freshIterationEnv = (base: Environment, previous: Environment | null): Environment => {
  const copy = new Environment(base, false);

  (previous ?? base).copyTo(copy);

  return copy;
};

/**
 * Bind the `arguments` object (with sloppy parameter mapping and `callee`).
 *
 * 绑定 `arguments` 对象（含 sloppy 参数映射与 `callee`）。
 *
 * @param meta - Function metadata / 函数元数据
 * @param args - Call arguments / 调用参数
 * @param env - The function environment / 函数环境
 */
const bindArguments = (meta: InterpreterFunctionMeta, args: unknown[], env: Environment): void => {
  const { simpleParamNames } = meta;
  const argsObject: Record<PropertyKey, unknown> = { length: args.length };
  const sloppy = meta.thisMode === "sloppy";

  if (sloppy && meta.callee != null) {
    Object.defineProperty(argsObject, "callee", {
      value: meta.callee,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  for (let i = 0; i < args.length; i += 1) {
    const paramName = i < simpleParamNames.length ? simpleParamNames[i] : null;

    if (sloppy && paramName != null) {
      Object.defineProperty(argsObject, i, {
        enumerable: true,
        configurable: true,
        get: (): unknown => env.get(paramName),
        set: (value: unknown): void => {
          env.set(paramName, value);
        },
      });
    } else {
      Object.defineProperty(argsObject, i, {
        value: args[i],
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  }

  env.define("arguments", argsObject);
};

/**
 * Get the host iterator of a value (host `Symbol.iterator` protocol).
 *
 * 获取值的宿主迭代器（宿主 `Symbol.iterator` 协议）。
 *
 * @param value - The iterable / 可迭代对象
 * @returns The iterator / 迭代器
 */
const iterate = (value: unknown): IterableIterator<unknown> => {
  if (value == null) {
    throw new TypeError(
      `Cannot read properties of ${typeof value === "object" ? "null" : "undefined"} (reading 'Symbol(Symbol.iterator)')`,
    );
  }

  const method = (value as { [Symbol.iterator]?: unknown })[Symbol.iterator];

  if (typeof method !== "function") throw new TypeError(`${typeOf(value)} is not iterable`);

  return (method as (this: unknown) => IterableIterator<unknown>).call(value);
};

/** Accessor descriptor group for getter/setter pairs / getter/setter 对的访问器描述符组 */
interface AccessorEntry {
  get?: InterpreterFunction;
  set?: InterpreterFunction;
}

/** Map of accessor entries per property key / 每个属性键的访问器条目映射 */
type AccessorMap = Map<string | symbol, AccessorEntry>;

/** Map of accessor maps per target object / 每个目标对象的访问器映射 */
type AccessorGroups = Map<object, AccessorMap>;

/**
 * Get (or create) the accessor map for a target object.
 *
 * 获取（或创建）目标对象的访问器映射。
 *
 * @param groups - The accessor groups / 访问器分组
 * @param target - The target object / 目标对象
 * @returns The accessor map / 访问器映射
 */
const getAccessorGroup = (groups: AccessorGroups, target: object): AccessorMap => {
  let group = groups.get(target);

  if (group == null) {
    group = new Map();
    groups.set(target, group);
  }

  return group;
};

/** Signal thrown by `return` / `return` 抛出的信号 */
class ReturnSignalError extends Error {
  constructor(public readonly value: unknown) {
    super("return");
    this.name = "ReturnSignalError";
  }
}

/** Signal thrown by `break` / `break` 抛出的信号 */
class BreakSignalError extends Error {
  constructor(public readonly label: string | null) {
    super("break");
    this.name = "BreakSignalError";
  }
}

/** Signal thrown by `continue` / `continue` 抛出的信号 */
class ContinueSignalError extends Error {
  constructor(public readonly label: string | null) {
    super("continue");
    this.name = "ContinueSignalError";
  }
}

/** Signal wrapping a user `throw` value / 包装用户 `throw` 值的信号 */
class ThrowSignalError extends Error {
  constructor(public readonly value: unknown) {
    super("throw");
    this.name = "ThrowSignalError";
  }
}

/** A single execution context (per function call) / 单个执行上下文（每次函数调用一个） */
interface RuntimeContext {
  /**
   * Shared `this` cell — derived constructors share it through the `super()` chain / 共享的 `this`
   * 单元——派生构造器经 `super()` 链共享
   */
  readonly thisRef: { value: unknown };

  /** Base object for `super.x` (`null` outside class methods) / `super.x` 的基准对象（类方法外为 `null`） */
  readonly superBase: object | null;

  /**
   * Parent constructor for `super()` (`null` outside derived constructors) / `super()`
   * 的父构造器（派生构造器外为 `null`）
   */
  readonly superClass: unknown;

  /**
   * The constructor originally invoked via `new` (drives the instance prototype) / 最初经 `new`
   * 调用的构造器（决定实例原型）
   */
  readonly newTargetMeta: InterpreterFunctionMeta | null;

  /** Whether this call is a construction / 本次调用是否为构造 */
  readonly isConstruct: boolean;
}

/**
 * The interpreter runtime: owns the sandbox global, evaluates a `Program` and manages function
 * calls with `this`/`new`/`super` semantics.
 *
 * 解释器运行时：持有沙箱全局，求值 `Program` 并管理带 `this`/`new`/`super` 语义的函数调用。
 */
export class Runtime {
  /** Feature toggles / 特性开关 */
  readonly features: FeatureOptions;

  /** Whether the program runs in strict mode / 是否严格模式 */
  readonly strict: boolean;

  /** Max steps before aborting / 步数上限 */
  readonly maxSteps: number;

  /** Max call stack depth before aborting / 调用栈深度上限 */
  readonly maxStack: number;

  /** The sandbox global object (a plain host object) / 沙箱全局对象（普通宿主对象） */
  readonly globalObject: Record<PropertyKey, unknown>;

  /** The global lexical environment / 全局词法环境 */
  readonly globalEnv: Environment;

  /** Executed step count / 已执行步数 */
  stepCount = 0;

  /** Current call stack depth / 当前调用栈深度 */
  stackDepth = 0;

  /**
   * Pending async operation count — extension point for the future async round / 挂起的 async 操作计数——后续
   * async 轮次的扩展点
   */
  asyncCount = 0;

  /** Execution context stack / 执行上下文栈 */
  private readonly contextStack: RuntimeContext[] = [];

  /** Routing callback passed to interpreter function wrappers / 传给解释器函数包装的路由回调 */
  private readonly invokeHandler: InterpreterInvoke;

  /** @param options - Runtime options / 运行时选项 */
  constructor(options: RuntimeOptions = {}) {
    this.features = {
      class: options.features?.class ?? DEFAULT_FEATURES.class,
      forOf: options.features?.forOf ?? DEFAULT_FEATURES.forOf,
      async: options.features?.async ?? DEFAULT_FEATURES.async,
      bigint: options.features?.bigint ?? DEFAULT_FEATURES.bigint,
    };
    this.strict = options.strict ?? false;
    this.maxSteps = options.maxSteps ?? 1_000_000;
    this.maxStack = options.maxStack ?? 512;

    this.globalObject = {};
    this.globalEnv = new Environment(null, true, this.globalObject);

    this.installBuiltins();

    if (options.globals != null) {
      for (const [name, value] of Object.entries(options.globals))
        this.globalEnv.define(name, value);
    }

    this.invokeHandler = (meta, args, thisArg, constructed): unknown =>
      this.invokeFunction(meta, args, thisArg, constructed);
  }

  /**
   * Execute a parsed program and return its completion value.
   *
   * 执行已解析的 program 并返回其完成值。
   *
   * @param program - The parsed program / 已解析的 program
   * @returns The completion value (value of the last expression statement) / 完成值（最后一条表达式语句的值）
   */
  run(program: Program): unknown {
    this.stepCount = 0;
    this.stackDepth = 0;
    this.contextStack.length = 0;
    this.contextStack.push({
      thisRef: { value: this.strict ? void 0 : this.globalObject },
      superBase: null,
      superClass: null,
      newTargetMeta: null,
      isConstruct: false,
    });

    try {
      this.hoistProgram(program.body, this.globalEnv);

      let completion: unknown = void 0;

      try {
        for (const stmt of program.body) completion = this.evalStatement(stmt, this.globalEnv);
      } catch (err) {
        // unwrap the user's thrown value at the top-level boundary
        // 在顶层边界解包用户抛出的值
        if (err instanceof ThrowSignalError) throw err.value;
        throw err;
      }

      return completion;
    } finally {
      this.contextStack.length = 0;
    }
  }

  /**
   * Read a global variable.
   *
   * 读取全局变量。
   *
   * @param name - Variable name / 变量名
   * @returns The value / 值
   */
  getGlobal(name: string): unknown {
    return this.globalEnv.get(name);
  }

  /**
   * Set a global variable (also visible on `globalThis`).
   *
   * 设置全局变量（同时可见于 `globalThis`）。
   *
   * @param name - Variable name / 变量名
   * @param value - New value / 新值
   */
  setGlobal(name: string, value: unknown): void {
    this.globalEnv.define(name, value);
  }

  /**
   * Call an interpreter function (used by host callbacks via the wrapper, and internally).
   *
   * 调用解释器函数（宿主回调经包装调用，亦用于内部）。
   *
   * @param meta - Function metadata / 函数元数据
   * @param args - Call arguments / 调用参数
   * @param thisArg - The `this` value / `this` 值
   * @returns The call result / 调用结果
   */
  callFunction(meta: InterpreterFunctionMeta, args: unknown[], thisArg: unknown): unknown {
    return this.invokeFunction(meta, args, thisArg, false);
  }

  /**
   * Construct an object from an interpreter function (`new` semantics).
   *
   * 以 `new` 语义从解释器函数构造对象。
   *
   * @param meta - Function metadata / 函数元数据
   * @param args - Constructor arguments / 构造参数
   * @returns The constructed object / 构造出的对象
   */
  constructFunction(meta: InterpreterFunctionMeta, args: unknown[]): unknown {
    return this.invokeFunction(meta, args, void 0, true);
  }

  // -------------------------------------------------------------------------
  // Step / stack accounting
  // -------------------------------------------------------------------------

  /**
   * Count one execution step, aborting past `maxSteps`.
   *
   * 计数一次执行步骤，超过 `maxSteps` 时中止。
   */
  private step(): void {
    this.stepCount += 1;

    if (this.stepCount > this.maxSteps)
      throw new Error(`Execution aborted: exceeded ${this.maxSteps} steps`);
  }

  // -------------------------------------------------------------------------
  // Execution context helpers
  // -------------------------------------------------------------------------

  /**
   * Get the current execution context, or `null` outside any call.
   *
   * 获取当前执行上下文，任何调用之外为 `null`。
   *
   * @returns The current context or `null` / 当前上下文或 `null`
   */
  private currentContext(): RuntimeContext | null {
    return this.contextStack[this.contextStack.length - 1] ?? null;
  }

  // -------------------------------------------------------------------------
  // Builtins
  // -------------------------------------------------------------------------

  /** Install the minimal host-delegated builtins onto the sandbox global. */
  private installBuiltins(): void {
    const builtins: [string, unknown][] = [
      ["undefined", void 0],
      ["NaN", Number.NaN],
      ["Infinity", Infinity],
      ["globalThis", this.globalObject],
      ["parseInt", parseInt],
      ["parseFloat", parseFloat],
      ["isNaN", isNaN],
      ["isFinite", isFinite],
      ["Object", Object],
      ["Array", Array],
      ["String", String],
      ["Number", Number],
      ["Boolean", Boolean],
      ["Math", Math],
      ["JSON", JSON],
      ["RegExp", RegExp],
      ["Date", Date],
      ["Error", Error],
      ["TypeError", TypeError],
      ["ReferenceError", ReferenceError],
      ["SyntaxError", SyntaxError],
      ["RangeError", RangeError],
      ["EvalError", EvalError],
      ["URIError", URIError],
      ["Symbol", Symbol],
      ["BigInt", BigInt],
      ["Map", Map],
      ["Set", Set],
      ["WeakMap", WeakMap],
      ["WeakSet", WeakSet],
      ["Reflect", Reflect],
      ["Promise", Promise],
      ["encodeURI", encodeURI],
      ["decodeURI", decodeURI],
      ["encodeURIComponent", encodeURIComponent],
      ["decodeURIComponent", decodeURIComponent],
      // legacy globals required by the ES5 builtins list (design doc §5.2)
      // ES5 内建清单要求的遗留全局（设计文档 §5.2）
      /* oxlint-disable-next-line typescript/no-deprecated -- legacy global required by ES5 */
      ["escape", escape],
      /* oxlint-disable-next-line typescript/no-deprecated -- legacy global required by ES5 */
      ["unescape", unescape],
      ["ArrayBuffer", ArrayBuffer],
      ["DataView", DataView],
      ["Int8Array", Int8Array],
      ["Uint8Array", Uint8Array],
      ["Uint8ClampedArray", Uint8ClampedArray],
      ["Int16Array", Int16Array],
      ["Uint16Array", Uint16Array],
      ["Int32Array", Int32Array],
      ["Uint32Array", Uint32Array],
      ["Float32Array", Float32Array],
      ["Float64Array", Float64Array],
    ];

    for (const [name, value] of builtins) this.globalEnv.define(name, value);
  }

  // -------------------------------------------------------------------------
  // Statements
  // -------------------------------------------------------------------------

  /**
   * Evaluate a single statement.
   *
   * 求值单条语句。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @returns The completion value (only meaningful for expression/block/if) / 完成值（仅表达式/块/if 有意义）
   */
  private evalStatement(stmt: Statement, env: Environment): unknown {
    this.step();

    switch (stmt.type) {
      case "expression": {
        return this.evalExpression(stmt.expression, env);
      }
      case "block": {
        return this.evalBlock(stmt, env);
      }
      case "empty":
      case "debugger": {
        return void 0;
      }
      case "variable": {
        this.evalVariable(stmt, env);

        return void 0;
      }
      case "functionDeclaration": {
        // hoisted during function entry; nothing to do here
        // 已在函数入口提升；此处无需处理
        return void 0;
      }
      case "classDeclaration": {
        this.evalClassDeclaration(stmt, env);

        return void 0;
      }
      case "if": {
        return this.evalIf(stmt, env);
      }
      case "while": {
        this.evalWhile(stmt, env);

        return void 0;
      }
      case "doWhile": {
        this.evalDoWhile(stmt, env);

        return void 0;
      }
      case "for": {
        this.evalFor(stmt, env);

        return void 0;
      }
      case "forIn": {
        this.evalForIn(stmt, env);

        return void 0;
      }
      case "forOf": {
        this.evalForOf(stmt, env);

        return void 0;
      }
      case "switch": {
        this.evalSwitch(stmt, env);

        return void 0;
      }
      case "try": {
        this.evalTry(stmt, env);

        return void 0;
      }
      case "throw": {
        throw new ThrowSignalError(this.evalExpression(stmt.argument, env));
      }
      case "return": {
        throw new ReturnSignalError(
          stmt.argument == null ? void 0 : this.evalExpression(stmt.argument, env),
        );
      }
      case "break": {
        throw new BreakSignalError(stmt.label);
      }
      case "continue": {
        throw new ContinueSignalError(stmt.label);
      }
      case "labeled": {
        this.evalLabeled(stmt, env);

        return void 0;
      }
      default: {
        throw new Error("Unreachable statement");
      }
    }
  }

  /**
   * Evaluate a block in a fresh block environment.
   *
   * 在新的块环境中求值块。
   *
   * @param block - The block / 块
   * @param parentEnv - Parent environment / 父环境
   * @returns The completion value of the last statement / 最后一条语句的完成值
   */
  private evalBlock(block: BlockStatement, parentEnv: Environment): unknown {
    const env = new Environment(parentEnv, false);
    let completion: unknown = void 0;

    for (const stmt of block.body) completion = this.evalStatement(stmt, env);

    return completion;
  }

  /**
   * Evaluate a variable declaration (`var`/`let`/`const`), handling destructuring and TDZ.
   *
   * 求值变量声明（`var`/`let`/`const`），处理解构与 TDZ。
   *
   * @param stmt - The declaration / 声明
   * @param env - Current environment / 当前环境
   */
  private evalVariable(stmt: VariableDeclaration, env: Environment): void {
    if (stmt.kind === "var") {
      // names are hoisted at function entry; only run the initializers here
      // 名称已在函数入口提升；这里只执行初始化器
      for (const decl of stmt.declarations)
        if (decl.init != null) this.assignTo(decl.id, this.evalExpression(decl.init, env), env);

      return;
    }

    // `let`/`const`: declare all names first (TDZ), then evaluate initializers
    // `let`/`const`：先声明全部名称（TDZ），再求值初始化器
    for (const decl of stmt.declarations) this.declarePattern(decl.id, env, stmt.kind);

    for (const decl of stmt.declarations) {
      const value = decl.init == null ? void 0 : this.evalExpression(decl.init, env);

      this.assignTo(decl.id, value, env, true);
    }
  }

  /**
   * Evaluate an `if` statement.
   *
   * 求值 `if` 语句。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @returns The completion value of the taken branch / 所走分支的完成值
   */
  private evalIf(stmt: IfStatement, env: Environment): unknown {
    if (toBoolean(this.evalExpression(stmt.test, env)))
      return this.evalStatement(stmt.consequent, env);

    return stmt.alternate == null ? void 0 : this.evalStatement(stmt.alternate, env);
  }

  /**
   * Evaluate a `while` loop.
   *
   * 求值 `while` 循环。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label, when this loop is a labeled statement / 外层标签（本循环是标签语句时）
   */
  private evalWhile(stmt: WhileStatement, env: Environment, label: string | null = null): void {
    while (toBoolean(this.evalExpression(stmt.test, env))) {
      try {
        this.evalStatement(stmt.body, env);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label))
          continue;
        if (err instanceof BreakSignalError && (err.label == null || err.label === label)) break;
        throw err;
      }
    }
  }

  /**
   * Evaluate a `do...while` loop.
   *
   * 求值 `do...while` 循环。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label, when this loop is a labeled statement / 外层标签（本循环是标签语句时）
   */
  private evalDoWhile(stmt: DoWhileStatement, env: Environment, label: string | null = null): void {
    for (;;) {
      try {
        this.evalStatement(stmt.body, env);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label)) {
          // continue: re-check the test below
          // continue：重新检查下方的 test
        } else if (err instanceof BreakSignalError && (err.label == null || err.label === label)) {
          return;
        } else {
          throw err;
        }
      }

      if (!toBoolean(this.evalExpression(stmt.test, env))) return;
    }
  }

  /**
   * Evaluate a classic `for` loop, giving `let` bindings per-iteration semantics.
   *
   * 求值经典 `for` 循环，为 `let` 绑定提供逐迭代语义。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label, when this loop is a labeled statement / 外层标签（本循环是标签语句时）
   */
  private evalFor(stmt: ForStatement, env: Environment, label: string | null = null): void {
    let baseEnv = env;
    let hasBinding = false;

    if (stmt.init != null) {
      if (stmt.init.type === "variable") {
        if (stmt.init.kind === "var") {
          this.evalVariable(stmt.init, env);
        } else {
          baseEnv = new Environment(env, false);
          hasBinding = true;
          this.evalVariable(stmt.init, baseEnv);
        }
      } else {
        this.evalExpression(stmt.init, env);
      }
    }

    let previous: Environment | null = null;

    for (;;) {
      const iterEnv: Environment = hasBinding ? freshIterationEnv(baseEnv, previous) : baseEnv;

      if (stmt.test != null && !toBoolean(this.evalExpression(stmt.test, iterEnv))) return;

      try {
        this.evalStatement(stmt.body, iterEnv);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label)) {
          // continue: run the update below
          // continue：执行下方的 update
        } else if (err instanceof BreakSignalError && (err.label == null || err.label === label)) {
          return;
        } else {
          throw err;
        }
      }

      if (stmt.update == null) {
        previous = hasBinding ? iterEnv : null;
      } else if (hasBinding) {
        // the update runs in the NEXT iteration's fresh environment, so closures created in
        // this iteration's body keep the pre-update binding (per-iteration semantics)
        // update 在下一迭代的新环境中执行，使本迭代闭包保留更新前的绑定（逐迭代语义）
        const nextEnv = freshIterationEnv(baseEnv, iterEnv);

        previous = nextEnv;
        this.evalExpression(stmt.update, nextEnv);
      } else {
        this.evalExpression(stmt.update, iterEnv);
      }
    }
  }

  /**
   * Declare a `let`/`const` binding for `for...in`/`for...of` heads (initialized to `undefined`,
   * the key/value is assigned before any body access).
   *
   * 为 `for...in`/`for...of` 头部声明 `let`/`const` 绑定（先初始化为 `undefined`，键/值在访问前已赋值）。
   *
   * @param pattern - The binding pattern / 绑定模式
   * @param env - The loop environment / 循环环境
   * @param kind - Declaration kind / 声明类型
   */
  private declareForLoopBinding(pattern: Pattern, env: Environment, kind: "let" | "const"): void {
    const names: string[] = [];

    this.collectNames(pattern, names);

    for (const name of names) {
      if (kind === "const") env.declareConst(name);
      else env.declareLet(name);

      env.initialize(name, void 0);
    }
  }

  /**
   * Evaluate a `for...in` loop.
   *
   * 求值 `for...in` 循环。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label, when this loop is a labeled statement / 外层标签（本循环是标签语句时）
   */
  private evalForIn(stmt: ForInStatement, env: Environment, label: string | null = null): void {
    const right = this.evalExpression(stmt.right, env);

    if (right == null) throw new TypeError("Cannot convert undefined or null to object");

    // oxlint-disable-next-line unicorn/new-for-builtins -- ToObject conversion
    const obj = Object(right) as Record<PropertyKey, unknown>;

    let baseEnv = env;
    let hasBinding = false;

    if (stmt.left.type === "variable" && stmt.left.kind !== "var") {
      baseEnv = new Environment(env, false);
      hasBinding = true;
      this.declareForLoopBinding(stmt.left.declarations[0].id, baseEnv, stmt.left.kind);
    }

    const keys: string[] = [];

    // oxlint-disable-next-line guard-for-in -- for...in intentionally includes inherited keys
    for (const key in obj) keys.push(key);

    let previous: Environment | null = null;

    for (const key of keys) {
      const iterEnv: Environment = hasBinding ? freshIterationEnv(baseEnv, previous) : env;
      previous = hasBinding ? iterEnv : null;

      if (stmt.left.type === "variable") {
        if (stmt.left.kind === "var") this.assignTo(stmt.left.declarations[0].id, key, iterEnv);
        else this.assignTo(stmt.left.declarations[0].id, key, iterEnv, true);
      } else {
        this.assignTo(stmt.left, key, iterEnv);
      }

      try {
        this.evalStatement(stmt.body, iterEnv);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label))
          continue;
        if (err instanceof BreakSignalError && (err.label == null || err.label === label)) break;
        throw err;
      }
    }
  }

  /**
   * Evaluate a `for...of` loop (host iterator protocol).
   *
   * 求值 `for...of` 循环（宿主迭代协议）。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label, when this loop is a labeled statement / 外层标签（本循环是标签语句时）
   */
  private evalForOf(stmt: ForOfStatement, env: Environment, label: string | null = null): void {
    const iterator = iterate(this.evalExpression(stmt.right, env));

    let baseEnv = env;
    let hasBinding = false;

    if (stmt.left.type === "variable" && stmt.left.kind !== "var") {
      baseEnv = new Environment(env, false);
      hasBinding = true;
      this.declareForLoopBinding(stmt.left.declarations[0].id, baseEnv, stmt.left.kind);
    }

    let previous: Environment | null = null;

    for (;;) {
      const step = iterator.next();

      if (step.done) return;

      const iterEnv: Environment = hasBinding ? freshIterationEnv(baseEnv, previous) : env;
      previous = hasBinding ? iterEnv : null;

      if (stmt.left.type === "variable") {
        if (stmt.left.kind === "var")
          this.assignTo(stmt.left.declarations[0].id, step.value, iterEnv);
        else this.assignTo(stmt.left.declarations[0].id, step.value, iterEnv, true);
      } else {
        this.assignTo(stmt.left, step.value, iterEnv);
      }

      try {
        this.evalStatement(stmt.body, iterEnv);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label))
          continue;
        if (err instanceof BreakSignalError && (err.label == null || err.label === label)) break;
        throw err;
      }
    }
  }

  /**
   * Evaluate a `switch` statement with fall-through.
   *
   * 求值带 fall-through 的 `switch` 语句。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   */
  private evalSwitch(stmt: SwitchStatement, env: Environment): void {
    const discriminant = this.evalExpression(stmt.discriminant, env);
    let index = -1;

    for (let i = 0; i < stmt.cases.length; i += 1) {
      const caseNode = stmt.cases[i];

      if (caseNode.test == null) continue;

      if (this.evalExpression(caseNode.test, env) === discriminant) {
        index = i;
        break;
      }
    }

    if (index < 0) {
      for (let i = 0; i < stmt.cases.length; i += 1) {
        if (stmt.cases[i].test == null) {
          index = i;
          break;
        }
      }
    }

    if (index < 0) return;

    for (let i = index; i < stmt.cases.length; i += 1) {
      try {
        for (const st of stmt.cases[i].body) this.evalStatement(st, env);
      } catch (err) {
        if (err instanceof BreakSignalError && err.label == null) return;
        throw err;
      }
    }
  }

  /**
   * Evaluate a `try`/`catch`/`finally` statement.
   *
   * 求值 `try`/`catch`/`finally` 语句。
   *
   * Control signals (`return`/`break`/`continue`) pass through the handler untouched; the finalizer
   * always runs and its own completion overrides any pending one.
   *
   * 控制信号（`return`/`break`/`continue`）不经过 handler 直接透传；finalizer 总是执行，其自身的完成值覆盖挂起值。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   */
  private evalTry(stmt: TryStatement, env: Environment): void {
    let pending: unknown = null;

    try {
      try {
        this.evalBlock(stmt.block, env);
      } catch (err) {
        if (
          err instanceof ReturnSignalError ||
          err instanceof BreakSignalError ||
          err instanceof ContinueSignalError
        )
          throw err;

        if (stmt.handler == null) {
          throw err;
        } else {
          const catchEnv = new Environment(env, false);

          if (stmt.handler.param != null) {
            const value = err instanceof ThrowSignalError ? err.value : err;

            this.declarePattern(stmt.handler.param, catchEnv, "let");
            this.assignTo(stmt.handler.param, value, catchEnv, true);
          }

          this.evalBlock(stmt.handler.body, catchEnv);
        }
      }
    } catch (err) {
      pending = err;
    }

    if (stmt.finalizer != null) this.evalBlock(stmt.finalizer, env);

    if (pending != null) throw pending as Error;
  }

  /**
   * Evaluate a labeled statement, resolving `break label` / `continue label`.
   *
   * 求值标签语句，解析 `break label` / `continue label`。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   */
  private evalLabeled(stmt: LabeledStatement, env: Environment): void {
    try {
      this.evalStatementWithLabel(stmt.body, env, stmt.label);
    } catch (err) {
      if (err instanceof BreakSignalError && err.label === stmt.label) return;
      throw err;
    }
  }

  /**
   * Evaluate a statement that is directly labeled, forwarding the label to loops so that `continue
   * label` / `break label` are resolved by the loop itself.
   *
   * 求值被直接标签化的语句，将标签转发给循环，使 `continue label` / `break label` 由循环自身解析。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - The enclosing label / 外层标签
   */
  private evalStatementWithLabel(stmt: Statement, env: Environment, label: string): void {
    switch (stmt.type) {
      case "while": {
        this.evalWhile(stmt, env, label);
        break;
      }
      case "doWhile": {
        this.evalDoWhile(stmt, env, label);
        break;
      }
      case "for": {
        this.evalFor(stmt, env, label);
        break;
      }
      case "forIn": {
        this.evalForIn(stmt, env, label);
        break;
      }
      case "forOf": {
        this.evalForOf(stmt, env, label);
        break;
      }
      default: {
        this.evalStatement(stmt, env);
        break;
      }
    }
  }

  /**
   * Evaluate a class declaration, binding its name with `let` semantics.
   *
   * 求值类声明，以 `let` 语义绑定类名。
   *
   * @param stmt - The declaration / 声明
   * @param env - Current environment / 当前环境
   */
  private evalClassDeclaration(stmt: ClassDeclaration, env: Environment): void {
    const ctor = this.evalClass(stmt.name, stmt.superClass, stmt.body, env);

    env.declareLet(stmt.name);
    env.initialize(stmt.name, ctor);
  }

  // -------------------------------------------------------------------------
  // Hoisting
  // -------------------------------------------------------------------------

  /**
   * Hoist top-level `var` names and function declarations into `env`.
   *
   * 将顶层 `var` 名称与函数声明提升到 `env`。
   *
   * @param statements - Program body / program 主体
   * @param env - Global environment / 全局环境
   */
  private hoistProgram(statements: readonly Statement[], env: Environment): void {
    this.hoistStatements(statements, env);
  }

  /**
   * Recursively hoist `var` names and function declarations (not entering nested functions or
   * classes) into the function scope.
   *
   * 递归地将 `var` 名称与函数声明提升到函数作用域（不进入嵌套函数或类）。
   *
   * @param statements - Statements to scan / 待扫描的语句
   * @param env - The function environment / 函数环境
   */
  private hoistStatements(statements: readonly Statement[], env: Environment): void {
    for (const stmt of statements) {
      switch (stmt.type) {
        case "variable": {
          if (stmt.kind === "var")
            for (const decl of stmt.declarations) this.hoistVar(decl.id, env);
          break;
        }
        case "functionDeclaration": {
          const fn = this.createFunction({
            name: stmt.name,
            params: stmt.params,
            body: stmt.body,
            closure: env,
            thisMode: this.strict ? "strict" : "sloppy",
            isAsync: stmt.isAsync,
            prototype: null,
            superBase: null,
          });

          env.declareVar(stmt.name);
          env.set(stmt.name, fn);
          break;
        }
        case "block": {
          this.hoistStatements(stmt.body, env);
          break;
        }
        case "if": {
          this.hoistStatements([stmt.consequent], env);
          if (stmt.alternate != null) this.hoistStatements([stmt.alternate], env);
          break;
        }
        case "while":
        case "doWhile": {
          this.hoistStatements([stmt.body], env);
          break;
        }
        case "for": {
          if (stmt.init != null && stmt.init.type === "variable" && stmt.init.kind === "var")
            for (const decl of stmt.init.declarations) this.hoistVar(decl.id, env);
          this.hoistStatements([stmt.body], env);
          break;
        }
        case "forIn":
        case "forOf": {
          if (stmt.left.type === "variable" && stmt.left.kind === "var")
            for (const decl of stmt.left.declarations) this.hoistVar(decl.id, env);
          this.hoistStatements([stmt.body], env);
          break;
        }
        case "switch": {
          for (const caseNode of stmt.cases) this.hoistStatements(caseNode.body, env);
          break;
        }
        case "try": {
          this.hoistStatements(stmt.block.body, env);
          if (stmt.handler != null) this.hoistStatements(stmt.handler.body.body, env);
          if (stmt.finalizer != null) this.hoistStatements(stmt.finalizer.body, env);
          break;
        }
        case "labeled": {
          this.hoistStatements([stmt.body], env);
          break;
        }
        default: {
          break;
        }
      }
    }
  }

  /**
   * Hoist the `var` names of a binding pattern into the function scope.
   *
   * 将绑定模式中的 `var` 名称提升到函数作用域。
   *
   * @param pattern - The binding pattern / 绑定模式
   * @param env - Current environment / 当前环境
   */
  private hoistVar(pattern: Pattern, env: Environment): void {
    const names: string[] = [];

    this.collectNames(pattern, names);

    for (const name of names) env.declareVar(name);
  }

  /**
   * Collect all identifier names bound by a pattern.
   *
   * 收集模式绑定的全部标识符名称。
   *
   * @param pattern - The pattern / 模式
   * @param out - Names collected so far / 已收集的名称
   */
  private collectNames(pattern: AssignmentTarget, out: string[]): void {
    switch (pattern.type) {
      case "identifier": {
        out.push(pattern.name);
        break;
      }
      case "objectPattern": {
        for (const prop of pattern.props)
          if (prop.value != null) this.collectNames(prop.value, out);
        if (pattern.rest != null) this.collectNames(pattern.rest.argument, out);
        break;
      }
      case "arrayPattern": {
        for (const element of pattern.elements) {
          if (element == null) continue;

          if (element.type === "rest") this.collectNames(element.argument, out);
          else this.collectNames(element, out);
        }
        break;
      }
      case "assignmentPattern": {
        this.collectNames(pattern.left, out);
        break;
      }
      case "rest": {
        this.collectNames(pattern.argument, out);
        break;
      }
      case "member":
      case "call": {
        // member/call targets never appear in declarations / 声明中不会出现成员/调用目标
        break;
      }
      default: {
        break;
      }
    }
  }

  /**
   * Declare a `let`/`const` binding pattern (with TDZ sentinels).
   *
   * 声明 `let`/`const` 绑定模式（带 TDZ 哨兵）。
   *
   * @param pattern - The binding pattern / 绑定模式
   * @param env - Current environment / 当前环境
   * @param kind - Declaration kind / 声明类型
   */
  private declarePattern(pattern: Pattern, env: Environment, kind: "let" | "const"): void {
    const names: string[] = [];

    this.collectNames(pattern, names);

    for (const name of names) {
      if (kind === "const") env.declareConst(name);
      else env.declareLet(name);
    }
  }

  // -------------------------------------------------------------------------
  // Assignment
  // -------------------------------------------------------------------------

  /**
   * Assign a value to an assignment target (identifier, member, or a destructuring pattern).
   *
   * 将值赋给赋值目标（标识符、成员或解构模式）。
   *
   * @param target - The target / 目标
   * @param value - The value / 值
   * @param env - Current environment / 当前环境
   * @param initialize - Whether this is a `let`/`const` initializer (releases TDZ) / 是否为
   *   `let`/`const` 初始化（解除 TDZ）
   */
  private assignTo(
    target: AssignmentTarget,
    value: unknown,
    env: Environment,
    initialize = false,
  ): void {
    switch (target.type) {
      case "identifier": {
        if (initialize) {
          env.initialize(target.name, value);
        } else if (!env.set(target.name, value)) {
          // sloppy: writing an undeclared name creates a global; strict: error
          // sloppy：写入未声明名称创建全局；strict：抛错
          if (this.strict) throw new ReferenceError(`${target.name} is not defined`);
          this.globalEnv.define(target.name, value);
        }
        break;
      }
      case "member": {
        const { object, key } = this.evalMemberRef(target, env);

        setProperty(object, key, value);
        break;
      }
      case "call": {
        throw new TypeError("Invalid assignment target");
      }
      case "arrayPattern": {
        this.assignToArray(target, value, env, initialize);
        break;
      }
      case "objectPattern": {
        this.assignToObject(target, value, env, initialize);
        break;
      }
      case "assignmentPattern": {
        if (isUndefined(value))
          this.assignTo(target.left, this.evalExpression(target.right, env), env, initialize);
        else this.assignTo(target.left, value, env, initialize);
        break;
      }
      case "rest": {
        this.assignTo(target.argument, value, env, initialize);
        break;
      }
      default: {
        throw new Error("Unreachable pattern");
      }
    }
  }

  /**
   * Destructure an array pattern (with elisions, defaults and rest).
   *
   * 解构数组模式（含空位、默认值与 rest）。
   *
   * @param target - The array pattern / 数组模式
   * @param value - The iterable value / 可迭代值
   * @param env - Current environment / 当前环境
   * @param initialize - Whether this is a `let`/`const` initializer / 是否为 `let`/`const` 初始化
   */
  private assignToArray(
    target: ArrayPattern,
    value: unknown,
    env: Environment,
    initialize: boolean,
  ): void {
    if (value == null) {
      throw new TypeError(
        `Cannot destructure '${typeof value === "object" ? "null" : "undefined"}'`,
      );
    }

    const iterator = iterate(value);

    for (const element of target.elements) {
      if (element == null) {
        iterator.next();
        continue;
      }

      if (element.type === "rest") {
        const rest: unknown[] = [];

        for (;;) {
          const step = iterator.next();

          if (step.done) break;
          rest.push(step.value);
        }

        this.assignTo(element.argument, rest, env, initialize);
        break;
      }

      const step = iterator.next();

      this.assignTo(element, step.done ? void 0 : step.value, env, initialize);
    }
  }

  /**
   * Destructure an object pattern (with computed keys, defaults and rest).
   *
   * 解构对象模式（含计算键、默认值与 rest）。
   *
   * @param target - The object pattern / 对象模式
   * @param value - The source value / 源值
   * @param env - Current environment / 当前环境
   * @param initialize - Whether this is a `let`/`const` initializer / 是否为 `let`/`const` 初始化
   */
  private assignToObject(
    target: ObjectPattern,
    value: unknown,
    env: Environment,
    initialize: boolean,
  ): void {
    if (value == null) {
      throw new TypeError(
        `Cannot destructure '${typeof value === "object" ? "null" : "undefined"}'`,
      );
    }

    // oxlint-disable-next-line unicorn/new-for-builtins -- ToObject conversion
    const source = Object(value) as Record<PropertyKey, unknown>;
    const taken = new Set<string>();

    for (const prop of target.props) {
      const key = prop.computed
        ? toPropertyKey(this.evalExpression(prop.key as Expression, env))
        : (prop.key as string);

      if (typeof key === "string") taken.add(key);
      if (prop.value != null) this.assignTo(prop.value, source[key], env, initialize);
    }

    if (target.rest != null) {
      const rest: Record<string, unknown> = {};

      for (const key of Object.keys(source)) if (!taken.has(key)) rest[key] = source[key];

      this.assignTo(target.rest.argument, rest, env, initialize);
    }
  }

  /**
   * Read the current value of an assignment target (for compound/update operators).
   *
   * 读取赋值目标的当前值（用于复合/更新运算符）。
   *
   * @param target - The target / 目标
   * @param env - Current environment / 当前环境
   * @returns The current value / 当前值
   */
  private readTarget(target: AssignmentTarget, env: Environment): unknown {
    if (target.type === "identifier") return env.get(target.name);

    if (target.type === "member") {
      if (target.object.type === "super") {
        const ctx = this.currentContext();

        if (ctx == null || ctx.superBase == null)
          throw new ReferenceError("'super' keyword unexpected here");

        const key = target.computed
          ? toPropertyKey(this.evalExpression(target.property as Expression, env))
          : (target.property as string);

        return getProperty(ctx.superBase, key);
      }

      const object = this.evalExpression(target.object, env);
      const key = target.computed
        ? toPropertyKey(this.evalExpression(target.property as Expression, env))
        : (target.property as string);

      return getProperty(object, key);
    }

    throw new TypeError("Invalid assignment target");
  }

  /**
   * Evaluate the `object`/`key` of a member target for writing.
   *
   * 求值写入目标的 `object`/`key`。
   *
   * For `super.x = v`, the receiver (current `this`) is the write target.
   *
   * 对 `super.x = v`，接收者（当前 `this`）为写入目标。
   *
   * @param node - The member expression / 成员表达式
   * @param env - Current environment / 当前环境
   * @returns The object and key / 对象与键
   */
  private evalMemberRef(node: MemberExpr, env: Environment): { object: unknown; key: PropertyKey } {
    if (node.object.type === "super") {
      const ctx = this.currentContext();

      if (ctx == null || ctx.superBase == null)
        throw new ReferenceError("'super' keyword unexpected here");

      const key = node.computed
        ? toPropertyKey(this.evalExpression(node.property as Expression, env))
        : (node.property as string);

      return { object: ctx.thisRef.value, key };
    }

    const object = this.evalExpression(node.object, env);
    const key = node.computed
      ? toPropertyKey(this.evalExpression(node.property as Expression, env))
      : (node.property as string);

    return { object, key };
  }

  // -------------------------------------------------------------------------
  // Expressions
  // -------------------------------------------------------------------------

  /**
   * Evaluate an expression.
   *
   * 求值表达式。
   *
   * @param node - The expression / 表达式
   * @param env - Current environment / 当前环境
   * @returns The value / 值
   */
  private evalExpression(node: Expression, env: Environment): unknown {
    this.step();

    switch (node.type) {
      case "literal": {
        return node.value;
      }
      case "regexp": {
        return new RegExp(node.pattern, node.flags);
      }
      case "identifier": {
        return env.get(node.name);
      }
      case "this": {
        return this.evalThis();
      }
      case "super": {
        throw new ReferenceError("'super' keyword unexpected here");
      }
      case "array": {
        return this.evalArray(node, env);
      }
      case "object": {
        return this.evalObject(node, env);
      }
      case "member": {
        return this.evalMember(node, env);
      }
      case "call": {
        return this.evalCall(node, env);
      }
      case "new": {
        return this.evalNew(node, env);
      }
      case "unary": {
        return this.evalUnary(node, env);
      }
      case "update": {
        return this.evalUpdate(node, env);
      }
      case "binary": {
        return this.evalBinary(node, env);
      }
      case "logical": {
        return this.evalLogical(node, env);
      }
      case "conditional": {
        return toBoolean(this.evalExpression(node.test, env))
          ? this.evalExpression(node.consequent, env)
          : this.evalExpression(node.alternate, env);
      }
      case "assignment": {
        return this.evalAssignment(node, env);
      }
      case "sequence": {
        let value: unknown = void 0;

        for (const expr of node.expressions) value = this.evalExpression(expr, env);

        return value;
      }
      case "arrow":
      case "functionExpr": {
        return this.makeFunction(node, env);
      }
      case "classExpr": {
        return this.evalClass(node.name, node.superClass, node.body, env);
      }
      case "template": {
        return this.evalTemplate(node, env);
      }
      case "await": {
        throw new Error("async/await is not implemented yet");
      }
      case "spread": {
        throw new TypeError("Unexpected spread expression");
      }
      default: {
        throw new Error("Unreachable expression");
      }
    }
  }

  /**
   * Evaluate `this` from the current execution context.
   *
   * 从当前执行上下文求值 `this`。
   *
   * @returns The `this` value / `this` 值
   */
  private evalThis(): unknown {
    const ctx = this.currentContext();

    if (ctx == null) return this.globalObject;

    if (ctx.thisRef.value === UNINITIALIZED)
      throw new ReferenceError("Cannot access 'this' before calling super()");

    return ctx.thisRef.value;
  }

  /**
   * Evaluate an array literal (elisions, spread).
   *
   * 求值数组字面量（空位、展开）。
   *
   * @param node - The array / 数组
   * @param env - Current environment / 当前环境
   * @returns The array / 数组
   */
  private evalArray(node: ArrayExpr, env: Environment): unknown[] {
    const arr: unknown[] = [];
    let index = 0;

    for (const element of node.elements) {
      if (element == null) {
        arr.length += 1;
        index += 1;
        continue;
      }

      if (element.type === "spread") {
        for (const item of iterate(this.evalExpression(element.argument, env))) {
          arr[index] = item;
          index += 1;
        }
        continue;
      }

      arr[index] = this.evalExpression(element, env);
      index += 1;
    }

    return arr;
  }

  /**
   * Evaluate an object literal (shorthand, computed keys, methods, getters/setters, spread,
   * `__proto__`).
   *
   * 求值对象字面量（简写、计算键、方法、getter/setter、展开、`__proto__`）。
   *
   * @param node - The object / 对象
   * @param env - Current environment / 当前环境
   * @returns The object / 对象
   */
  private evalObject(node: ObjectExpr, env: Environment): Record<PropertyKey, unknown> {
    const obj: Record<PropertyKey, unknown> = {};

    for (const prop of node.props) {
      if (prop.type === "spreadProperty") {
        const source = this.evalExpression(prop.argument, env);

        if (source != null && (typeof source === "object" || typeof source === "function")) {
          for (const key of Object.keys(source))
            obj[key] = (source as Record<string, unknown>)[key];
        }

        continue;
      }

      const key = prop.computed
        ? toPropertyKey(this.evalExpression(prop.key as Expression, env))
        : (prop.key as string);

      if (prop.kind === "get" || prop.kind === "set") {
        const fn = this.makeFunction(prop.value as FunctionExpr, env, {
          superBase: Object.getPrototypeOf(obj) as object | null,
        });
        const descriptor: PropertyDescriptor = { enumerable: true, configurable: true };

        if (prop.kind === "get") descriptor.get = fn;
        else descriptor.set = fn as (value: unknown) => void;

        Object.defineProperty(obj, key, descriptor);
        continue;
      }

      const { value } = prop;

      if (value.type === "functionExpr" || value.type === "arrow") {
        // method shorthand: home object is `obj`
        // 方法简写：home object 为 `obj`
        const fn = this.makeFunction(value, env, {
          superBase: Object.getPrototypeOf(obj) as object | null,
        });

        Object.defineProperty(obj, key, {
          value: fn,
          writable: true,
          configurable: true,
          enumerable: true,
        });
        continue;
      }

      const propValue = this.evalExpression(value, env);

      if (key === "__proto__" && !prop.computed) {
        if (propValue != null && (typeof propValue === "object" || typeof propValue === "function"))
          Object.setPrototypeOf(obj, propValue);
        continue;
      }

      obj[key] = propValue;
    }

    return obj;
  }

  /**
   * Evaluate a member access (`.`/`[]`/`?.` and `super.x`).
   *
   * 求值成员访问（`.`/`[]`/`?.` 与 `super.x`）。
   *
   * @param node - The member expression / 成员表达式
   * @param env - Current environment / 当前环境
   * @returns The property value / 属性值
   */
  private evalMember(node: MemberExpr, env: Environment): unknown {
    if (node.object.type === "super") {
      const ctx = this.currentContext();

      if (ctx == null || ctx.superBase == null)
        throw new ReferenceError("'super' keyword unexpected here");

      const key = node.computed
        ? toPropertyKey(this.evalExpression(node.property as Expression, env))
        : (node.property as string);

      return getProperty(ctx.superBase, key);
    }

    const object = this.evalExpression(node.object, env);

    if (node.optional && object == null) return void 0;

    const key = node.computed
      ? toPropertyKey(this.evalExpression(node.property as Expression, env))
      : (node.property as string);

    return getProperty(object, key);
  }

  /**
   * Evaluate a function call (`fn(...)`, `obj.m(...)`, `super.m(...)`, optional call).
   *
   * 求值函数调用（`fn(...)`、`obj.m(...)`、`super.m(...)`、可选调用）。
   *
   * @param node - The call / 调用
   * @param env - Current environment / 当前环境
   * @returns The call result / 调用结果
   */
  private evalCall(node: CallExpr, env: Environment): unknown {
    const args = this.evalArgs(node.args, env);

    if (node.callee.type === "super") return this.evalSuperCall(args);

    const { callee, thisArg } = this.evalCallee(node.callee, env);

    if (node.optional && callee == null) return void 0;

    return this.callValue(callee, args, thisArg);
  }

  /**
   * Evaluate the callee of a call together with its `this` value.
   *
   * 求值调用的 callee 及其 `this` 值。
   *
   * @param callee - The callee expression / callee 表达式
   * @param env - Current environment / 当前环境
   * @returns The callee value and `this` value / callee 值与 `this` 值
   */
  private evalCallee(callee: Expression, env: Environment): { callee: unknown; thisArg: unknown } {
    if (callee.type === "member") {
      if (callee.object.type === "super") {
        const ctx = this.currentContext();

        if (ctx == null || ctx.superBase == null)
          throw new ReferenceError("'super' keyword unexpected here");

        const key = callee.computed
          ? toPropertyKey(this.evalExpression(callee.property as Expression, env))
          : (callee.property as string);

        return { callee: getProperty(ctx.superBase, key), thisArg: ctx.thisRef.value };
      }

      const object = this.evalExpression(callee.object, env);

      if (callee.optional && object == null) return { callee: void 0, thisArg: void 0 };

      const key = callee.computed
        ? toPropertyKey(this.evalExpression(callee.property as Expression, env))
        : (callee.property as string);

      return { callee: getProperty(object, key), thisArg: object };
    }

    return { callee: this.evalExpression(callee, env), thisArg: void 0 };
  }

  /**
   * Evaluate call arguments (with spread).
   *
   * 求值调用参数（含展开）。
   *
   * @param args - The argument expressions / 参数表达式
   * @param env - Current environment / 当前环境
   * @returns The argument values / 参数值
   */
  private evalArgs(args: readonly (Expression | SpreadExpr)[], env: Environment): unknown[] {
    const result: unknown[] = [];

    for (const arg of args) {
      if (arg.type === "spread")
        for (const item of iterate(this.evalExpression(arg.argument, env))) result.push(item);
      else result.push(this.evalExpression(arg, env));
    }

    return result;
  }

  /**
   * Call any callable value (interpreter function or host function).
   *
   * 调用任意可调用值（解释器函数或宿主函数）。
   *
   * @param callee - The callable / 可调用值
   * @param args - Arguments / 参数
   * @param thisArg - The `this` value / `this` 值
   * @returns The result / 结果
   */
  private callValue(callee: unknown, args: unknown[], thisArg: unknown): unknown {
    if (typeof callee === "function") {
      const meta = getInterpreterMeta(callee);

      if (meta != null) return this.invokeFunction(meta, args, thisArg, false);

      return Reflect.apply(callee, thisArg, args);
    }

    throw new TypeError(`${typeOf(callee)} is not a function`);
  }

  /**
   * Evaluate a `new` expression.
   *
   * 求值 `new` 表达式。
   *
   * @param node - The `new` expression / `new` 表达式
   * @param env - Current environment / 当前环境
   * @returns The constructed value / 构造出的值
   */
  private evalNew(node: NewExpr, env: Environment): unknown {
    const ctor = this.evalExpression(node.callee, env);
    const args = this.evalArgs(node.args, env);

    return this.constructValue(ctor, args);
  }

  /**
   * Construct from any constructor value.
   *
   * 从任意构造器值构造。
   *
   * @param ctor - The constructor / 构造器
   * @param args - Arguments / 参数
   * @returns The constructed value / 构造出的值
   */
  private constructValue(ctor: unknown, args: unknown[]): unknown {
    if (typeof ctor === "function") {
      const meta = getInterpreterMeta(ctor);

      if (meta != null) return this.invokeFunction(meta, args, void 0, true);

      return Reflect.construct(ctor, args);
    }

    throw new TypeError(`${typeOf(ctor)} is not a constructor`);
  }

  /**
   * Evaluate a unary expression (`delete`/`typeof`/`void`/`+`/`-`/`~`/`!`).
   *
   * 求值一元表达式（`delete`/`typeof`/`void`/`+`/`-`/`~`/`!`）。
   *
   * @param node - The unary expression / 一元表达式
   * @param env - Current environment / 当前环境
   * @returns The result / 结果
   */
  private evalUnary(node: UnaryExpr, env: Environment): unknown {
    const { op } = node;

    if (op === "typeof") {
      const { argument } = node;

      if (argument.type === "identifier") {
        if (!env.has(argument.name)) return "undefined";

        return typeOf(env.get(argument.name));
      }

      return typeOf(this.evalExpression(argument, env));
    }

    if (op === "delete") {
      const { argument } = node;

      if (argument.type === "member") {
        if (argument.object.type === "super")
          throw new ReferenceError("'super' keyword unexpected here");

        const object = this.evalExpression(argument.object, env);

        if (argument.optional && object == null) return true;

        const key = argument.computed
          ? toPropertyKey(this.evalExpression(argument.property as Expression, env))
          : (argument.property as string);

        // oxlint-disable-next-line typescript/no-dynamic-delete -- `delete` operator semantics
        return delete (object as Record<PropertyKey, unknown>)[key];
      }

      if (argument.type === "identifier") {
        if (this.strict)
          throw new TypeError(`Cannot delete unqualified property '${argument.name}'`);

        return !env.has(argument.name);
      }

      this.evalExpression(argument, env);

      return true;
    }

    if (op === "void") {
      this.evalExpression(node.argument, env);

      return void 0;
    }

    const value = this.evalExpression(node.argument, env);

    if (op === "+") {
      if (typeof value === "bigint")
        throw new TypeError("Cannot convert a BigInt value to a number");

      return toNumber(value);
    }

    if (op === "-") {
      if (typeof value === "bigint") return -value;

      return -toNumber(value);
    }

    if (op === "~") {
      if (typeof value === "bigint") {
        // eslint-disable-next-line no-bitwise -- bitwise NOT is the operator semantics
        return ~value;
      }

      // eslint-disable-next-line no-bitwise -- bitwise NOT is the operator semantics
      return ~toNumber(value);
    }

    return !toBoolean(value);
  }

  /**
   * Evaluate an update expression (`++`/`--`, prefix or postfix).
   *
   * 求值更新表达式（`++`/`--`，前缀或后缀）。
   *
   * @param node - The update expression / 更新表达式
   * @param env - Current environment / 当前环境
   * @returns The old value (postfix) or new value (prefix) / 旧值（后缀）或新值（前缀）
   */
  private evalUpdate(node: UpdateExpr, env: Environment): unknown {
    const delta = (value: unknown): unknown => {
      if (typeof value === "bigint") return node.op === "++" ? value + 1n : value - 1n;

      const num = toNumber(value);

      return node.op === "++" ? num + 1 : num - 1;
    };
    const target = node.argument;

    if (target.type === "identifier") {
      const old = env.get(target.name);
      const value = delta(old);

      env.set(target.name, value);

      return node.prefix ? value : old;
    }

    if (target.type === "member") {
      const { object, key } = this.evalMemberRef(target, env);
      const old = getProperty(object, key);
      const value = delta(old);

      setProperty(object, key, value);

      return node.prefix ? value : old;
    }

    throw new TypeError("Invalid assignment target");
  }

  /**
   * Evaluate a binary expression.
   *
   * 求值二元表达式。
   *
   * @param node - The binary expression / 二元表达式
   * @param env - Current environment / 当前环境
   * @returns The result / 结果
   */
  private evalBinary(node: BinaryExpr, env: Environment): unknown {
    const left = this.evalExpression(node.left, env);
    const right = this.evalExpression(node.right, env);

    return binaryOp(node.op, left, right);
  }

  /**
   * Evaluate a logical expression (`&&`/`||`/`??`) with short-circuiting.
   *
   * 求值逻辑表达式（`&&`/`||`/`??`），带短路。
   *
   * @param node - The logical expression / 逻辑表达式
   * @param env - Current environment / 当前环境
   * @returns The result / 结果
   */
  private evalLogical(node: LogicalExpr, env: Environment): unknown {
    const left = this.evalExpression(node.left, env);

    if (node.op === "&&") return toBoolean(left) ? this.evalExpression(node.right, env) : left;
    if (node.op === "||") return toBoolean(left) ? left : this.evalExpression(node.right, env);

    return left ?? this.evalExpression(node.right, env);
  }

  /**
   * Evaluate an assignment expression (simple, compound and logical compound).
   *
   * 求值赋值表达式（简单、复合与逻辑复合赋值）。
   *
   * @param node - The assignment expression / 赋值表达式
   * @param env - Current environment / 当前环境
   * @returns The assigned value / 赋出的值
   */
  private evalAssignment(node: AssignmentExpr, env: Environment): unknown {
    const { op, target, value: valueExpr } = node;

    if (op === "=") {
      const value = this.evalExpression(valueExpr, env);

      this.assignTo(target, value, env);

      return value;
    }

    if (op === "&&=" || op === "||=" || op === "??=") {
      const old = this.readTarget(target, env);

      // short-circuit: the RHS is only evaluated when the assignment actually happens
      // 短路：仅在实际发生赋值时才求值 RHS
      if (op === "&&=") {
        if (!toBoolean(old)) return old;
      } else if (op === "||=") {
        if (toBoolean(old)) return old;
      } else if (old != null) {
        return old;
      }

      const value = this.evalExpression(valueExpr, env);

      this.assignTo(target, value, env);

      return value;
    }

    const old = this.readTarget(target, env);
    const value = this.evalExpression(valueExpr, env);
    const result = binaryOp(op.slice(0, -1) as BinaryOperator, old, value);

    this.assignTo(target, result, env);

    return result;
  }

  /**
   * Evaluate a template literal (with interpolation).
   *
   * 求值模板字符串（含插值）。
   *
   * @param node - The template / 模板
   * @param env - Current environment / 当前环境
   * @returns The resulting string / 结果字符串
   */
  private evalTemplate(node: TemplateExpr, env: Environment): string {
    let result = node.quasis[0].cooked;

    for (let i = 0; i < node.expressions.length; i += 1) {
      result += toString(this.evalExpression(node.expressions[i], env));
      result += node.quasis[i + 1].cooked;
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Functions and classes
  // -------------------------------------------------------------------------

  /**
   * Create an interpreter function from a function expression or arrow.
   *
   * 从函数表达式或箭头创建解释器函数。
   *
   * @param node - The function node / 函数节点
   * @param env - Current environment / 当前环境
   * @param extra - Extra metadata (super base) / 额外元数据（super 基准）
   * @returns The interpreter function / 解释器函数
   */
  private makeFunction(
    node: FunctionExpr | ArrowFunctionExpr,
    env: Environment,
    extra?: { superBase?: object | null },
  ): InterpreterFunction {
    if (node.type === "functionExpr" && node.name != null) {
      // named function expression: the name is bound in the function's own scope
      // 具名函数表达式：名称绑定在函数自身作用域内
      const nameEnv = new Environment(env, false);

      nameEnv.declareConst(node.name);

      const fn = this.createFunction({
        name: node.name,
        params: node.params,
        body: node.body,
        closure: nameEnv,
        thisMode: this.strict ? "strict" : "sloppy",
        isAsync: node.isAsync,
        prototype: null,
        superBase: extra?.superBase ?? null,
      });

      nameEnv.initialize(node.name, fn);

      return fn;
    }

    return this.createFunction({
      name: node.type === "functionExpr" ? node.name : null,
      params: node.params,
      body: node.body,
      closure: env,
      thisMode: node.type === "arrow" ? "arrow" : this.strict ? "strict" : "sloppy",
      isAsync: node.isAsync,
      prototype: null,
      superBase: extra?.superBase ?? null,
    });
  }

  /**
   * Create an interpreter function wrapper.
   *
   * 创建解释器函数包装。
   *
   * @param name - Function name / 函数名
   * @param params - Parameter patterns / 参数模式
   * @param body - Function body / 函数体
   * @param closure - Closure environment / 闭包环境
   * @param thisMode - How `this` is handled / `this` 的处理方式
   * @param isAsync - Whether it is async / 是否为 async
   * @param prototype - Instance prototype (`null` for arrows/methods) / 实例原型（箭头/方法为 `null`）
   * @param superBase - Base object for `super.x` / `super.x` 的基准对象
   * @returns The interpreter function / 解释器函数
   */
  /**
   * Create an interpreter function wrapper.
   *
   * 创建解释器函数包装。
   *
   * @param options - Function options / 函数选项
   * @returns The interpreter function / 解释器函数
   */
  private createFunction(options: {
    /** Function name (`null` for anonymous) / 函数名（匿名函数为 `null`） */
    name: string | null;
    /** Parameter patterns / 参数模式 */
    params: readonly Pattern[];
    /** Function body / 函数体 */
    body: BlockStatement | Expression;
    /** Closure environment / 闭包环境 */
    closure: Environment;
    /** How `this` is handled / `this` 的处理方式 */
    thisMode: "sloppy" | "strict" | "arrow";
    /** Whether it is async / 是否为 async */
    isAsync: boolean;
    /** Instance prototype (`null` for arrows/methods) / 实例原型（箭头/方法为 `null`） */
    prototype: object | null;
    /** Base object for `super.x` / `super.x` 的基准对象 */
    superBase: object | null;
  }): InterpreterFunction {
    const { name, params, body, closure, thisMode, isAsync, prototype, superBase } = options;
    const simpleParamNames = analyzeParams(params);
    const isArrow = thisMode === "arrow";
    const ctx = isArrow ? this.currentContext() : null;

    return makeInterpreterFunction(
      {
        name,
        params,
        body,
        closure,
        thisMode,
        isAsync,
        isClassConstructor: false,
        constructable: !isArrow,
        prototype,
        superClass: null,
        superBase,
        hasArguments: !isArrow && !simpleParamNames.includes("arguments"),
        simpleParamNames,
        implicitDerived: false,
        containsAwait: containsAwait(body),
        lexicalThis: isArrow ? (ctx?.thisRef ?? { value: this.globalObject }) : null,
        lexicalSuperBase: isArrow ? (ctx?.superBase ?? null) : null,
        lexicalSuperClass: isArrow ? (ctx?.superClass ?? null) : null,
        callee: null,
      },
      this.invokeHandler,
    );
  }

  /**
   * Invoke an interpreter function (ordinary call or construction).
   *
   * 调用解释器函数（普通调用或构造）。
   *
   * @param meta - Function metadata / 函数元数据
   * @param args - Call arguments / 调用参数
   * @param thisArg - The `this` value / `this` 值
   * @param isConstruct - Whether this is a `new` call / 是否为 `new` 调用
   * @returns The result / 结果
   */
  private invokeFunction(
    meta: InterpreterFunctionMeta,
    args: unknown[],
    thisArg: unknown,
    isConstruct: boolean,
  ): unknown {
    this.step();

    // async functions always return a host Promise (driven by the async runner)
    // async 函数总是返回宿主 Promise（由 async 运行器驱动）
    if (meta.isAsync) return this.asyncInvoke(meta, args, thisArg, isConstruct);

    this.stackDepth += 1;

    if (this.stackDepth > this.maxStack)
      throw new Error(`Maximum call stack size exceeded (limit ${this.maxStack})`);

    try {
      if (meta.thisMode === "arrow") {
        if (isConstruct) throw new TypeError(`${meta.name ?? "function"} is not a constructor`);

        // arrows use the lexical context captured at creation time
        // 箭头使用创建时捕获的词法上下文
        const env = new Environment(meta.closure, true);

        this.bindParams(meta.params, args, env);
        this.hoistFunctionBody(meta.body, env);

        this.contextStack.push({
          thisRef: meta.lexicalThis ?? { value: this.globalObject },
          superBase: meta.lexicalSuperBase,
          superClass: meta.lexicalSuperClass,
          newTargetMeta: null,
          isConstruct: false,
        });

        try {
          const result = this.evalFunctionBody(meta.body, env);

          return result;
        } catch (err) {
          // unwrap the user's thrown value at the arrow boundary
          // 在箭头函数边界解包用户抛出的值
          if (err instanceof ThrowSignalError) throw err.value;
          throw err;
        } finally {
          this.contextStack.pop();
        }
      }

      if (meta.isClassConstructor && !isConstruct)
        throw new TypeError(`Class constructor ${meta.name ?? ""} cannot be invoked without 'new'`);
      if (isConstruct && !meta.constructable)
        throw new TypeError(`${meta.name ?? "function"} is not a constructor`);

      let thisValue: unknown = thisArg;

      if (meta.thisMode === "sloppy" && thisValue == null) thisValue = this.globalObject;

      const env = new Environment(meta.closure, true);

      this.bindParams(meta.params, args, env);
      this.hoistFunctionBody(meta.body, env);
      if (meta.hasArguments) bindArguments(meta, args, env);

      const thisRef: { value: unknown } = { value: thisValue };
      let newTargetMeta: InterpreterFunctionMeta | null = null;

      if (isConstruct) {
        newTargetMeta = meta;

        thisRef.value =
          meta.superClass == null
            ? Object.create((meta.callee?.prototype as object | undefined) ?? {})
            : UNINITIALIZED;
      }

      this.contextStack.push({
        thisRef,
        superBase: meta.superBase,
        superClass: meta.superClass,
        newTargetMeta,
        isConstruct,
      });

      try {
        if (meta.implicitDerived) {
          const parent = this.currentContext()?.superClass;

          if (typeof parent !== "function")
            throw new TypeError("Derived constructor must call super()");

          this.superInvoke(parent, args);

          if (thisRef.value === UNINITIALIZED)
            throw new TypeError("Derived constructor must call super() before returning");

          return thisRef.value;
        }

        let result: unknown;
        let returned = false;

        try {
          const evaluated = this.evalFunctionBodyEx(meta.body, env);
          const { value, returned: didReturn } = evaluated;

          result = value;
          returned = didReturn;
        } catch (err) {
          if (err instanceof ThrowSignalError) throw err.value;
          throw err;
        }

        if (isConstruct) {
          // only an explicit `return <object>` overrides the instance; the block completion
          // value is ignored for constructors
          // 仅显式 `return <对象>` 覆盖实例；构造器的块完成值被忽略
          if (
            returned &&
            ((typeof result === "object" && result != null) || typeof result === "function")
          )
            return result;

          if (thisRef.value === UNINITIALIZED)
            throw new TypeError("Derived constructor must call super() before returning");

          return thisRef.value;
        }

        return result;
      } finally {
        this.contextStack.pop();
      }
    } finally {
      this.stackDepth -= 1;
    }
  }

  /**
   * Evaluate a function body, reporting whether an explicit `return` occurred.
   *
   * 求值函数体，报告是否发生显式 `return`。
   *
   * @param body - The function body / 函数体
   * @param env - Current environment / 当前环境
   * @returns The value and whether it came from an explicit `return` / 值及是否来自显式 `return`
   */
  private evalFunctionBodyEx(
    body: BlockStatement | Expression,
    env: Environment,
  ): {
    value: unknown;
    returned: boolean;
  } {
    if (body.type === "block") {
      try {
        // a block without an explicit `return` yields `undefined` — script completion values
        // apply to `run`/`eval`, not to function calls
        // 无显式 `return` 的块返回 `undefined`——完成值仅适用于 `run`/`eval`，不适用于函数调用
        this.evalBlock(body, env);

        return { value: void 0, returned: false };
      } catch (err) {
        if (err instanceof ReturnSignalError) return { value: err.value, returned: true };

        throw err;
      }
    }

    return { value: this.evalExpression(body, env), returned: true };
  }

  /**
   * Evaluate a function body, catching `return` signals.
   *
   * 求值函数体，捕获 `return` 信号。
   *
   * @param body - The function body / 函数体
   * @param env - Current environment / 当前环境
   * @returns The returned value / 返回值
   */
  private evalFunctionBody(body: BlockStatement | Expression, env: Environment): unknown {
    return this.evalFunctionBodyEx(body, env).value;
  }

  /**
   * Hoist `var`/function declarations of a function body into its function environment.
   *
   * 将函数体的 `var`/函数声明提升到其函数环境。
   *
   * @param body - The function body / 函数体
   * @param env - The function environment / 函数环境
   */
  private hoistFunctionBody(body: BlockStatement | Expression, env: Environment): void {
    if (body.type !== "block") return;

    this.hoistStatements(body.body, env);
  }

  /**
   * Bind parameters (with defaults and destructuring) in the function environment.
   *
   * 在函数环境绑定参数（含默认值与解构）。
   *
   * @param params - Parameter patterns / 参数模式
   * @param args - Call arguments / 调用参数
   * @param env - The function environment / 函数环境
   */
  private bindParams(params: readonly Pattern[], args: unknown[], env: Environment): void {
    let argIndex = 0;

    for (const param of params) {
      // a rest parameter collects every remaining argument
      // rest 参数收集所有剩余实参
      if (param.type === "rest") {
        this.bindParam(param.argument, args.slice(argIndex), env);

        return;
      }

      this.bindParam(param, argIndex < args.length ? args[argIndex] : void 0, env);
      argIndex += 1;
    }
  }

  /**
   * Bind a single parameter (with default values).
   *
   * 绑定单个参数（含默认值）。
   *
   * @param param - The parameter pattern / 参数模式
   * @param value - The argument value / 实参值
   * @param env - The function environment / 函数环境
   */
  private bindParam(param: AssignmentTarget, value: unknown, env: Environment): void {
    switch (param.type) {
      case "identifier": {
        env.define(param.name, value);
        break;
      }
      case "assignmentPattern": {
        if (isUndefined(value))
          this.bindParam(param.left, this.evalExpression(param.right, env), env);
        else this.bindParam(param.left, value, env);
        break;
      }
      case "rest": {
        // the rest array is collected in `bindParams`; bind the inner target here
        // rest 数组在 bindParams 中收集，这里绑定内部目标
        this.bindParam(param.argument, value, env);
        break;
      }
      default: {
        // object/array patterns: declare the names (TDZ) first, then initialize
        // 对象/数组模式：先声明名称（TDZ）再初始化
        this.declarePattern(param as Pattern, env, "let");
        this.assignTo(param, value, env, true);
        break;
      }
    }
  }

  /**
   * Evaluate a `super()` call in a derived constructor.
   *
   * 求值派生构造器中的 `super()` 调用。
   *
   * @param args - Constructor arguments / 构造参数
   * @returns The parent constructor result / 父构造器结果
   */
  private evalSuperCall(args: unknown[]): unknown {
    const ctx = this.currentContext();

    if (ctx == null || ctx.superClass == null || !ctx.isConstruct)
      throw new ReferenceError("'super' keyword unexpected here");

    return this.superInvoke(ctx.superClass, args);
  }

  /**
   * Run a parent constructor for `super()`, sharing `this` and the original `new.target`.
   *
   * 为 `super()` 运行父构造器，共享 `this` 与最初的 `new.target`。
   *
   * @param parent - The parent constructor value / 父构造器值
   * @param args - Constructor arguments / 构造参数
   * @returns The parent constructor result / 父构造器结果
   */
  private superInvoke(parent: unknown, args: unknown[]): unknown {
    const ctx = this.currentContext();

    if (ctx == null || typeof parent !== "function")
      throw new TypeError("'super' keyword unexpected here");

    const parentMeta = getInterpreterMeta(parent);

    if (parentMeta == null) {
      // host parent: let the host construct with the derived prototype
      // 宿主父类：让宿主以派生原型构造
      const newTarget = ctx.newTargetMeta?.callee;
      const instance: unknown =
        newTarget == null
          ? Reflect.construct(parent, args)
          : Reflect.construct(parent, args, newTarget);

      ctx.thisRef.value = instance;

      return instance;
    }

    // a chain of implicit derived constructors: keep chaining up to the first base
    // 隐式派生构造器链：继续向上链接直到首个基类
    if (parentMeta.implicitDerived && parentMeta.superClass != null)
      return this.superInvoke(parentMeta.superClass, args);

    // a base parent creates the instance (with the original `new.target` prototype)
    // 基类父构造器创建实例（使用最初 `new.target` 的原型）
    if (parentMeta.superClass == null) {
      ctx.thisRef.value = Object.create(
        (ctx.newTargetMeta?.callee?.prototype as object | undefined) ?? {},
      );
    }

    this.stackDepth += 1;

    if (this.stackDepth > this.maxStack)
      throw new Error(`Maximum call stack size exceeded (limit ${this.maxStack})`);

    const env = new Environment(parentMeta.closure, true);

    this.bindParams(parentMeta.params, args, env);
    this.hoistFunctionBody(parentMeta.body, env);
    if (parentMeta.hasArguments) bindArguments(parentMeta, args, env);

    this.contextStack.push({
      thisRef: ctx.thisRef,
      superBase: parentMeta.superBase,
      superClass: parentMeta.superClass,
      newTargetMeta: ctx.newTargetMeta,
      isConstruct: true,
    });

    try {
      let evaluated: { value: unknown; returned: boolean };

      try {
        evaluated = this.evalFunctionBodyEx(parentMeta.body, env);
      } catch (err) {
        if (err instanceof ThrowSignalError) throw err.value;
        throw err;
      }

      // only an explicit `return <object>` from the base constructor replaces the shared `this`
      // 仅基类构造器的显式 `return <对象>` 替换共享的 `this`
      if (
        evaluated.returned &&
        ((typeof evaluated.value === "object" && evaluated.value != null) ||
          typeof evaluated.value === "function")
      )
        ctx.thisRef.value = evaluated.value;

      // `super()` evaluates to the shared instance (or the explicitly returned object)
      // `super()` 求值为共享实例（或显式返回的对象）
      return ctx.thisRef.value;
    } finally {
      this.contextStack.pop();
      this.stackDepth -= 1;
    }
  }

  /**
   * Evaluate a class (declaration or expression) into its constructor.
   *
   * 将类（声明或表达式）求值为其构造器。
   *
   * @param name - Class name (`null` for anonymous expressions) / 类名（匿名表达式为 `null`）
   * @param superClassExpr - The `extends` expression, or `null` / `extends` 表达式，或 `null`
   * @param body - The class body / 类体
   * @param env - Current environment / 当前环境
   * @returns The constructor (interpreter function) / 构造器（解释器函数）
   */
  private evalClass(
    name: string | null,
    superClassExpr: Expression | null,
    body: ClassBody,
    env: Environment,
  ): InterpreterFunction {
    let parentCtor: unknown = null;
    let parentProto: object | null = null;
    let isDerived = false;

    if (superClassExpr != null) {
      parentCtor = this.evalExpression(superClassExpr, env);

      if (typeof parentCtor === "function") {
        isDerived = true;
        parentProto = ((parentCtor as { prototype?: unknown }).prototype as object | null) ?? null;
      } else if (parentCtor == null) {
        parentProto = null;
      } else {
        throw new TypeError("Class extends value is not a constructor or null");
      }
    }

    // the class name is visible inside the class body
    // 类名在类体内部可见
    let closureEnv = env;

    if (name != null) {
      closureEnv = new Environment(env, false);
      closureEnv.declareLet(name);
    }

    const proto: object =
      parentProto == null
        ? (Object.create(null) as object)
        : (Object.create(parentProto) as object);

    const ctorMethod = body.methods.find((item) => item.kind === "constructor") ?? null;
    const ctor = ctorMethod
      ? this.createClassMethod({
          method: ctorMethod,
          closure: closureEnv,
          name: name ?? (typeof ctorMethod.key === "string" ? ctorMethod.key : null),
          prototype: proto,
          superClass: isDerived ? parentCtor : null,
          superBase: parentProto,
          isConstructor: true,
        })
      : this.createImplicitConstructor(name, closureEnv, proto, isDerived ? parentCtor : null);

    // bind the class name now that the constructor exists
    // 构造器已存在，现在绑定类名
    if (name != null) closureEnv.initialize(name, ctor);

    // the instance prototype points back to the constructor
    // 实例原型指回构造器
    Object.defineProperty(proto, "constructor", {
      value: ctor,
      writable: true,
      configurable: true,
      enumerable: false,
    });

    // static inheritance: the derived constructor's `[[Prototype]]` is the parent
    // 静态继承：派生构造器的 `[[Prototype]]` 指向父构造器
    if (isDerived && parentCtor != null) Object.setPrototypeOf(ctor, parentCtor);

    // define instance/static methods; merge getters/setters per key
    // 定义实例/静态方法；按键合并 getter/setter
    const accessorGroups: AccessorGroups = new Map();

    for (const method of body.methods) {
      if (method.kind === "constructor") continue;

      const key = this.classMethodKey(method, env);
      const isStatic =
        method.kind === "static" || method.kind === "staticGet" || method.kind === "staticSet";
      const target = isStatic ? ctor : proto;
      const superBase = isStatic ? (parentCtor as object | null) : parentProto;
      const group = getAccessorGroup(accessorGroups, target);
      const fn = this.createClassMethod({
        method,
        closure: closureEnv,
        name: typeof key === "string" ? key : null,
        prototype: null,
        superClass: null,
        superBase,
        isConstructor: false,
      });

      if (method.kind === "get" || method.kind === "staticGet") {
        const entry: AccessorEntry = group.get(key) ?? {};

        entry.get = fn;
        group.set(key, entry);
      } else if (method.kind === "set" || method.kind === "staticSet") {
        const entry: AccessorEntry = group.get(key) ?? {};

        entry.set = fn;
        group.set(key, entry);
      } else {
        Object.defineProperty(target, key, {
          value: fn,
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }
    }

    for (const [target, group] of accessorGroups) {
      for (const [key, entry] of group) {
        Object.defineProperty(target, key, {
          get: entry.get,
          set: entry.set,
          enumerable: false,
          configurable: true,
        });
      }
    }

    return ctor;
  }

  /**
   * Resolve a class method's key (computed keys are evaluated).
   *
   * 解析类方法的键（计算键会被求值）。
   *
   * @param method - The class method / 类方法
   * @param env - Current environment / 当前环境
   * @returns The property key / 属性键
   */
  private classMethodKey(method: ClassMethod, env: Environment): string | symbol {
    if (method.computed) return toPropertyKey(this.evalExpression(method.key as Expression, env));

    return method.key as string;
  }

  /**
   * Create an interpreter function for a class method (or constructor).
   *
   * 为类方法（或构造器）创建解释器函数。
   *
   * @param options - Method options / 方法选项
   * @returns The interpreter function / 解释器函数
   */
  private createClassMethod(options: {
    /** The class method / 类方法 */
    method: ClassMethod;
    /** Closure environment / 闭包环境 */
    closure: Environment;
    /** Function name / 函数名 */
    name: string | null;
    /** Instance prototype for constructors, `null` for methods / 构造器的实例原型，方法为 `null` */
    prototype: object | null;
    /** Parent constructor for `super()` / `super()` 的父构造器 */
    superClass: unknown;
    /** Base object for `super.x` / `super.x` 的基准对象 */
    superBase: object | null;
    /** Whether this is the constructor / 是否为构造器 */
    isConstructor: boolean;
  }): InterpreterFunction {
    const { method, closure, name, prototype, superClass, superBase, isConstructor } = options;
    const simpleParamNames = analyzeParams(method.params);

    return makeInterpreterFunction(
      {
        name,
        params: method.params,
        body: method.body,
        closure,
        // class methods use sloppy `this` boxing in this round (design doc §3.3)
        // 本轮类方法使用 sloppy `this` 装箱（设计文档 §3.3）
        thisMode: "sloppy",
        isAsync: method.isAsync,
        isClassConstructor: isConstructor,
        constructable: isConstructor,
        prototype,
        superClass,
        superBase,
        hasArguments: !simpleParamNames.includes("arguments"),
        simpleParamNames,
        implicitDerived: false,
        containsAwait: containsAwait(method.body),
        lexicalThis: null,
        lexicalSuperBase: null,
        lexicalSuperClass: null,
        callee: null,
      },
      this.invokeHandler,
    );
  }

  /**
   * Create the implicit constructor of a class (base: empty body; derived: calls `super(...args)`).
   *
   * 创建类的隐式构造器（基类：空体；派生类：调用 `super(...args)`）。
   *
   * @param name - Class name / 类名
   * @param closure - Closure environment / 闭包环境
   * @param prototype - Instance prototype / 实例原型
   * @param superClass - Parent constructor, or `null` for a base class / 父构造器，基类为 `null`
   * @returns The interpreter function / 解释器函数
   */
  private createImplicitConstructor(
    name: string | null,
    closure: Environment,
    prototype: object,
    superClass: unknown,
  ): InterpreterFunction {
    return makeInterpreterFunction(
      {
        name,
        params: [],
        body: EMPTY_BLOCK,
        closure,
        thisMode: "sloppy",
        isAsync: false,
        isClassConstructor: true,
        constructable: true,
        prototype,
        superClass,
        superBase: null,
        hasArguments: false,
        simpleParamNames: [],
        implicitDerived: superClass != null,
        containsAwait: false,
        lexicalThis: null,
        lexicalSuperBase: null,
        lexicalSuperClass: null,
        callee: null,
      },
      this.invokeHandler,
    );
  }

  // -------------------------------------------------------------------------
  // Async functions (async/await)
  // -------------------------------------------------------------------------

  /**
   * Invoke an async function, returning a host `Promise` driven by a resumable generator.
   *
   * 调用 async 函数，返回由可恢复生成器驱动的宿主 `Promise`。
   *
   * The async body runs inside a generator: `await` yields the pending promise, and the driver
   * resumes the generator once it settles. While suspended, the `contextStack` frames owned by this
   * async call are temporarily removed so interleaved host callbacks see a clean stack.
   *
   * Async 函数体在生成器内运行：`await` 挂起当前 promise，结算后驱动恢复生成器。挂起期间本 async 调用 持有的 `contextStack`
   * 帧会被临时移除，使穿插的宿主回调看到干净的栈。
   *
   * @param meta - Function metadata / 函数元数据
   * @param args - Call arguments / 调用参数
   * @param thisArg - The `this` value / `this` 值
   * @param isConstruct - Whether this is a `new` call / 是否为 `new` 调用
   * @returns A host Promise / 宿主 Promise
   */
  private async asyncInvoke(
    meta: InterpreterFunctionMeta,
    args: unknown[],
    thisArg: unknown,
    isConstruct: boolean,
  ): Promise<unknown> {
    if (isConstruct) throw new TypeError(`${meta.name ?? "function"} is not a constructor`);

    this.stackDepth += 1;

    if (this.stackDepth > this.maxStack) {
      // undo the increment before throwing, so the guard does not leak depth
      // 抛出前先撤销递增，避免守卫泄漏深度
      this.stackDepth -= 1;

      throw new Error(`Maximum call stack size exceeded (limit ${this.maxStack})`);
    }

    const baseDepth = this.contextStack.length;
    const gen = this.asyncBodyGenerator(meta, args, thisArg);
    let savedFrames: RuntimeContext[] = [];

    return new Promise<unknown>((resolve, reject) => {
      const settle = (): void => {
        this.stackDepth -= 1;
      };

      const step = (method: "next" | "throw", arg: unknown): void => {
        // restore the async frames and depth before resuming the generator
        // 恢复生成器前还原 async 帧与深度
        if (savedFrames.length > 0) {
          this.contextStack.push(...savedFrames);
          this.stackDepth += 1;
          savedFrames = [];
        }

        let result: IteratorResult<unknown, unknown>;

        try {
          result = method === "next" ? gen.next(arg) : gen.throw(arg);
        } catch (err) {
          settle();

          // user code may throw/reject with any value, not just Errors
          // 用户代码可能抛出/拒绝任意值，不限于 Error
          /* oxlint-disable-next-line typescript/prefer-promise-reject-errors -- rejections may be arbitrary values */
          reject(err);

          return;
        }

        if (result.done) {
          settle();

          resolve(result.value);

          return;
        }

        // suspended: remove the async frames and depth, so suspended tasks do not count
        // toward maxStack (they occupy no host stack while waiting)
        // 挂起：移除 async 帧与深度，使挂起任务不计入 maxStack（等待期间不占宿主栈）
        savedFrames = this.contextStack.splice(baseDepth);
        this.stackDepth -= 1;

        /* oxlint-disable promise/catch-or-return, promise/prefer-catch, promise/prefer-await-to-callbacks -- recursive promise driver */
        Promise.resolve(result.value).then(
          (value) => {
            step("next", value);
          },
          (err: unknown) => {
            step("throw", err);
          },
        );
        /* oxlint-enable promise/catch-or-return, promise/prefer-catch, promise/prefer-await-to-callbacks */
      };

      step("next", void 0);
    });
  }

  /**
   * The resumable generator of an async function body (or an async-context arrow).
   *
   * Async 函数体（或 async 上下文箭头）的可恢复生成器。
   *
   * @param meta - Function metadata / 函数元数据
   * @param args - Call arguments / 调用参数
   * @param thisArg - The `this` value / `this` 值
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator, completing with the function result / 生成器，完成值为函数结果
   */
  private *asyncBodyGenerator(
    meta: InterpreterFunctionMeta,
    args: unknown[],
    thisArg: unknown,
  ): Generator<unknown, unknown, unknown> {
    let thisValue: unknown = thisArg;

    if (meta.thisMode === "sloppy" && thisValue == null) thisValue = this.globalObject;

    const env = new Environment(meta.closure, true);

    this.bindParams(meta.params, args, env);
    this.hoistFunctionBody(meta.body, env);
    if (meta.hasArguments) bindArguments(meta, args, env);

    const thisRef: { value: unknown } = { value: thisValue };
    let superBase: object | null = meta.superBase;
    let superClass: unknown = meta.superClass;

    if (meta.thisMode === "arrow") {
      thisRef.value = meta.lexicalThis?.value ?? this.globalObject;
      superBase = meta.lexicalSuperBase;
      superClass = meta.lexicalSuperClass;
    }

    this.contextStack.push({
      thisRef,
      superBase,
      superClass,
      newTargetMeta: null,
      isConstruct: false,
    });

    try {
      if (meta.body.type === "block") {
        yield* this.evalAsyncBody(meta.body.body, env);

        return void 0;
      }

      // expression-bodied async arrow: `async x => expr`
      // 表达式体 async 箭头：`async x => expr`
      return yield* this.evalAsyncExpr(meta.body, env);
    } catch (err) {
      if (err instanceof ReturnSignalError) return err.value;

      throw err;
    } finally {
      this.contextStack.pop();
    }
  }

  /**
   * Evaluate an async statement list, resuming after each suspension.
   *
   * 求值 async 语句列表，每次挂起后恢复。
   *
   * @param stmts - Statements / 语句
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncBody(
    stmts: readonly Statement[],
    env: Environment,
  ): Generator<unknown, void, unknown> {
    for (const stmt of stmts) yield* this.evalAsyncStatement(stmt, env);
  }

  /**
   * Evaluate an async statement natively, suspending at `await`.
   *
   * 原生求值 async 语句，在 `await` 处挂起。
   *
   * Statements without await, calls or control flow are delegated to the sync evaluator. Control
   * signals (`return`/`break`/`continue`) are exceptions; the native `try`/`finally` of this
   * generator preserves their interaction with the user's `try`/`finally` blocks.
   *
   * 不含 await/调用/控制流的语句委托给同步求值器。控制信号（`return`/`break`/`continue`）以异常形式 传递；本生成器内的原生 `try`/`finally`
   * 保留它们与用户 `try`/`finally` 块的交互。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label for loops / 循环的外层标签
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncStatement(
    stmt: Statement,
    env: Environment,
    label: string | null = null,
  ): Generator<unknown, unknown, unknown> {
    if (isSafeSyncStatement(stmt)) return this.evalStatement(stmt, env);

    this.step();

    switch (stmt.type) {
      case "expression": {
        return yield* this.evalAsyncExpr(stmt.expression, env);
      }
      case "block": {
        const blockEnv = new Environment(env, false);

        yield* this.evalAsyncBody(stmt.body, blockEnv);

        return void 0;
      }
      case "variable": {
        yield* this.evalAsyncVariable(stmt, env);

        return void 0;
      }
      case "if": {
        if (toBoolean(yield* this.evalAsyncExpr(stmt.test, env)))
          yield* this.evalAsyncStatement(stmt.consequent, env);
        else if (stmt.alternate != null) yield* this.evalAsyncStatement(stmt.alternate, env);

        return void 0;
      }
      case "while": {
        yield* this.evalAsyncWhile(stmt, env, label);

        return void 0;
      }
      case "doWhile": {
        yield* this.evalAsyncDoWhile(stmt, env, label);

        return void 0;
      }
      case "for": {
        yield* this.evalAsyncFor(stmt, env, label);

        return void 0;
      }
      case "forIn": {
        yield* this.evalAsyncForIn(stmt, env, label);

        return void 0;
      }
      case "forOf": {
        yield* this.evalAsyncForOf(stmt, env, label);

        return void 0;
      }
      case "switch": {
        yield* this.evalAsyncSwitch(stmt, env);

        return void 0;
      }
      case "try": {
        yield* this.evalAsyncTry(stmt, env);

        return void 0;
      }
      case "return": {
        throw new ReturnSignalError(
          stmt.argument == null ? void 0 : yield* this.evalAsyncExpr(stmt.argument, env),
        );
      }
      case "break": {
        throw new BreakSignalError(stmt.label);
      }
      case "continue": {
        throw new ContinueSignalError(stmt.label);
      }
      case "throw": {
        // the raw value is thrown natively, so native `try`/`catch` sees it directly
        // 原生抛出原始值，使原生 `try`/`catch` 直接捕获
        throw yield* this.evalAsyncExpr(stmt.argument, env);
      }
      case "labeled": {
        try {
          yield* this.evalAsyncStatement(stmt.body, env, stmt.label);
        } catch (err) {
          if (err instanceof BreakSignalError && err.label === stmt.label) return void 0;

          throw err;
        }

        return void 0;
      }
      default: {
        return this.evalStatement(stmt, env);
      }
    }
  }

  /**
   * Evaluate an async `while` loop.
   *
   * 求值 async `while` 循环。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label / 外层标签
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncWhile(
    stmt: WhileStatement,
    env: Environment,
    label: string | null,
  ): Generator<unknown, void, unknown> {
    while (toBoolean(yield* this.evalAsyncExpr(stmt.test, env))) {
      try {
        yield* this.evalAsyncStatement(stmt.body, env);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label))
          continue;
        if (err instanceof BreakSignalError && (err.label == null || err.label === label)) break;
        throw err;
      }
    }
  }

  /**
   * Evaluate an async `do...while` loop.
   *
   * 求值 async `do...while` 循环。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label / 外层标签
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncDoWhile(
    stmt: DoWhileStatement,
    env: Environment,
    label: string | null,
  ): Generator<unknown, void, unknown> {
    for (;;) {
      try {
        yield* this.evalAsyncStatement(stmt.body, env);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label)) {
          // continue: re-check the test below
          // continue：重新检查下方的 test
        } else if (err instanceof BreakSignalError && (err.label == null || err.label === label)) {
          return;
        } else {
          throw err;
        }
      }

      if (!toBoolean(yield* this.evalAsyncExpr(stmt.test, env))) return;
    }
  }

  /**
   * Evaluate an async variable declaration (`var`/`let`/`const`).
   *
   * 求值 async 变量声明（`var`/`let`/`const`）。
   *
   * @param stmt - The declaration / 声明
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncVariable(
    stmt: VariableDeclaration,
    env: Environment,
  ): Generator<unknown, void, unknown> {
    if (stmt.kind === "var") {
      for (const decl of stmt.declarations) {
        if (decl.init == null) continue;

        const value = yield* this.evalAsyncExpr(decl.init, env);

        yield* this.evalAsyncAssignTo(decl.id, value, env);
      }

      return;
    }

    for (const decl of stmt.declarations) this.declarePattern(decl.id, env, stmt.kind);

    for (const decl of stmt.declarations) {
      const value = decl.init == null ? void 0 : yield* this.evalAsyncExpr(decl.init, env);

      yield* this.evalAsyncAssignTo(decl.id, value, env, true);
    }
  }

  /**
   * Evaluate the `var` initializers of an async `for` head (names are hoisted).
   *
   * 求值 async `for` 头部的 `var` 初始化器（名称已提升）。
   *
   * @param init - The `var` declaration / `var` 声明
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncForVarInit(
    init: VariableDeclaration,
    env: Environment,
  ): Generator<unknown, void, unknown> {
    for (const decl of init.declarations) {
      if (decl.init == null) continue;

      const value = yield* this.evalAsyncExpr(decl.init, env);

      yield* this.evalAsyncAssignTo(decl.id, value, env);
    }
  }

  /**
   * Evaluate an async classic `for` loop with per-iteration `let` semantics.
   *
   * 求值 async 经典 `for` 循环，带逐迭代 `let` 语义。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label / 外层标签
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncFor(
    stmt: ForStatement,
    env: Environment,
    label: string | null,
  ): Generator<unknown, void, unknown> {
    let baseEnv = env;
    let hasBinding = false;

    if (stmt.init != null) {
      if (stmt.init.type === "variable") {
        if (stmt.init.kind === "var") {
          yield* this.evalAsyncForVarInit(stmt.init, env);
        } else {
          baseEnv = new Environment(env, false);
          hasBinding = true;
          yield* this.evalAsyncVariable(stmt.init, baseEnv);
        }
      } else {
        yield* this.evalAsyncExpr(stmt.init, env);
      }
    }

    let previous: Environment | null = null;

    for (;;) {
      const iterEnv: Environment = hasBinding ? freshIterationEnv(baseEnv, previous) : baseEnv;

      if (stmt.test != null && !toBoolean(yield* this.evalAsyncExpr(stmt.test, iterEnv))) return;

      try {
        yield* this.evalAsyncStatement(stmt.body, iterEnv);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label)) {
          // continue: run the update below
          // continue：执行下方的 update
        } else if (err instanceof BreakSignalError && (err.label == null || err.label === label)) {
          return;
        } else {
          throw err;
        }
      }

      if (stmt.update == null) {
        previous = hasBinding ? iterEnv : null;
      } else if (hasBinding) {
        const nextEnv = freshIterationEnv(baseEnv, iterEnv);

        previous = nextEnv;
        yield* this.evalAsyncExpr(stmt.update, nextEnv);
      } else {
        yield* this.evalAsyncExpr(stmt.update, iterEnv);
      }
    }
  }

  /**
   * Evaluate an async `for...in` loop.
   *
   * 求值 async `for...in` 循环。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label / 外层标签
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncForIn(
    stmt: ForInStatement,
    env: Environment,
    label: string | null,
  ): Generator<unknown, void, unknown> {
    const right = yield* this.evalAsyncExpr(stmt.right, env);

    if (right == null) throw new TypeError("Cannot convert undefined or null to object");

    // oxlint-disable-next-line unicorn/new-for-builtins -- ToObject conversion
    const obj = Object(right) as Record<PropertyKey, unknown>;

    let baseEnv = env;
    let hasBinding = false;

    if (stmt.left.type === "variable" && stmt.left.kind !== "var") {
      baseEnv = new Environment(env, false);
      hasBinding = true;
      this.declareForLoopBinding(stmt.left.declarations[0].id, baseEnv, stmt.left.kind);
    }

    const keys: string[] = [];

    // oxlint-disable-next-line guard-for-in -- for...in intentionally includes inherited keys
    for (const key in obj) keys.push(key);

    let previous: Environment | null = null;

    for (const key of keys) {
      const iterEnv: Environment = hasBinding ? freshIterationEnv(baseEnv, previous) : env;
      previous = hasBinding ? iterEnv : null;

      if (stmt.left.type === "variable") {
        yield* this.evalAsyncAssignTo(
          stmt.left.declarations[0].id,
          key,
          iterEnv,
          stmt.left.kind !== "var",
        );
      } else {
        yield* this.evalAsyncAssignTo(stmt.left, key, iterEnv);
      }

      try {
        yield* this.evalAsyncStatement(stmt.body, iterEnv);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label))
          continue;
        if (err instanceof BreakSignalError && (err.label == null || err.label === label)) break;
        throw err;
      }
    }
  }

  /**
   * Evaluate an async `for...of` loop (host iterator protocol).
   *
   * 求值 async `for...of` 循环（宿主迭代协议）。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @param label - Enclosing label / 外层标签
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncForOf(
    stmt: ForOfStatement,
    env: Environment,
    label: string | null,
  ): Generator<unknown, void, unknown> {
    const iterator = iterate(yield* this.evalAsyncExpr(stmt.right, env));

    let baseEnv = env;
    let hasBinding = false;

    if (stmt.left.type === "variable" && stmt.left.kind !== "var") {
      baseEnv = new Environment(env, false);
      hasBinding = true;
      this.declareForLoopBinding(stmt.left.declarations[0].id, baseEnv, stmt.left.kind);
    }

    let previous: Environment | null = null;

    for (;;) {
      const step = iterator.next();

      if (step.done) return;

      const iterEnv: Environment = hasBinding ? freshIterationEnv(baseEnv, previous) : env;
      previous = hasBinding ? iterEnv : null;

      if (stmt.left.type === "variable") {
        yield* this.evalAsyncAssignTo(
          stmt.left.declarations[0].id,
          step.value,
          iterEnv,
          stmt.left.kind !== "var",
        );
      } else {
        yield* this.evalAsyncAssignTo(stmt.left, step.value, iterEnv);
      }

      try {
        yield* this.evalAsyncStatement(stmt.body, iterEnv);
      } catch (err) {
        if (err instanceof ContinueSignalError && (err.label == null || err.label === label))
          continue;
        if (err instanceof BreakSignalError && (err.label == null || err.label === label)) break;
        throw err;
      }
    }
  }

  /**
   * Evaluate an async `switch` statement with fall-through.
   *
   * 求值带 fall-through 的 async `switch` 语句。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncSwitch(
    stmt: SwitchStatement,
    env: Environment,
  ): Generator<unknown, void, unknown> {
    const discriminant = yield* this.evalAsyncExpr(stmt.discriminant, env);
    let index = -1;

    for (let i = 0; i < stmt.cases.length; i += 1) {
      const caseNode = stmt.cases[i];

      if (caseNode.test == null) continue;

      if ((yield* this.evalAsyncExpr(caseNode.test, env)) === discriminant) {
        index = i;
        break;
      }
    }

    if (index < 0) {
      for (let i = 0; i < stmt.cases.length; i += 1) {
        if (stmt.cases[i].test == null) {
          index = i;
          break;
        }
      }
    }

    if (index < 0) return;

    for (let i = index; i < stmt.cases.length; i += 1) {
      try {
        for (const st of stmt.cases[i].body) yield* this.evalAsyncStatement(st, env);
      } catch (err) {
        if (err instanceof BreakSignalError && err.label == null) return;

        throw err;
      }
    }
  }

  /**
   * Evaluate an async `try`/`catch`/`finally` statement.
   *
   * 求值 async `try`/`catch`/`finally` 语句。
   *
   * @param stmt - The statement / 语句
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncTry(stmt: TryStatement, env: Environment): Generator<unknown, void, unknown> {
    let pending: unknown = null;
    let hasPending = false;

    try {
      try {
        const blockEnv = new Environment(env, false);

        yield* this.evalAsyncBody(stmt.block.body, blockEnv);
      } catch (err) {
        if (
          err instanceof ReturnSignalError ||
          err instanceof BreakSignalError ||
          err instanceof ContinueSignalError
        )
          throw err;

        if (stmt.handler == null) {
          throw err;
        } else {
          const catchEnv = new Environment(env, false);

          if (stmt.handler.param != null) {
            // the value is thrown natively (unwrapped), bind it directly
            // 值以原生方式抛出（未包装），直接绑定
            this.declarePattern(stmt.handler.param, catchEnv, "let");
            yield* this.evalAsyncAssignTo(stmt.handler.param, err, catchEnv, true);
          }

          yield* this.evalAsyncBody(stmt.handler.body.body, catchEnv);
        }
      }
    } catch (err) {
      pending = err;
      hasPending = true;
    }

    if (stmt.finalizer != null) {
      const finEnv = new Environment(env, false);

      yield* this.evalAsyncBody(stmt.finalizer.body, finEnv);
    }

    // rethrow the pending exception (which may be `null`/`undefined` from a raw throw)
    // 重抛未决异常（原始 throw 可能为 `null`/`undefined`）
    if (hasPending) throw pending as Error;
  }

  /**
   * Evaluate an async expression, suspending at `await`.
   *
   * 求值 async 表达式，在 `await` 处挂起。
   *
   * Await-free, call-free expressions delegate to the sync evaluator. Every expression type is
   * otherwise walked natively, so `await` keeps the correct left-to-right evaluation and
   * short-circuit order (`&&`/`||`/`??`/ternary).
   *
   * 无 await、无调用的表达式委托给同步求值器。其余表达式类型全部原生遍历，保证 `await` 保持正确的 从左到右求值顺序与短路顺序（`&&`/`||`/`??`/三元）。
   *
   * @param expr - The expression / 表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncExpr(expr: Expression, env: Environment): Generator<unknown, unknown, unknown> {
    if (isSafeSyncExpression(expr)) return this.evalExpression(expr, env);

    this.step();

    switch (expr.type) {
      case "array": {
        const arr: unknown[] = [];
        let index = 0;

        for (const element of expr.elements) {
          if (element == null) {
            arr.length += 1;
            index += 1;
            continue;
          }

          if (element.type === "spread") {
            for (const item of iterate(yield* this.evalAsyncExpr(element.argument, env))) {
              arr[index] = item;
              index += 1;
            }
            continue;
          }

          arr[index] = yield* this.evalAsyncExpr(element, env);
          index += 1;
        }

        return arr;
      }
      case "object": {
        return yield* this.evalAsyncObject(expr, env);
      }
      case "member": {
        if (expr.object.type === "super") {
          const ctx = this.currentContext();

          if (ctx == null || ctx.superBase == null)
            throw new ReferenceError("'super' keyword unexpected here");

          const key = expr.computed
            ? toPropertyKey(yield* this.evalAsyncExpr(expr.property as Expression, env))
            : (expr.property as string);

          return getProperty(ctx.superBase, key);
        }

        const object = yield* this.evalAsyncExpr(expr.object, env);

        if (expr.optional && object == null) return void 0;

        const key = expr.computed
          ? toPropertyKey(yield* this.evalAsyncExpr(expr.property as Expression, env))
          : (expr.property as string);

        return getProperty(object, key);
      }
      case "call": {
        const args: unknown[] = [];

        for (const arg of expr.args) {
          if (arg.type === "spread") {
            for (const item of iterate(yield* this.evalAsyncExpr(arg.argument, env)))
              args.push(item);
          } else {
            args.push(yield* this.evalAsyncExpr(arg, env));
          }
        }

        if (expr.callee.type === "super") return this.evalSuperCall(args);

        let callee: unknown;
        let thisArg: unknown;
        const calleeExpr = expr.callee;

        if (calleeExpr.type === "member") {
          if (calleeExpr.object.type === "super") {
            const ctx = this.currentContext();

            if (ctx == null || ctx.superBase == null)
              throw new ReferenceError("'super' keyword unexpected here");

            const key = calleeExpr.computed
              ? toPropertyKey(yield* this.evalAsyncExpr(calleeExpr.property as Expression, env))
              : (calleeExpr.property as string);

            callee = getProperty(ctx.superBase, key);
            thisArg = ctx.thisRef.value;
          } else {
            const object = yield* this.evalAsyncExpr(calleeExpr.object, env);

            if (calleeExpr.optional && object == null) return void 0;

            const key = calleeExpr.computed
              ? toPropertyKey(yield* this.evalAsyncExpr(calleeExpr.property as Expression, env))
              : (calleeExpr.property as string);

            callee = getProperty(object, key);
            thisArg = object;
          }
        } else {
          callee = yield* this.evalAsyncExpr(calleeExpr, env);
          thisArg = void 0;
        }

        if (expr.optional && callee == null) return void 0;

        return yield* this.evalAsyncCallValue(callee, args, thisArg);
      }
      case "new": {
        const ctor = yield* this.evalAsyncExpr(expr.callee, env);
        const args: unknown[] = [];

        for (const arg of expr.args) {
          if (arg.type === "spread") {
            for (const item of iterate(yield* this.evalAsyncExpr(arg.argument, env)))
              args.push(item);
          } else {
            args.push(yield* this.evalAsyncExpr(arg, env));
          }
        }

        return this.constructValue(ctor, args);
      }
      case "unary": {
        const { op } = expr;

        if (op === "typeof") {
          const { argument } = expr;

          if (argument.type === "identifier") {
            if (!env.has(argument.name)) return "undefined";

            return typeOf(env.get(argument.name));
          }

          return typeOf(yield* this.evalAsyncExpr(argument, env));
        }

        if (op === "delete") {
          const { argument } = expr;

          if (argument.type === "member") {
            if (argument.object.type === "super")
              throw new ReferenceError("'super' keyword unexpected here");

            const object = yield* this.evalAsyncExpr(argument.object, env);

            if (argument.optional && object == null) return true;

            const key = argument.computed
              ? toPropertyKey(yield* this.evalAsyncExpr(argument.property as Expression, env))
              : (argument.property as string);

            // oxlint-disable-next-line typescript/no-dynamic-delete -- `delete` operator semantics
            return delete (object as Record<PropertyKey, unknown>)[key];
          }

          if (argument.type === "identifier") {
            if (this.strict)
              throw new TypeError(`Cannot delete unqualified property '${argument.name}'`);

            return !env.has(argument.name);
          }

          yield* this.evalAsyncExpr(argument, env);

          return true;
        }

        if (op === "void") {
          yield* this.evalAsyncExpr(expr.argument, env);

          return void 0;
        }

        const value = yield* this.evalAsyncExpr(expr.argument, env);

        if (op === "+") {
          if (typeof value === "bigint")
            throw new TypeError("Cannot convert a BigInt value to a number");

          return toNumber(value);
        }

        if (op === "-") {
          if (typeof value === "bigint") return -value;

          return -toNumber(value);
        }

        if (op === "~") {
          if (typeof value === "bigint") {
            // eslint-disable-next-line no-bitwise -- bitwise NOT is the operator semantics
            return ~value;
          }

          // eslint-disable-next-line no-bitwise -- bitwise NOT is the operator semantics
          return ~toNumber(value);
        }

        return !toBoolean(value);
      }
      case "update": {
        const delta = (value: unknown): unknown => {
          if (typeof value === "bigint") return expr.op === "++" ? value + 1n : value - 1n;

          const num = toNumber(value);

          return expr.op === "++" ? num + 1 : num - 1;
        };
        const target = expr.argument;

        if (target.type === "identifier") {
          const old = env.get(target.name);
          const value = delta(old);

          env.set(target.name, value);

          return expr.prefix ? value : old;
        }

        if (target.type === "member") {
          const { object, key } = yield* this.evalAsyncMemberRef(target, env);
          const old = getProperty(object, key);
          const value = delta(old);

          setProperty(object, key, value);

          return expr.prefix ? value : old;
        }

        throw new TypeError("Invalid assignment target");
      }
      case "binary": {
        const left = yield* this.evalAsyncExpr(expr.left, env);
        const right = yield* this.evalAsyncExpr(expr.right, env);

        return binaryOp(expr.op, left, right);
      }
      case "logical": {
        const left = yield* this.evalAsyncExpr(expr.left, env);

        if (expr.op === "&&")
          return toBoolean(left) ? yield* this.evalAsyncExpr(expr.right, env) : left;
        if (expr.op === "||")
          return toBoolean(left) ? left : yield* this.evalAsyncExpr(expr.right, env);

        return left ?? (yield* this.evalAsyncExpr(expr.right, env));
      }
      case "conditional": {
        const test = yield* this.evalAsyncExpr(expr.test, env);

        return toBoolean(test)
          ? yield* this.evalAsyncExpr(expr.consequent, env)
          : yield* this.evalAsyncExpr(expr.alternate, env);
      }
      case "assignment": {
        return yield* this.evalAsyncAssignment(expr, env);
      }
      case "sequence": {
        let value: unknown = void 0;

        for (const item of expr.expressions) value = yield* this.evalAsyncExpr(item, env);

        return value;
      }
      case "arrow":
      case "functionExpr": {
        return this.makeFunction(expr, env);
      }
      case "classExpr": {
        return this.evalClass(expr.name, expr.superClass, expr.body, env);
      }
      case "template": {
        let result = expr.quasis[0].cooked;

        for (let i = 0; i < expr.expressions.length; i += 1) {
          result += toString(yield* this.evalAsyncExpr(expr.expressions[i], env));
          result += expr.quasis[i + 1].cooked;
        }

        return result;
      }
      case "await": {
        return yield* this.evalAwait(expr.argument, env);
      }
      default: {
        return this.evalExpression(expr, env);
      }
    }
  }

  /**
   * Evaluate an `await` expression: evaluate the operand, then suspend on thenables.
   *
   * 求值 `await` 表达式：求值操作数，遇 thenable 则挂起。
   *
   * @param operand - The awaited expression / 被等待的表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAwait(operand: Expression, env: Environment): Generator<unknown, unknown, unknown> {
    const value = yield* this.evalAsyncExpr(operand, env);

    if (isThenable(value)) return yield value;

    return value;
  }

  /**
   * Evaluate an async assignment expression (simple, compound and logical compound).
   *
   * 求值 async 赋值表达式（简单、复合与逻辑复合赋值）。
   *
   * @param expr - The assignment / 赋值
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncAssignment(
    expr: AssignmentExpr,
    env: Environment,
  ): Generator<unknown, unknown, unknown> {
    const { op, target, value: valueExpr } = expr;

    if (op === "=") {
      const value = yield* this.evalAsyncExpr(valueExpr, env);

      yield* this.evalAsyncAssignTo(target, value, env);

      return value;
    }

    if (op === "&&=" || op === "||=" || op === "??=") {
      const old = yield* this.evalAsyncReadTarget(target, env);

      if (op === "&&=") {
        if (!toBoolean(old)) return old;
      } else if (op === "||=") {
        if (toBoolean(old)) return old;
      } else if (old != null) {
        return old;
      }

      const value = yield* this.evalAsyncExpr(valueExpr, env);

      yield* this.evalAsyncAssignTo(target, value, env);

      return value;
    }

    const old = yield* this.evalAsyncReadTarget(target, env);
    const value = yield* this.evalAsyncExpr(valueExpr, env);
    const result = binaryOp(op.slice(0, -1) as BinaryOperator, old, value);

    yield* this.evalAsyncAssignTo(target, result, env);

    return result;
  }

  /**
   * Read the current value of an assignment target (async-aware member refs).
   *
   * 读取赋值目标的当前值（成员引用支持 async）。
   *
   * @param target - The target / 目标
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncReadTarget(
    target: AssignmentTarget,
    env: Environment,
  ): Generator<unknown, unknown, unknown> {
    if (target.type === "identifier") return env.get(target.name);

    if (target.type === "member") {
      const { object, key } = yield* this.evalAsyncMemberRef(target, env);

      return getProperty(object, key);
    }

    throw new TypeError("Invalid assignment target");
  }

  /**
   * Assign to an assignment target with async-aware member refs.
   *
   * 赋值到赋值目标（成员引用支持 async）。
   *
   * @param target - The target / 目标
   * @param env - Current environment / 当前环境
   * @param value - The value / 值
   * @param initialize - Whether this is a `let`/`const` initializer / 是否为 `let`/`const` 初始化
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncAssignTo(
    target: AssignmentTarget,
    value: unknown,
    env: Environment,
    initialize = false,
  ): Generator<unknown, void, unknown> {
    // ordinary targets have no `await`; delegate to the sync assigner
    // 普通目标不含 `await`，委托给同步赋值器
    if (!containsAwait(target)) {
      this.assignTo(target, value, env, initialize);

      return;
    }

    switch (target.type) {
      case "member": {
        const { object, key } = yield* this.evalAsyncMemberRef(target, env);

        setProperty(object, key, value);
        break;
      }
      case "objectPattern": {
        yield* this.evalAsyncAssignToObject(target, value, env, initialize);
        break;
      }
      case "arrayPattern": {
        yield* this.evalAsyncAssignToArray(target, value, env, initialize);
        break;
      }
      case "assignmentPattern": {
        if (isUndefined(value)) {
          yield* this.evalAsyncAssignTo(
            target.left,
            yield* this.evalAsyncExpr(target.right, env),
            env,
            initialize,
          );
        } else {
          yield* this.evalAsyncAssignTo(target.left, value, env, initialize);
        }
        break;
      }
      case "rest": {
        yield* this.evalAsyncAssignTo(target.argument, value, env, initialize);
        break;
      }
      default: {
        throw new Error("Unreachable pattern");
      }
    }
  }

  /**
   * Resolve a member reference with async-aware object/key evaluation.
   *
   * 解析成员引用（object/key 支持 async 求值）。
   *
   * @param node - The member expression / 成员表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator, completing with the object and key / 生成器，完成值为对象与键
   */
  private *evalAsyncMemberRef(
    node: MemberExpr,
    env: Environment,
  ): Generator<unknown, { object: unknown; key: PropertyKey }, unknown> {
    if (node.object.type === "super") {
      const ctx = this.currentContext();

      if (ctx == null || ctx.superBase == null)
        throw new ReferenceError("'super' keyword unexpected here");

      const key = node.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(node.property as Expression, env))
        : (node.property as string);

      return { object: ctx.thisRef.value, key };
    }

    const object = yield* this.evalAsyncExpr(node.object, env);
    const key = node.computed
      ? toPropertyKey(yield* this.evalAsyncExpr(node.property as Expression, env))
      : (node.property as string);

    return { object, key };
  }

  /**
   * Evaluate an async object literal (shorthand, computed keys, methods, spread, `__proto__`).
   *
   * 求值 async 对象字面量（简写、计算键、方法、展开、`__proto__`）。
   *
   * @param node - The object / 对象
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncObject(
    node: ObjectExpr,
    env: Environment,
  ): Generator<unknown, Record<PropertyKey, unknown>, unknown> {
    const obj: Record<PropertyKey, unknown> = {};

    for (const prop of node.props) {
      if (prop.type === "spreadProperty") {
        const source = yield* this.evalAsyncExpr(prop.argument, env);

        if (source != null && (typeof source === "object" || typeof source === "function")) {
          for (const key of Object.keys(source))
            obj[key] = (source as Record<string, unknown>)[key];
        }

        continue;
      }

      const key = prop.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(prop.key as Expression, env))
        : (prop.key as string);

      if (prop.kind === "get" || prop.kind === "set") {
        const fn = this.makeFunction(prop.value as FunctionExpr, env, {
          superBase: Object.getPrototypeOf(obj) as object | null,
        });
        const descriptor: PropertyDescriptor = { enumerable: true, configurable: true };

        if (prop.kind === "get") descriptor.get = fn;
        else descriptor.set = fn as (value: unknown) => void;

        Object.defineProperty(obj, key, descriptor);
        continue;
      }

      const { value } = prop;

      if (value.type === "functionExpr" || value.type === "arrow") {
        // method shorthand: home object is `obj`
        // 方法简写：home object 为 `obj`
        const fn = this.makeFunction(value, env, {
          superBase: Object.getPrototypeOf(obj) as object | null,
        });

        Object.defineProperty(obj, key, {
          value: fn,
          writable: true,
          configurable: true,
          enumerable: true,
        });
        continue;
      }

      const propValue = yield* this.evalAsyncExpr(value, env);

      if (key === "__proto__" && !prop.computed) {
        if (propValue != null && (typeof propValue === "object" || typeof propValue === "function"))
          Object.setPrototypeOf(obj, propValue);
        continue;
      }

      obj[key] = propValue;
    }

    return obj;
  }

  /**
   * Destructure an async array pattern (with elisions, defaults and rest).
   *
   * 解构 async 数组模式（含空位、默认值与 rest）。
   *
   * @param target - The array pattern / 数组模式
   * @param value - The iterable value / 可迭代值
   * @param env - Current environment / 当前环境
   * @param initialize - Whether this is a `let`/`const` initializer / 是否为 `let`/`const` 初始化
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncAssignToArray(
    target: ArrayPattern,
    value: unknown,
    env: Environment,
    initialize: boolean,
  ): Generator<unknown, void, unknown> {
    if (value == null) {
      throw new TypeError(
        `Cannot destructure '${typeof value === "object" ? "null" : "undefined"}'`,
      );
    }

    const iterator = iterate(value);

    for (const element of target.elements) {
      if (element == null) {
        iterator.next();
        continue;
      }

      if (element.type === "rest") {
        const rest: unknown[] = [];

        for (;;) {
          const step = iterator.next();

          if (step.done) break;
          rest.push(step.value);
        }

        yield* this.evalAsyncAssignTo(element.argument, rest, env, initialize);
        break;
      }

      const step = iterator.next();

      yield* this.evalAsyncAssignTo(element, step.done ? void 0 : step.value, env, initialize);
    }
  }

  /**
   * Destructure an async object pattern (with computed keys, defaults and rest).
   *
   * 解构 async 对象模式（含计算键、默认值与 rest）。
   *
   * @param target - The object pattern / 对象模式
   * @param value - The source value / 源值
   * @param env - Current environment / 当前环境
   * @param initialize - Whether this is a `let`/`const` initializer / 是否为 `let`/`const` 初始化
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncAssignToObject(
    target: ObjectPattern,
    value: unknown,
    env: Environment,
    initialize: boolean,
  ): Generator<unknown, void, unknown> {
    if (value == null) {
      throw new TypeError(
        `Cannot destructure '${typeof value === "object" ? "null" : "undefined"}'`,
      );
    }

    // oxlint-disable-next-line unicorn/new-for-builtins -- ToObject conversion
    const source = Object(value) as Record<PropertyKey, unknown>;
    const taken = new Set<string>();

    for (const prop of target.props) {
      const key = prop.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(prop.key as Expression, env))
        : (prop.key as string);

      if (typeof key === "string") taken.add(key);
      if (prop.value != null)
        yield* this.evalAsyncAssignTo(prop.value, source[key], env, initialize);
    }

    if (target.rest != null) {
      const rest: Record<string, unknown> = {};

      for (const key of Object.keys(source)) if (!taken.has(key)) rest[key] = source[key];

      yield* this.evalAsyncAssignTo(target.rest.argument, rest, env, initialize);
    }
  }

  /**
   * Call any callable value from an async context (host or interpreter function).
   *
   * 在 async 上下文中调用任意可调用值（宿主或解释器函数）。
   *
   * @param callee - The callable / 可调用值
   * @param args - Arguments / 参数
   * @param thisArg - The `this` value / `this` 值
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  private *evalAsyncCallValue(
    callee: unknown,
    args: unknown[],
    thisArg: unknown,
  ): Generator<unknown, unknown, unknown> {
    if (typeof callee !== "function") throw new TypeError(`${typeOf(callee)} is not a function`);

    const meta = getInterpreterMeta(callee);

    if (meta == null) return Reflect.apply(callee, thisArg, args) as unknown;

    // async functions return a host Promise; async-context arrows run inline
    // async 函数返回宿主 Promise；async 上下文箭头内联运行
    if (meta.isAsync) return this.invokeFunction(meta, args, thisArg, false);

    if (meta.containsAwait) return yield* this.asyncBodyGenerator(meta, args, thisArg);

    return this.invokeFunction(meta, args, thisArg, false);
  }
}

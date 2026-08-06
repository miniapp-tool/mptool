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
 * Async support is **not** implemented in this round: `await` expressions and async function calls
 * throw `"not implemented yet"`. The `asyncCount` counter and the explicit execution-context stack
 * are the extension points for the upcoming frame-based async round.
 *
 * `Runtime` 持有沙箱全局对象、全局 `Environment`、步数/栈上限与显式执行上下文栈（解析 `this`/`super`）。 它通过递归树遍历求值已解析的
 * `Program`；控制流（`return`/`break`/`continue`/`throw`）使用内部信号对象 沿树抛出，并在相应边界捕获。全部内建均为委托宿主的宿主值（设计文档
 * §4.4）。
 *
 * 本轮**不实现** async：`await` 表达式与 async 函数调用直接抛 "not implemented yet"。`asyncCount` 计数器与显式执行上下文栈是后续帧式
 * async 轮次的扩展点。
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
    this.stackDepth += 1;

    if (this.stackDepth > this.maxStack)
      throw new Error(`Maximum call stack size exceeded (limit ${this.maxStack})`);

    try {
      if (meta.isAsync) throw new Error("async functions are not implemented yet");

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

        try {
          result = this.evalFunctionBody(meta.body, env);
        } catch (err) {
          if (err instanceof ThrowSignalError) throw err.value;
          throw err;
        }

        if (isConstruct) {
          if ((typeof result === "object" && result != null) || typeof result === "function")
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
   * Evaluate a function body, catching `return` signals.
   *
   * 求值函数体，捕获 `return` 信号。
   *
   * @param body - The function body / 函数体
   * @param env - Current environment / 当前环境
   * @returns The returned value / 返回值
   */
  private evalFunctionBody(body: BlockStatement | Expression, env: Environment): unknown {
    if (body.type === "block") {
      try {
        return this.evalBlock(body, env);
      } catch (err) {
        if (err instanceof ReturnSignalError) return err.value;
        throw err;
      }
    }

    return this.evalExpression(body, env);
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
      let result: unknown;

      try {
        result = this.evalFunctionBody(parentMeta.body, env);
      } catch (err) {
        if (err instanceof ThrowSignalError) throw err.value;
        throw err;
      }

      if ((typeof result === "object" && result != null) || typeof result === "function")
        ctx.thisRef.value = result;

      return result;
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
        lexicalThis: null,
        lexicalSuperBase: null,
        lexicalSuperClass: null,
        callee: null,
      },
      this.invokeHandler,
    );
  }
}

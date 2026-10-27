// oxlint-disable complexity max-lines-per-function max-statements max-lines
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
import { BreakSignalError } from "./breakSignalError.js";
import { ContinueSignalError } from "./continueSignalError.js";
import { Environment } from "./environment.js";
import type { FeatureOptions } from "./parser.js";
import { getFunctionSource } from "./parser.js";
import { ReturnSignalError } from "./returnSignalError.js";
import { ThrowSignalError } from "./throwSignalError.js";
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

  /**
   * Whether to automatically expose every own property of the host global object (`globalThis`) to
   * the sandbox, `false` by default
   *
   * 是否自动将宿主全局对象（`globalThis`）的全部自有属性暴露到沙箱，默认 `false`
   */
  global?: boolean;

  /** Max steps before aborting, `1e6` by default / 步数上限，默认 `1e6` */
  maxSteps?: number;

  /** Max call stack depth before aborting, `512` by default / 调用栈深度上限，默认 `512` */
  maxStack?: number;

  /**
   * Wall-clock budget in milliseconds for one run, unlimited by default
   *
   * 单次运行的挂钟时间预算（毫秒），默认不限制
   */
  maxDuration?: number;

  /** Whether the program runs in strict mode, `false` by default / 是否严格模式，默认 `false` */
  strict?: boolean;

  /** Feature toggles / 特性开关 */
  features?: Partial<FeatureOptions>;

  /**
   * Reject async function invocation synchronously instead of starting the async runner, used by
   * `runSync` so a synchronous run never leaves a pending async chain behind
   *
   * 同步拒绝 async 函数调用（不启动 async 运行器），供 `runSync` 使用，避免同步运行留下挂起的 async 链
   *
   * @internal
   */
  forbidAsync?: boolean;
}

/**
 * Error message used when async code is executed through a synchronous API.
 *
 * 同步 API 执行 async 代码时使用的错误信息。
 */
export const ASYNC_UNSUPPORTED_MESSAGE =
  "The code triggered async operations, which runSync does not support";

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
 * Memoized subtree scans. AST nodes are immutable after parsing, so a scan result can be cached per
 * node; async loops otherwise re-walk every statement/expression on every iteration.
 *
 * 子树扫描缓存。AST 节点解析后不可变，因此结果可按节点缓存；否则 async 循环每轮都会重复整树遍历。
 */
const awaitCache = new WeakMap<object, boolean>();
const callCache = new WeakMap<object, boolean>();
const controlFlowCache = new WeakMap<object, boolean>();
const safeStatementCache = new WeakMap<object, boolean>();
const safeExpressionCache = new WeakMap<object, boolean>();

/**
 * Run `walkContains` with a per-node cache.
 *
 * 带节点缓存的 `walkContains`。
 *
 * @param cache - The cache / 缓存
 * @param node - The node or value / 节点或值
 * @param pred - Type predicate / 类型谓词
 * @returns Whether any node matches / 是否存在匹配节点
 */
const cachedWalk = (
  cache: WeakMap<object, boolean>,
  node: object,
  pred: (type: string) => boolean,
): boolean => {
  const cached = cache.get(node);

  if (cached != null) return cached;

  const result = walkContains(node, pred);

  cache.set(node, result);

  return result;
};

/**
 * Whether a node subtree contains an `await` expression / 子树是否含 `await` 表达式
 *
 * @param node - The node or value / 节点或值
 * @returns Whether it contains `await` / 是否含 `await`
 */
const containsAwait = (node: object): boolean =>
  cachedWalk(awaitCache, node, (type) => type === "await");

/**
 * Whether a node subtree contains a call or `new` / 子树是否含调用或 `new`
 *
 * @param node - The node or value / 节点或值
 * @returns Whether it contains a call or `new` / 是否含调用或 `new`
 */
const containsCall = (node: object): boolean =>
  cachedWalk(callCache, node, (type) => type === "call" || type === "new");

/**
 * Whether a node subtree contains control-flow altering statements / 子树是否含改变控制流的语句
 *
 * @param node - The node or value / 节点或值
 * @returns Whether it contains control flow / 是否含控制流
 */
const containsControlFlow = (node: object): boolean =>
  cachedWalk(
    controlFlowCache,
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
const isSafeSyncStatement = (stmt: Statement): boolean => {
  const cached = safeStatementCache.get(stmt);

  if (cached != null) return cached;

  const result = !containsAwait(stmt) && !containsCall(stmt) && !containsControlFlow(stmt);

  safeStatementCache.set(stmt, result);

  return result;
};

/**
 * Whether an expression can be evaluated synchronously inside an async body / 表达式是否可在 async 体内同步求值
 *
 * @param expr - The expression / 表达式
 * @returns Whether it is safe to evaluate synchronously / 是否可安全同步求值
 */
const isSafeSyncExpression = (expr: Expression): boolean => {
  const cached = safeExpressionCache.get(expr);

  if (cached != null) return cached;

  const result = !containsAwait(expr) && !containsCall(expr);

  safeExpressionCache.set(expr, result);

  return result;
};

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
 * Own enumerable property keys, including symbols (ECMAScript CopyDataProperties semantics).
 *
 * 自身的可枚举属性键，包含 symbol（ECMAScript CopyDataProperties 语义）。
 *
 * @param source - Source object / 源对象
 * @returns Enumerable own keys / 可枚举的自有键
 */
const ownEnumerableKeys = (source: object): PropertyKey[] => [
  ...Object.keys(source),
  ...Object.getOwnPropertySymbols(source).filter(
    (symbol) => Object.getOwnPropertyDescriptor(source, symbol)?.enumerable === true,
  ),
];

/**
 * Sentinel returned by optional-chain evaluation when a link short-circuits the whole chain.
 *
 * 可选链某一链节短路时由链求值返回的哨兵值。
 */
const SHORT_CIRCUIT = Symbol("short-circuit");

/**
 * `ToString` for template interpolation: unlike `String(value)`, interpolating a Symbol throws a
 * `TypeError` (`${Symbol()}` is a TypeError in the specification).
 *
 * 模板插值使用的 `ToString`：与 `String(value)` 不同，插值 Symbol 会抛 `TypeError`（规范中 `${Symbol()}` 是 TypeError）。
 *
 * @param value - The interpolated value / 插值
 * @returns The string form / 字符串形式
 */
const toTemplateString = (value: unknown): string => {
  if (typeof value === "symbol") throw new TypeError("Cannot convert a Symbol value to a string");

  return toString(value);
};

/**
 * Whether a member/call expression belongs to an optional chain (has a `?.` link on its spine).
 *
 * 成员/调用表达式是否属于可选链（脊上存在 `?.` 链节）。
 *
 * @param node - Member/call expression / 成员或调用表达式
 * @returns Whether it contains an optional link / 是否含可选链节
 */
const containsOptionalChain = (node: MemberExpr | CallExpr): boolean => {
  let current: Expression = node;

  while (current.type === "member" || current.type === "call") {
    if (current.optional) return true;

    current = current.type === "member" ? current.object : current.callee;
  }

  return false;
};

/**
 * A resolved assignment target: the member object/key (or binding name) is evaluated exactly once,
 * then the reference can be read and written without re-evaluating side effects.
 *
 * 已解析的赋值目标：成员对象/键（或绑定名）只求值一次，之后可反复读取/写入而不会重复副作用。
 */
interface TargetReference {
  get: () => unknown;
  set: (value: unknown) => void;
}

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
    /* istanbul ignore next -- BinaryOperator is exhaustively handled above */
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
  // any non-simple parameter (default / destructuring / rest) disables parameter mapping entirely
  // 任一非简单参数（默认值/解构/rest）都会关闭整个 arguments 的参数映射
  const mapped = sloppy && simpleParamNames.every((name) => name != null);

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

    if (mapped && paramName != null) {
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

  // arguments is iterable over its current (possibly mapped) values
  // arguments 可迭代，读取当前的（可能是映射后的）值
  const createArgumentsIterator = (): IterableIterator<unknown> => {
    let index = 0;

    return {
      next(): IteratorResult<unknown> {
        if (index >= args.length) return { done: true, value: void 0 };

        const value = argsObject[index];

        index += 1;

        return { done: false, value };
      },
      [Symbol.iterator](): IterableIterator<unknown> {
        return this;
      },
    };
  };

  Object.defineProperty(argsObject, Symbol.iterator, {
    value: createArgumentsIterator,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(argsObject, Symbol.toStringTag, {
    value: "Arguments",
    writable: false,
    enumerable: false,
    configurable: true,
  });

  env.define("arguments", argsObject);
};

/**
 * Apply NamedEvaluation to an anonymous function assigned to a binding / property.
 *
 * 对赋值给绑定/属性的匿名函数应用 NamedEvaluation。
 *
 * @param value - The assigned value / 赋值
 * @param name - The inferred name / 推断出的名称
 */
const inferFunctionName = (value: unknown, name: string | null): void => {
  /* istanbul ignore if -- callers only pass a non-empty binding name and a function value */
  if (name == null || name === "" || typeof value !== "function") {
    /* istanbul ignore next -- same invariant */
    return;
  }

  const meta = getInterpreterMeta(value);

  /* istanbul ignore if -- interpreter functions always carry metadata; only anonymous ones reach here */
  if (meta == null || meta.name != null) {
    /* istanbul ignore next -- same invariant */
    return;
  }

  Object.defineProperty(value, "name", { value: name, configurable: true });
};

/**
 * Whether an expression is an anonymous function definition eligible for NamedEvaluation.
 *
 * @param node - Expression node / 表达式节点
 * @returns Whether the expression can receive an inferred name / 是否可推断名称
 */
const isAnonymousFunctionDefinition = (node: unknown): boolean => {
  if (node == null || typeof node !== "object") return false;

  const expression = node as { name?: string | null; type?: string };

  return (
    expression.type === "arrow" || (expression.type === "functionExpr" && expression.name == null)
  );
};

/**
 * Close an iterator on abrupt loop exit (`break` / `return` / throw), per IteratorClose.
 *
 * 循环异常退出（`break` / `return` / 抛出）时按 IteratorClose 关闭迭代器。
 *
 * @param iterator - The iterator / 迭代器
 */
const closeIterator = (iterator: IterableIterator<unknown>): void => {
  const close = (iterator as { return?: () => unknown }).return;

  if (typeof close === "function") {
    try {
      close.call(iterator);
    } catch {
      // errors from `return()` are ignored when the loop is already completing abruptly
      // 循环已异常结束时忽略 `return()` 抛出的错误
    }
  }
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
/**
 * Host globals that must never be injected by `global: true`.
 *
 * `global: true` 绝不注入的宿主全局（`eval` / `Function`）。
 */
const HOST_GLOBAL_BLOCKLIST: ReadonlySet<string> = new Set(["eval", "Function"]);

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

  /** Whether an async function was invoked during the current run / 本次 run 是否调用过 async 函数 */
  asyncStarted = false;

  /**
   * Pending async operation count — extension point for the future async round / 挂起的 async 操作计数——后续
   * async 轮次的扩展点
   */
  asyncCount = 0;

  /** Execution context stack / 执行上下文栈 */
  private readonly contextStack: RuntimeContext[] = [];

  /** Routing callback passed to interpreter function wrappers / 传给解释器函数包装的路由回调 */
  private readonly invokeHandler: InterpreterInvoke;

  /** Whether async invocation is rejected synchronously / 是否同步拒绝 async 调用 */
  private readonly forbidAsync: boolean;

  /** Wall-clock budget in milliseconds, `Infinity` when disabled / 挂钟预算（毫秒），关闭时为 `Infinity` */
  private readonly maxDuration: number;

  /** Absolute deadline timestamp, `Infinity` when disabled / 绝对截止时间，关闭时为 `Infinity` */
  private deadline = Number.POSITIVE_INFINITY;

  /** Number of in-flight `run()` calls / 进行中的 `run()` 数量 */
  private activeRuns = 0;

  /** Number of async invocations that have not settled yet / 尚未结算的 async 调用数 */
  private pendingAsync = 0;

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
    this.maxDuration = options.maxDuration ?? Number.POSITIVE_INFINITY;
    this.forbidAsync = options.forbidAsync ?? false;

    this.globalObject = {};
    this.globalEnv = new Environment(null, true, this.globalObject);

    this.installBuiltins();

    if (options.globals != null) {
      for (const [name, value] of Object.entries(options.globals))
        this.globalEnv.define(name, value);
    }

    // `global: true` exposes every own property of the host global object
    // `global: true` 将宿主全局对象（globalThis）的全部自有属性暴露到沙箱
    //
    // `globalThis` is natively supported by the miniprogram base library 3.8.2 logic layer
    // (iOS 14 JSCore + Chrome 86 V8 — per miniprogram-compat, no `es.global-this` polyfill is
    // required from 3.6.1 on). The `typeof` guard is a cheap safety net for non-standard hosts;
    // when absent the option simply injects nothing.
    // `globalThis` 在微信基础库 3.8.2 逻辑层为原生支持（iOS 14 JSCore + Chrome 86 V8——
    // 见 miniprogram-compat，3.6.1 起无需 `es.global-this` polyfill）。typeof 守卫为非标准宿主
    // 兜底；不存在时该选项不注入任何内容。
    if (options.global && typeof globalThis !== "undefined") {
      const hostGlobal = globalThis as Record<string, unknown>;

      for (const name of Object.getOwnPropertyNames(hostGlobal)) {
        if (HOST_GLOBAL_BLOCKLIST.has(name)) continue;

        if (this.globalEnv.has(name)) continue;

        try {
          this.globalEnv.define(name, hostGlobal[name]);
        } catch {
          // skip properties whose accessor throws
          // 跳过访问即抛错的属性
        }
      }
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
    return this.runWithStatus(program).value;
  }

  /**
   * Execute a parsed program and report whether async code was started.
   *
   * 执行已解析的 program，并报告是否启动过 async 代码。
   *
   * @param program - The parsed program / 已解析的 program
   * @returns The completion value and the async flag / 完成值与 async 标记
   */
  runWithStatus(program: Program): { value: unknown; asyncStarted: boolean } {
    this.deadline =
      this.maxDuration === Number.POSITIVE_INFINITY
        ? Number.POSITIVE_INFINITY
        : Date.now() + this.maxDuration;

    // one Runtime owns one execution state (step/stack/context); concurrent or nested runs would
    // reset it mid-execution, so the contract is strictly serial
    // 一个 Runtime 只有一份执行状态（步数/栈/上下文），并发或嵌套 run 会中途重置它，因此契约是严格串行
    if (this.activeRuns > 0 || this.pendingAsync > 0) {
      throw new Error(
        "Runtime is not reentrant: await the previous run() before starting another one",
      );
    }

    this.activeRuns += 1;
    this.stepCount = 0;
    this.stackDepth = 0;
    this.asyncStarted = false;
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
      this.predeclareLexical(program.body, this.globalEnv);

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

        return { value: completion, asyncStarted: this.asyncStarted };
      } finally {
        this.contextStack.length = 0;
      }
    } finally {
      this.activeRuns -= 1;
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

    this.checkDeadline();
  }

  /**
   * Abort when the wall-clock budget is exhausted.
   *
   * 挂钟预算耗尽时中止执行。
   *
   * The deadline can only be observed between interpreted steps and around host calls: a single
   * host call (or a pending promise the host never settles) cannot be interrupted.
   *
   * 截止时间只能解释步进之间与宿主调用前后观测；单个宿主调用（或永不结算的宿主 Promise）无法被打断。
   */
  private checkDeadline(): void {
    if (this.deadline !== Number.POSITIVE_INFINITY && Date.now() > this.deadline)
      throw new Error(`Execution aborted: exceeded ${this.maxDuration} ms time limit`);
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
    return (
      this.contextStack[this.contextStack.length - 1] ??
      /* istanbul ignore next -- every evaluation runs with at least one context frame */
      null
    );
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
      /* istanbul ignore next -- Statement is exhaustively handled above */
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

    this.predeclareLexical(block.body, env);
    this.instantiateBlockFunctions(block.body, env);

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
      for (const decl of stmt.declarations) {
        if (decl.init != null) {
          this.assignTo(
            decl.id,
            this.evalExpression(decl.init, env),
            env,
            false,
            isAnonymousFunctionDefinition(decl.init),
          );
        }
      }

      return;
    }

    // `let`/`const`: declare all names first (TDZ), then evaluate initializers
    // `let`/`const`：先声明全部名称（TDZ），再求值初始化器
    for (const decl of stmt.declarations) this.declarePattern(decl.id, env, stmt.kind);

    for (const decl of stmt.declarations) {
      const value = decl.init == null ? void 0 : this.evalExpression(decl.init, env);

      this.assignTo(decl.id, value, env, true, isAnonymousFunctionDefinition(decl.init));
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

    // `for...in` over `null`/`undefined` iterates zero times (spec)
    // `for...in` 对 `null`/`undefined` 迭代零次（规范）
    if (right == null) return;

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

        // abrupt exits (break / return / throw) close the iterator
        // 异常退出（break / return / 抛出）关闭迭代器
        closeIterator(iterator);

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

    // the switch body is a single block scope for all cases
    // switch 体是所有 case 共享的单个块作用域
    const switchEnv = new Environment(env, false);
    const caseStatements = stmt.cases.flatMap((caseNode) => caseNode.body);

    this.predeclareLexical(caseStatements, switchEnv);
    this.instantiateBlockFunctions(caseStatements, switchEnv);

    for (let i = index; i < stmt.cases.length; i += 1) {
      try {
        for (const st of stmt.cases[i].body) this.evalStatement(st, switchEnv);
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
   * Collect every `var` name declared anywhere in a statement list (not entering nested functions
   * or classes), used for `var` vs lexical conflict checks.
   *
   * 收集语句列表中任意位置声明的 `var` 名称（不进入嵌套函数或类），用于 var 与词法声明冲突检查。
   *
   * @param statements - Statements to scan / 待扫描语句
   * @param out - Collected names / 收集结果
   */
  private collectVarNames(statements: readonly Statement[], out: Set<string>): void {
    const addPattern = (pattern: AssignmentTarget): void => {
      const names: string[] = [];

      this.collectNames(pattern, names);

      for (const name of names) out.add(name);
    };

    for (const stmt of statements) {
      switch (stmt.type) {
        case "variable": {
          if (stmt.kind === "var") for (const decl of stmt.declarations) addPattern(decl.id);
          break;
        }
        case "block": {
          this.collectVarNames(stmt.body, out);
          break;
        }
        case "if": {
          this.collectVarNames([stmt.consequent], out);
          if (stmt.alternate != null) this.collectVarNames([stmt.alternate], out);
          break;
        }
        case "while":
        case "doWhile": {
          this.collectVarNames([stmt.body], out);
          break;
        }
        case "for": {
          if (stmt.init != null && stmt.init.type === "variable" && stmt.init.kind === "var")
            for (const decl of stmt.init.declarations) addPattern(decl.id);
          this.collectVarNames([stmt.body], out);
          break;
        }
        case "forIn":
        case "forOf": {
          if (stmt.left.type === "variable" && stmt.left.kind === "var")
            for (const decl of stmt.left.declarations) addPattern(decl.id);
          this.collectVarNames([stmt.body], out);
          break;
        }
        case "switch": {
          for (const caseNode of stmt.cases) this.collectVarNames(caseNode.body, out);
          break;
        }
        case "try": {
          this.collectVarNames(stmt.block.body, out);
          if (stmt.handler != null) this.collectVarNames(stmt.handler.body.body, out);
          if (stmt.finalizer != null) this.collectVarNames(stmt.finalizer.body, out);
          break;
        }
        case "labeled": {
          this.collectVarNames([stmt.body], out);
          break;
        }
        default: {
          break;
        }
      }
    }
  }

  /**
   * Predeclare the lexical bindings (`let`/`const`/`class`) of a statement list in TDZ, rejecting
   * duplicate declarations and conflicts with `var`/function names.
   *
   * 以 TDZ 预声明语句列表的词法绑定（let/const/class），并拒绝重复声明及与 var/函数名的冲突。
   *
   * @param statements - Statements of the scope / 作用域语句
   * @param env - Target environment / 目标环境
   */
  private predeclareLexical(statements: readonly Statement[], env: Environment): void {
    const names = new Set<string>();
    const declarations: { name: string; kind: "let" | "const" }[] = [];

    const declare = (name: string, kind: "let" | "const"): void => {
      if (names.has(name)) throw new SyntaxError(`Identifier '${name}' has already been declared`);

      names.add(name);
      declarations.push({ name, kind });
    };

    for (const stmt of statements) {
      if (stmt.type === "variable" && stmt.kind !== "var") {
        const patternNames: string[] = [];

        for (const decl of stmt.declarations) this.collectNames(decl.id, patternNames);

        for (const name of patternNames) declare(name, stmt.kind);
      } else if (stmt.type === "classDeclaration") {
        declare(stmt.name, "let");
      }
    }

    if (declarations.length === 0) return;

    const varNames = new Set<string>();

    this.collectVarNames(statements, varNames);

    // direct function declarations are var-scoped in the same list
    // 同列表中的直接函数声明按 var 作用域处理
    for (const stmt of statements) if (stmt.type === "functionDeclaration") varNames.add(stmt.name);

    for (const { name } of declarations) {
      if (varNames.has(name))
        throw new SyntaxError(`Identifier '${name}' has already been declared`);
    }

    // parameters / hoisted bindings already present in the same environment conflict as well
    // （全局环境除外：宿主注入的全局属性允许被 let/const 遮蔽）
    if (env !== this.globalEnv) {
      for (const { name } of declarations) {
        if (env.hasOwn(name))
          throw new SyntaxError(`Identifier '${name}' has already been declared`);
      }
    }

    for (const { name, kind } of declarations) {
      if (kind === "const") env.declareConst(name);
      else env.declareLet(name);
    }
  }

  /**
   * Instantiate block-level function declarations of a statement list in the block environment.
   *
   * 在块环境中实例化语句列表里的块级函数声明。
   *
   * @param statements - Statements of the block / 块语句
   * @param env - Block environment / 块环境
   */
  private instantiateBlockFunctions(statements: readonly Statement[], env: Environment): void {
    for (const stmt of statements) {
      if (stmt.type !== "functionDeclaration") continue;

      const fn = this.createFunction({
        name: stmt.name,
        params: stmt.params,
        body: stmt.body,
        closure: env,
        thisMode: this.strict ? "strict" : "sloppy",
        isAsync: stmt.isAsync,
        prototype: null,
        superBase: null,
        sourceText:
          getFunctionSource(stmt) ??
          /* istanbul ignore next -- the parser registers source text for every function node */
          void 0,
      });

      env.define(stmt.name, fn);

      // Annex B: in sloppy mode the block function is also written to the function-scoped var
      // Annex B：sloppy 模式下块内函数同时写入函数作用域的 var 绑定
      if (!this.strict) env.functionScope.set(stmt.name, fn);
    }
  }

  /**
   * Hoist top-level `var` names and function declarations into `env`.
   *
   * 将顶层 `var` 名称与函数声明提升到 `env`。
   *
   * @param statements - Program body / program 主体
   * @param env - Global environment / 全局环境
   */
  private hoistProgram(statements: readonly Statement[], env: Environment): void {
    this.hoistStatements(statements, env, true);
  }

  /**
   * Recursively hoist `var` names and function declarations (not entering nested functions or
   * classes) into the function scope.
   *
   * 递归地将 `var` 名称与函数声明提升到函数作用域（不进入嵌套函数或类）。
   *
   * @param statements - Statements to scan / 待扫描的语句
   * @param env - The function environment / 函数环境
   * @param direct - Whether the list is a program/function body (function hoisting) / 是否为
   *   program/函数体语句列表（决定函数声明提升方式）
   */
  private hoistStatements(
    statements: readonly Statement[],
    env: Environment,
    direct: boolean,
  ): void {
    for (const stmt of statements) {
      switch (stmt.type) {
        case "variable": {
          if (stmt.kind === "var")
            for (const decl of stmt.declarations) this.hoistVar(decl.id, env);
          break;
        }
        case "functionDeclaration": {
          // function declarations directly in a program / function body are hoisted with their
          // value; declarations inside blocks are block-scoped (created when the block runs) and
          // only get an Annex B var binding in sloppy mode
          // 直接位于 program / 函数体的函数声明连同值一起提升；块内函数是块级绑定（进入块时创建），
          // 仅在 sloppy 模式下额外获得 Annex B 的 var 绑定
          if (direct) {
            const fn = this.createFunction({
              name: stmt.name,
              params: stmt.params,
              body: stmt.body,
              closure: env,
              thisMode: this.strict ? "strict" : "sloppy",
              isAsync: stmt.isAsync,
              prototype: null,
              superBase: null,
              sourceText:
                getFunctionSource(stmt) ??
                /* istanbul ignore next -- the parser registers source text for every function node */
                void 0,
            });

            env.declareVar(stmt.name);
            env.set(stmt.name, fn);
          } else if (!this.strict) {
            env.declareVar(stmt.name);
          }
          break;
        }
        case "block": {
          this.hoistStatements(stmt.body, env, false);
          break;
        }
        case "if": {
          this.hoistStatements([stmt.consequent], env, false);
          if (stmt.alternate != null) this.hoistStatements([stmt.alternate], env, false);
          break;
        }
        case "while":
        case "doWhile": {
          this.hoistStatements([stmt.body], env, false);
          break;
        }
        case "for": {
          if (stmt.init != null && stmt.init.type === "variable" && stmt.init.kind === "var")
            for (const decl of stmt.init.declarations) this.hoistVar(decl.id, env);
          this.hoistStatements([stmt.body], env, false);
          break;
        }
        case "forIn":
        case "forOf": {
          if (stmt.left.type === "variable" && stmt.left.kind === "var")
            for (const decl of stmt.left.declarations) this.hoistVar(decl.id, env);
          this.hoistStatements([stmt.body], env, false);
          break;
        }
        case "switch": {
          for (const caseNode of stmt.cases) this.hoistStatements(caseNode.body, env, false);
          break;
        }
        case "try": {
          this.hoistStatements(stmt.block.body, env, false);
          if (stmt.handler != null) this.hoistStatements(stmt.handler.body.body, env, false);
          if (stmt.finalizer != null) this.hoistStatements(stmt.finalizer.body, env, false);
          break;
        }
        case "labeled": {
          this.hoistStatements([stmt.body], env, false);
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
          /* istanbul ignore else -- the parser never emits an object-pattern property without a value */
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
      /* istanbul ignore next -- callers unwrap rest targets before collecting declaration names */
      case "rest": {
        this.collectNames(pattern.argument, out);
        break;
      }
      /* istanbul ignore next -- AssignmentTarget is exhaustively handled above */
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
  /**
   * Write a property with ECMAScript sloppy/strict assignment semantics.
   *
   * 按 ECMAScript sloppy/严格模式语义写入属性。
   *
   * In sloppy mode a failed write (read-only property, getter-only accessor, non-extensible object)
   * and a write on a primitive receiver are silent no-ops; in strict mode they throw `TypeError`.
   * This module is ESM and therefore always strict, so `object[key] = value` must not be used
   * directly — it would throw for sloppy code as well.
   *
   * Sloppy 模式下写入失败（只读属性、只有 getter、不可扩展对象）以及原始值接收者上的写入都会静默失败； 严格模式抛 `TypeError`。本模块是
   * ESM（始终严格），因此不能直接使用 `object[key] = value`，否则 sloppy 代码也会抛错。
   *
   * @param object - The receiver / 接收者
   * @param key - The property key / 属性键
   * @param value - New value / 新值
   */
  private writeProperty(object: unknown, key: PropertyKey, value: unknown): void {
    if (object == null) {
      throw new TypeError(
        `Cannot set properties of ${typeof object === "object" ? "null" : "undefined"} (setting '${String(key)}')`,
      );
    }

    const type = typeof object;

    if (type !== "object" && type !== "function") {
      if (this.strict)
        throw new TypeError(`Cannot create property '${String(key)}' on ${type} value`);

      return;
    }

    if (!Reflect.set(object, key, value) && this.strict)
      throw new TypeError(`Cannot assign to read only property '${String(key)}'`);
  }

  // oxlint-disable-next-line max-params -- initialize + namedEvaluation are independent flags
  private assignTo(
    target: AssignmentTarget,
    value: unknown,
    env: Environment,
    initialize = false,
    namedEvaluation = false,
  ): void {
    switch (target.type) {
      case "identifier": {
        if (this.strict && (target.name === "eval" || target.name === "arguments"))
          throw new SyntaxError("Unexpected eval or arguments in strict mode");

        if (namedEvaluation) inferFunctionName(value, target.name);

        if (initialize) env.initialize(target.name, value);
        else this.writeIdentifier(target.name, value, env);
        break;
      }
      case "member": {
        const { object, key } = this.evalMemberRef(target, env);

        this.writeProperty(object, key, value);
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
        if (isUndefined(value)) {
          this.assignTo(
            target.left,
            this.evalExpression(target.right, env),
            env,
            initialize,
            isAnonymousFunctionDefinition(target.right),
          );
        } else {
          this.assignTo(target.left, value, env, initialize);
        }
        break;
      }
      /* istanbul ignore next -- callers unwrap rest targets before assigning to them */
      case "rest": {
        this.assignTo(target.argument, value, env, initialize);
        break;
      }
      /* istanbul ignore next -- AssignmentTarget is fully covered by the cases above */
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
    const taken = new Set<PropertyKey>();

    for (const prop of target.props) {
      const key = prop.computed
        ? toPropertyKey(this.evalExpression(prop.key as Expression, env))
        : (prop.key as string);

      taken.add(key);
      /* istanbul ignore else -- the parser never emits an object-pattern property without a value */
      if (prop.value != null) this.assignTo(prop.value, source[key], env, initialize);
    }

    if (target.rest != null) {
      const rest: Record<PropertyKey, unknown> = {};

      for (const key of ownEnumerableKeys(source)) if (!taken.has(key)) rest[key] = source[key];

      this.assignTo(target.rest.argument, rest, env, initialize);
    }
  }

  /**
   * Write a binding, creating a global in sloppy mode when the name is undeclared.
   *
   * 写入绑定；sloppy 模式下未声明名称会创建全局变量。
   *
   * @param name - Binding name / 绑定名
   * @param value - New value / 新值
   * @param env - Current environment / 当前环境
   */
  private writeIdentifier(name: string, value: unknown, env: Environment): void {
    if (!env.set(name, value)) {
      // sloppy: writing an undeclared name creates a global; strict: error
      // sloppy：写入未声明名称创建全局；strict：抛错
      if (this.strict) throw new ReferenceError(`${name} is not defined`);

      this.globalEnv.define(name, value);
    }
  }

  /**
   * Resolve an assignment target to a reference, evaluating the member object/key exactly once.
   *
   * 将赋值目标解析为引用，成员的对象/键只求值一次。
   *
   * @param target - The target / 目标
   * @param env - Current environment / 当前环境
   * @returns The resolved reference / 已解析的引用
   */
  private evalTargetReference(target: AssignmentTarget, env: Environment): TargetReference {
    if (target.type === "identifier") {
      const { name } = target;

      return {
        get: () => env.get(name),
        set: (value) => {
          this.writeIdentifier(name, value, env);
        },
      };
    }

    if (target.type === "member") {
      if (target.object.type === "super") {
        const ctx = this.currentContext();

        if (ctx == null || ctx.superBase == null)
          throw new ReferenceError("'super' keyword unexpected here");

        const { superBase, thisRef } = ctx;
        const key = target.computed
          ? toPropertyKey(this.evalExpression(target.property as Expression, env))
          : (target.property as string);

        return {
          // accessors run with the instance as receiver
          // accessor 以实例作为接收者运行
          get: () => Reflect.get(superBase, key, thisRef.value) as unknown,
          set: (value) => {
            this.writeProperty(thisRef.value, key, value);
          },
        };
      }

      const object = this.evalExpression(target.object, env);
      const key = target.computed
        ? toPropertyKey(this.evalExpression(target.property as Expression, env))
        : (target.property as string);

      return {
        get: () => getProperty(object, key),
        set: (value) => {
          this.writeProperty(object, key, value);
        },
      };
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

  /**
   * Evaluate the member target of a `delete` operation, tracking optional-chain short-circuits.
   *
   * 求值 `delete` 的成员目标，跟踪可选链短路。
   *
   * @param node - The member expression / 成员表达式
   * @param env - Current environment / 当前环境
   * @returns The object, key, and whether the chain short-circuited / 对象、键与是否短路
   */
  private evalDeleteTarget(
    node: MemberExpr,
    env: Environment,
  ): { object: unknown; key: PropertyKey | null; shortCircuited: boolean } {
    const { object, shortCircuited } = this.evalDeleteObject(node.object, env);

    // a short-circuited chain must not evaluate the computed key at all
    // 链已短路时不得求值计算键
    if (shortCircuited || (node.optional && object == null))
      return { object, key: null, shortCircuited: true };

    const key = node.computed
      ? toPropertyKey(this.evalExpression(node.property as Expression, env))
      : (node.property as string);

    return { object, key, shortCircuited: false };
  }

  /**
   * Evaluate the object chain of a `delete` target, propagating optional-chain short-circuits.
   *
   * 求值 `delete` 目标的对象链，传播可选链短路。
   *
   * @param expr - The object expression / 对象表达式
   * @param env - Current environment / 当前环境
   * @returns The object value and whether an optional link short-circuited / 对象值与是否短路
   */
  private evalDeleteObject(
    expr: Expression,
    env: Environment,
  ): { object: unknown; shortCircuited: boolean } {
    if (expr.type === "member") {
      const inner = this.evalDeleteObject(expr.object, env);

      if (inner.shortCircuited) return { object: void 0, shortCircuited: true };

      if (expr.optional && inner.object == null) return { object: void 0, shortCircuited: true };

      const key = expr.computed
        ? toPropertyKey(this.evalExpression(expr.property as Expression, env))
        : (expr.property as string);

      return { object: getProperty(inner.object, key), shortCircuited: false };
    }

    return { object: this.evalExpression(expr, env), shortCircuited: false };
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
      case "member":
      case "call": {
        if (containsOptionalChain(node)) {
          const value = this.evalChainLink(node, env);

          return value === SHORT_CIRCUIT ? void 0 : value;
        }

        return node.type === "member" ? this.evalMember(node, env) : this.evalCall(node, env);
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
      /* istanbul ignore next -- `await` is always evaluated by the async evaluator */
      case "await": {
        throw new Error("async/await is not implemented yet");
      }
      /* istanbul ignore next -- spread nodes only appear inside array/object/call handlers */
      case "spread": {
        throw new TypeError("Unexpected spread expression");
      }
      /* istanbul ignore next -- every Expression node kind is handled above */
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

    /* istanbul ignore if -- evaluation always runs with a context frame */
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
          for (const key of ownEnumerableKeys(source))
            obj[key] = (source as Record<PropertyKey, unknown>)[key];
        }

        continue;
      }

      const key = prop.computed
        ? toPropertyKey(this.evalExpression(prop.key as Expression, env))
        : (prop.key as string);

      if (prop.kind === "get" || prop.kind === "set") {
        const fn = this.makeFunction(prop.value as FunctionExpr, env, {
          superBase: Object.getPrototypeOf(obj) as object | null,
          constructable: false,
        });
        const descriptor: PropertyDescriptor = { enumerable: true, configurable: true };

        if (prop.kind === "get") descriptor.get = fn;
        else descriptor.set = fn as (value: unknown) => void;

        Object.defineProperty(obj, key, descriptor);
        continue;
      }

      const { value } = prop;

      if (value.type === "functionExpr" || value.type === "arrow") {
        // method shorthand: home object is `obj`, and methods are not constructable
        // 方法简写：home object 为 `obj`，且方法不可被 `new`（`m: function(){}` 仍可构造）
        const fn = this.makeFunction(value, env, {
          superBase: Object.getPrototypeOf(obj) as object | null,
          constructable: !prop.method,
        });

        inferFunctionName(fn, typeof key === "string" ? key : null);

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

      // accessors run with the instance as receiver
      // accessor 以实例作为接收者运行
      return Reflect.get(ctx.superBase, key, ctx.thisRef.value) as unknown;
    }

    const object = this.evalExpression(node.object, env);

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
    if (node.callee.type === "super") return this.evalSuperCall(this.evalArgs(node.args, env));

    // callee is evaluated before the arguments (ECMAScript Evaluation order)
    // callee 先于实参求值（ECMAScript 求值顺序）
    const { callee, thisArg } = this.evalCallee(node.callee, env);
    const args = this.evalArgs(node.args, env);

    return this.callValue(callee, args, thisArg);
  }

  /**
   * Evaluate a member/call link of an optional chain, propagating short-circuiting.
   *
   * 求值可选链的一个成员/调用链节，并向上传播短路状态。
   *
   * The parser discards parentheses, so `(o?.a)()` is indistinguishable from `o?.a()`; both are
   * treated as one chain (`(o?.a)()` therefore short-circuits instead of throwing).
   *
   * 解析器丢弃括号，`(o?.a)()` 与 `o?.a()` 在 AST 上无法区分，二者都按一条可选链处理（因此 `(o?.a)()` 会短路而不是抛错）。
   *
   * @param node - Member/call link / 成员或调用链节
   * @param env - Current environment / 当前环境
   * @returns The value, or `SHORT_CIRCUIT` / 值或短路哨兵
   */
  private evalChainLink(node: MemberExpr | CallExpr, env: Environment): unknown {
    if (node.type === "member") {
      if (node.object.type === "super") {
        const ctx = this.currentContext();

        if (ctx == null || ctx.superBase == null)
          throw new ReferenceError("'super' keyword unexpected here");

        const key = node.computed
          ? toPropertyKey(this.evalExpression(node.property as Expression, env))
          : (node.property as string);

        return Reflect.get(ctx.superBase, key, ctx.thisRef.value) as unknown;
      }

      const object = this.evalChainOperand(node.object, env);

      if (object === SHORT_CIRCUIT) return SHORT_CIRCUIT;
      if (node.optional && object == null) return SHORT_CIRCUIT;

      const key = node.computed
        ? toPropertyKey(this.evalExpression(node.property as Expression, env))
        : (node.property as string);

      return getProperty(object, key);
    }

    if (node.callee.type === "super") return this.evalSuperCall(this.evalArgs(node.args, env));

    const { callee, thisArg } = this.evalChainCallee(node.callee, env);

    if (callee === SHORT_CIRCUIT) return SHORT_CIRCUIT;
    if (node.optional && callee == null) return SHORT_CIRCUIT;

    return this.callValue(callee, this.evalArgs(node.args, env), thisArg);
  }

  /**
   * Evaluate an operand inside an optional chain, keeping the chain state.
   *
   * 在可选链内部求值操作数，保留整链短路状态。
   *
   * @param expr - The operand / 操作数
   * @param env - Current environment / 当前环境
   * @returns The value or `SHORT_CIRCUIT` / 值或短路哨兵
   */
  private evalChainOperand(expr: Expression, env: Environment): unknown {
    if (expr.type === "member" || expr.type === "call") return this.evalChainLink(expr, env);

    return this.evalExpression(expr, env);
  }

  /**
   * Evaluate a callee inside an optional chain, keeping the chain state.
   *
   * 在可选链内部求值 callee，保留整链短路状态。
   *
   * @param callee - Callee expression / callee 表达式
   * @param env - Current environment / 当前环境
   * @returns The callee and `this` value; `callee` is `SHORT_CIRCUIT` when the chain short-circuits
   *   / callee 与 `this` 值；链短路时 `callee` 为短路哨兵
   */
  private evalChainCallee(
    callee: Expression,
    env: Environment,
  ): { callee: unknown; thisArg: unknown } {
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

      const object = this.evalChainOperand(callee.object, env);

      if (object === SHORT_CIRCUIT) return { callee: SHORT_CIRCUIT, thisArg: void 0 };
      if (callee.optional && object == null) return { callee: SHORT_CIRCUIT, thisArg: void 0 };

      const key = callee.computed
        ? toPropertyKey(this.evalExpression(callee.property as Expression, env))
        : (callee.property as string);

      return { callee: getProperty(object, key), thisArg: object };
    }

    return { callee: this.evalChainOperand(callee, env), thisArg: void 0 };
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
   * Apply sloppy-mode receiver conversion for host function calls.
   *
   * 宿主函数调用时的 sloppy 接收者转换。
   *
   * @param thisArg - The call-site `this` / 调用点的 `this`
   * @returns The receiver to pass to the host function / 传给宿主函数的接收者
   */
  private hostThis(thisArg: unknown): unknown {
    if (!this.strict && thisArg == null) return this.globalObject;

    return thisArg;
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

      this.checkDeadline();

      const result: unknown = Reflect.apply(callee, this.hostThis(thisArg), args);

      // a host call can consume the whole budget; it cannot be interrupted, so check after it
      // 宿主调用可能耗尽全部预算且无法打断，因此调用后再检查一次
      this.checkDeadline();

      return result;
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
        const { object, key, shortCircuited } = this.evalDeleteTarget(argument, env);

        // an optional chain that short-circuits makes the delete a no-op (returns true)
        // 可选链短路使 delete 成为空操作（返回 true）
        if (shortCircuited || key == null) return true;

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

      this.writeProperty(object, key, value);

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

      this.assignTo(target, value, env, false, isAnonymousFunctionDefinition(valueExpr));

      return value;
    }

    // Resolve the target once: object/computed key must not be evaluated twice
    // 目标只解析一次：对象/计算键不得重复求值
    const reference = this.evalTargetReference(target, env);

    if (op === "&&=" || op === "||=" || op === "??=") {
      const old = reference.get();

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

      reference.set(value);

      return value;
    }

    const old = reference.get();
    const value = this.evalExpression(valueExpr, env);
    const result = binaryOp(op.slice(0, -1) as BinaryOperator, old, value);

    reference.set(result);

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
      result += toTemplateString(this.evalExpression(node.expressions[i], env));
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
    extra?: { superBase?: object | null; constructable?: boolean },
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
        constructable: extra?.constructable,
        sourceText:
          getFunctionSource(node) ??
          /* istanbul ignore next -- the parser registers source text for every function node */
          void 0,
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
      constructable: extra?.constructable,
      sourceText:
        getFunctionSource(node) ??
        /* istanbul ignore next -- the parser registers source text for every function node */
        void 0,
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
    /**
     * Whether the function is `new`-able; `false` for object-literal methods / 是否可被 `new`
     * 调用（对象字面量方法为 `false`）
     */
    constructable?: boolean;
    /** Original source text, for `Function.prototype.toString` / 源码原文，供 toString 使用 */
    sourceText?: string;
  }): InterpreterFunction {
    const {
      name,
      params,
      body,
      closure,
      thisMode,
      isAsync,
      prototype,
      superBase,
      constructable,
      sourceText,
    } = options;
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
        constructable: constructable ?? !isArrow,
        prototype,
        superClass: null,
        superBase,
        hasArguments: !isArrow && !simpleParamNames.includes("arguments"),
        simpleParamNames,
        implicitDerived: false,
        containsAwait: containsAwait(body),
        lexicalThis: isArrow
          ? (ctx?.thisRef ??
              /* istanbul ignore next -- arrows are always created inside a context frame */
              { value: this.globalObject })
          : null,
        lexicalSuperBase: isArrow ? (ctx?.superBase ?? null) : null,
        lexicalSuperClass: isArrow ? (ctx?.superClass ?? null) : null,
        lexicalNewTargetMeta: isArrow ? (ctx?.newTargetMeta ?? null) : null,
        lexicalIsConstruct: isArrow
          ? (ctx?.isConstruct ??
            /* istanbul ignore next -- arrows are always created inside a context frame */
            false)
          : false,
        callee: null,
        sourceText,
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

    // async functions always return a host Promise (driven by the async runner); constructing one
    // throws synchronously (async functions have no [[Construct]])
    // async 函数总是返回宿主 Promise（由 async 运行器驱动）；构造 async 函数同步抛错（无 [[Construct]]）
    if (meta.isAsync) {
      if (isConstruct) throw new TypeError(`${meta.name ?? "function"} is not a constructor`);

      this.asyncStarted = true;

      if (this.forbidAsync) throw new Error(ASYNC_UNSUPPORTED_MESSAGE);

      return this.asyncInvoke(meta, args, thisArg);
    }

    this.stackDepth += 1;

    if (this.stackDepth > this.maxStack) {
      // undo the increment: the `finally` below is not entered when we throw here
      // 抛出前撤销递增：此处抛错不会进入下方 `finally`
      this.stackDepth -= 1;

      throw new Error(`Maximum call stack size exceeded (limit ${this.maxStack})`);
    }

    try {
      if (meta.thisMode === "arrow") {
        if (isConstruct) throw new TypeError(`${meta.name ?? "function"} is not a constructor`);

        // arrows use the lexical context captured at creation time
        // 箭头使用创建时捕获的词法上下文
        const env = new Environment(meta.closure, true);

        this.bindParams(meta.params, args, env);
        this.hoistFunctionBody(meta.body, env);

        this.contextStack.push({
          thisRef: meta.lexicalThis ??
            /* istanbul ignore next -- arrow metadata always carries its lexical `this` */
            { value: this.globalObject },
          superBase: meta.lexicalSuperBase,
          superClass: meta.lexicalSuperClass,
          // arrows inherit the construction state so `super()` works inside a derived constructor
          // 箭头继承构造状态，使派生构造器内的 `super()` 可用
          newTargetMeta: meta.lexicalNewTargetMeta,
          isConstruct: meta.lexicalIsConstruct,
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

      if (meta.thisMode === "sloppy") {
        // sloppy `this` is boxed: nullish -> global object, primitives -> wrapper objects
        // sloppy `this` 会装箱：null/undefined → 全局对象，原始值 → 包装对象
        if (thisValue == null) thisValue = this.globalObject;
        else if (typeof thisValue !== "object" && typeof thisValue !== "function")
          thisValue = new Object(thisValue);
      }

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

          /* istanbul ignore if -- `super()` always initializes `this` before the implicit derived constructor returns */
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

    this.hoistStatements(body.body, env, true);
    this.predeclareLexical(body.body, env);
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
      /* istanbul ignore next -- `bindParams` unwraps rest parameters before binding them */
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

    /* istanbul ignore if -- callers guarantee an active context and a function parent */
    if (ctx == null || typeof parent !== "function")
      throw new TypeError("'super' keyword unexpected here");

    const parentMeta = getInterpreterMeta(parent);

    if (parentMeta == null) {
      // host parent: let the host construct with the derived prototype
      // 宿主父类：让宿主以派生原型构造
      const newTarget = ctx.newTargetMeta?.callee;
      // when `new.target` is absent the host defaults it to the parent, so passing the parent keeps
      // `Reflect.construct(parent, args)` semantics without a dead branch
      // `new.target` 缺失时宿主默认使用父构造器，因此传入父构造器即可保持 `Reflect.construct(parent, args)` 语义
      const instance: unknown = Reflect.construct(
        parent,
        args,
        newTarget ??
          /* istanbul ignore next -- `super()` only runs inside a construct frame */ parent,
      );

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
        (ctx.newTargetMeta?.callee?.prototype as object | undefined) ??
          /* istanbul ignore next -- a class constructor always has an object prototype */
          {},
      );
    }

    this.stackDepth += 1;

    if (this.stackDepth > this.maxStack) {
      // undo the increment: the `finally` below is not entered when we throw here
      // 抛出前撤销递增：此处抛错不会进入下方 `finally`
      this.stackDepth -= 1;

      throw new Error(`Maximum call stack size exceeded (limit ${this.maxStack})`);
    }

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
    // A class is "derived" whenever it has a heritage clause, including `extends null`.
    // 只要存在 heritage 子句（含 `extends null`），类就是派生类。
    const hasExtends = superClassExpr != null;
    let parentCtor: unknown = null;
    let parentProto: object | null = null;

    if (hasExtends) {
      parentCtor = this.evalExpression(superClassExpr, env);

      if (typeof parentCtor === "function")
        parentProto = ((parentCtor as { prototype?: unknown }).prototype as object | null) ?? null;
      else if (parentCtor != null)
        throw new TypeError("Class extends value is not a constructor or null");
    }

    // the class name is visible inside the class body
    // 类名在类体内部可见
    let closureEnv = env;

    if (name != null) {
      closureEnv = new Environment(env, false);
      closureEnv.declareLet(name);
    }

    // Base classes inherit from `Object.prototype` (a class instance is an ordinary object);
    // only `extends null` keeps the null prototype.
    // 基类原型继承 `Object.prototype`（class 实例是普通对象）；只有 `extends null` 保持 null 原型。
    let proto: object;

    if (hasExtends) {
      proto =
        parentProto == null
          ? (Object.create(null) as object)
          : (Object.create(parentProto) as object);
    } else {
      proto = {};
    }

    const ctorMethod = body.methods.find((item) => item.kind === "constructor") ?? null;
    const ctor = ctorMethod
      ? this.createClassMethod({
          method: ctorMethod,
          closure: closureEnv,
          // the parser only marks a non-computed `constructor` key as the constructor method
          // 解析器只会把非计算的 `constructor` 键标记为构造方法
          name: name ?? (ctorMethod.key as string),
          prototype: proto,
          superClass: hasExtends ? parentCtor : null,
          superBase: parentProto,
          isConstructor: true,
        })
      : this.createImplicitConstructor(name, closureEnv, proto, {
          superClass: hasExtends ? parentCtor : null,
          implicitDerived: hasExtends,
        });

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
    if (hasExtends && parentCtor != null) Object.setPrototypeOf(ctor, parentCtor);

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
        lexicalNewTargetMeta: null,
        lexicalIsConstruct: false,
        callee: null,
        sourceText:
          getFunctionSource(method) ??
          /* istanbul ignore next -- the parser registers source text for every function node */
          void 0,
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
   * @param options - Parent constructor and constructor kind / 父构造器与构造器种类
   * @returns The interpreter function / 解释器函数
   */
  private createImplicitConstructor(
    name: string | null,
    closure: Environment,
    prototype: object,
    options: {
      /** Parent constructor, or `null` for a base class / 父构造器，基类为 `null` */
      superClass: unknown;
      /**
       * Whether the class has a heritage clause (`extends null` included) / 类是否含 heritage 子句（含
       * `extends null`）
       */
      implicitDerived: boolean;
    },
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
        superClass: options.superClass,
        superBase: null,
        hasArguments: false,
        simpleParamNames: [],
        implicitDerived: options.implicitDerived,
        containsAwait: false,
        lexicalThis: null,
        lexicalSuperBase: null,
        lexicalSuperClass: null,
        lexicalNewTargetMeta: null,
        lexicalIsConstruct: false,
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
   * @returns A host Promise / 宿主 Promise
   */
  private async asyncInvoke(
    meta: InterpreterFunctionMeta,
    args: unknown[],
    thisArg: unknown,
  ): Promise<unknown> {
    this.pendingAsync += 1;
    this.stackDepth += 1;

    if (this.stackDepth > this.maxStack) {
      // undo the increments before throwing, so the guards do not leak state
      // 抛出前先撤销递增，避免守卫泄漏状态
      this.stackDepth -= 1;
      this.pendingAsync -= 1;

      throw new Error(`Maximum call stack size exceeded (limit ${this.maxStack})`);
    }

    const baseDepth = this.contextStack.length;
    const gen = this.asyncBodyGenerator(meta, args, thisArg);
    let savedFrames: RuntimeContext[] = [];

    return new Promise<unknown>((resolve, reject) => {
      const settle = (): void => {
        this.stackDepth -= 1;
        this.pendingAsync -= 1;
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

    if (meta.thisMode === "sloppy") {
      // sloppy `this` is boxed: nullish -> global object, primitives -> wrapper objects
      // sloppy `this` 会装箱：null/undefined → 全局对象，原始值 → 包装对象
      if (thisValue == null) thisValue = this.globalObject;
      else if (typeof thisValue !== "object" && typeof thisValue !== "function")
        thisValue = new Object(thisValue);
    }

    const env = new Environment(meta.closure, true);

    this.bindParams(meta.params, args, env);
    this.hoistFunctionBody(meta.body, env);
    if (meta.hasArguments) bindArguments(meta, args, env);

    const thisRef: { value: unknown } = { value: thisValue };
    let superBase: object | null = meta.superBase;
    let superClass: unknown = meta.superClass;

    if (meta.thisMode === "arrow") {
      thisRef.value =
        meta.lexicalThis?.value ??
        /* istanbul ignore next -- async arrow metadata always carries its lexical `this` */
        this.globalObject;
      superBase = meta.lexicalSuperBase;
      superClass = meta.lexicalSuperClass;
    }

    this.contextStack.push({
      thisRef,
      superBase,
      superClass,
      // arrows inherit the construction state so `super()` works inside a derived constructor
      // 箭头继承构造状态，使派生构造器内的 `super()` 可用
      newTargetMeta: meta.lexicalNewTargetMeta,
      isConstruct: meta.lexicalIsConstruct,
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

        this.predeclareLexical(stmt.body, blockEnv);
        this.instantiateBlockFunctions(stmt.body, blockEnv);

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

        yield* this.evalAsyncAssignTo(
          decl.id,
          value,
          env,
          false,
          isAnonymousFunctionDefinition(decl.init),
        );
      }

      return;
    }

    for (const decl of stmt.declarations) this.declarePattern(decl.id, env, stmt.kind);

    for (const decl of stmt.declarations) {
      const value = decl.init == null ? void 0 : yield* this.evalAsyncExpr(decl.init, env);

      yield* this.evalAsyncAssignTo(
        decl.id,
        value,
        env,
        true,
        isAnonymousFunctionDefinition(decl.init),
      );
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

      yield* this.evalAsyncAssignTo(
        decl.id,
        value,
        env,
        false,
        isAnonymousFunctionDefinition(decl.init),
      );
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

    // `for...in` over `null`/`undefined` iterates zero times (spec)
    // `for...in` 对 `null`/`undefined` 迭代零次（规范）
    if (right == null) return;

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

        // abrupt exits (break / return / throw) close the iterator
        // 异常退出（break / return / 抛出）关闭迭代器
        closeIterator(iterator);

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

    // the switch body is a single block scope for all cases
    // switch 体是所有 case 共享的单个块作用域
    const switchEnv = new Environment(env, false);
    const caseStatements = stmt.cases.flatMap((caseNode) => caseNode.body);

    this.predeclareLexical(caseStatements, switchEnv);
    this.instantiateBlockFunctions(caseStatements, switchEnv);

    for (let i = index; i < stmt.cases.length; i += 1) {
      try {
        for (const st of stmt.cases[i].body) yield* this.evalAsyncStatement(st, switchEnv);
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
        if (containsOptionalChain(expr)) {
          const value = yield* this.evalAsyncChainLink(expr, env);

          return value === SHORT_CIRCUIT ? void 0 : value;
        }

        if (expr.object.type === "super") {
          const ctx = this.currentContext();

          if (ctx == null || ctx.superBase == null)
            throw new ReferenceError("'super' keyword unexpected here");

          /* istanbul ignore next -- a non-computed super read has no await/call and stays on the sync evaluator */
          const key = expr.computed
            ? toPropertyKey(yield* this.evalAsyncExpr(expr.property as Expression, env))
            : (expr.property as string);

          // accessors run with the instance as receiver
          // accessor 以实例作为接收者运行
          return Reflect.get(ctx.superBase, key, ctx.thisRef.value) as unknown;
        }

        const object = yield* this.evalAsyncExpr(expr.object, env);

        const key = expr.computed
          ? toPropertyKey(yield* this.evalAsyncExpr(expr.property as Expression, env))
          : (expr.property as string);

        return getProperty(object, key);
      }
      case "call": {
        if (containsOptionalChain(expr)) {
          const value = yield* this.evalAsyncChainLink(expr, env);

          return value === SHORT_CIRCUIT ? void 0 : value;
        }

        if (expr.callee.type === "super")
          return this.evalSuperCall(yield* this.evalAsyncArgs(expr.args, env));

        // callee is evaluated before the arguments (ECMAScript Evaluation order)
        // callee 先于实参求值（ECMAScript 求值顺序）
        const { callee, thisArg } = yield* this.evalAsyncCallee(expr.callee, env);
        const args = yield* this.evalAsyncArgs(expr.args, env);

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

          // `typeof <identifier>` is await/call-free, so it never reaches the async evaluator
          return typeOf(yield* this.evalAsyncExpr(argument, env));
        }

        if (op === "delete") {
          const { argument } = expr;

          if (argument.type === "member") {
            const { object, key, shortCircuited } = yield* this.evalAsyncDeleteTarget(
              argument,
              env,
            );

            // an optional chain that short-circuits makes the delete a no-op (returns true)
            // 可选链短路使 delete 成为空操作（返回 true）
            if (shortCircuited || key == null) return true;

            // oxlint-disable-next-line typescript/no-dynamic-delete -- `delete` operator semantics
            return delete (object as Record<PropertyKey, unknown>)[key];
          }

          // `delete <identifier>` is await/call-free, so it never reaches the async evaluator
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

        // identifier updates are await/call-free, so they never reach the async evaluator
        /* istanbul ignore else -- only member targets can contain `await` here */
        if (target.type === "member") {
          const { object, key } = yield* this.evalAsyncMemberRef(target, env);
          const old = getProperty(object, key);
          const value = delta(old);

          this.writeProperty(object, key, value);

          return expr.prefix ? value : old;
        }

        /* istanbul ignore next -- an async update target is always a member expression */
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
          result += toTemplateString(yield* this.evalAsyncExpr(expr.expressions[i], env));
          result += expr.quasis[i + 1].cooked;
        }

        return result;
      }
      case "await": {
        return yield* this.evalAwait(expr.argument, env);
      }
      /* istanbul ignore next -- await/call-free expressions are delegated to the sync evaluator before the switch */
      default: {
        return this.evalExpression(expr, env);
      }
    }
  }

  /**
   * Evaluate an `await` expression: evaluate the operand, then always suspend for one microtask.
   *
   * 求值 `await` 表达式：先求值操作数，然后始终挂起一个微任务。
   *
   * `await` yields every operand — including non-thenables — so the continuation is scheduled as a
   * microtask exactly like the specification requires (`await 1` still suspends). The driver wraps
   * the yielded value with `Promise.resolve`, which also reads a custom thenable's `then` only
   * once.
   *
   * `await` 对任何操作数（包括非 thenable）都会挂起，使后续执行按规范作为微任务调度（`await 1` 也会挂起）。 驱动方用 `Promise.resolve` 包装
   * yield 出的值，因此自定义 thenable 的 `then` 只会被读取一次。
   *
   * @param operand - The awaited expression / 被等待的表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The awaited value / 被等待的值
   * @returns The generator / 生成器
   */
  private *evalAwait(operand: Expression, env: Environment): Generator<unknown, unknown, unknown> {
    const value = yield* this.evalAsyncExpr(operand, env);

    return yield value;
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

      yield* this.evalAsyncAssignTo(
        target,
        value,
        env,
        false,
        isAnonymousFunctionDefinition(valueExpr),
      );

      return value;
    }

    // Resolve the target once: object/computed key must not be evaluated twice
    // 目标只解析一次：对象/计算键不得重复求值
    const reference = yield* this.evalAsyncTargetReference(target, env);

    if (op === "&&=" || op === "||=" || op === "??=") {
      const old = reference.get();

      if (op === "&&=") {
        if (!toBoolean(old)) return old;
      } else if (op === "||=") {
        if (toBoolean(old)) return old;
      } else if (old != null) {
        return old;
      }

      const value = yield* this.evalAsyncExpr(valueExpr, env);

      reference.set(value);

      return value;
    }

    const old = reference.get();
    const value = yield* this.evalAsyncExpr(valueExpr, env);
    const result = binaryOp(op.slice(0, -1) as BinaryOperator, old, value);

    reference.set(result);

    return result;
  }

  /**
   * Resolve an assignment target to a reference, evaluating the member object/key exactly once
   * (async-aware, for `await` in the object/computed key).
   *
   * 将赋值目标解析为引用，成员的对象/键只求值一次（支持 async，对象/计算键中可含 `await`）。
   *
   * @param target - The target / 目标
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator, completing with the resolved reference / 生成器，完成值为已解析的引用
   */
  private *evalAsyncTargetReference(
    target: AssignmentTarget,
    env: Environment,
  ): Generator<unknown, TargetReference, unknown> {
    if (target.type === "identifier") {
      const { name } = target;

      return {
        get: () => env.get(name),
        set: (value) => {
          this.writeIdentifier(name, value, env);
        },
      };
    }

    if (target.type === "member") {
      if (target.object.type === "super") {
        const ctx = this.currentContext();

        if (ctx == null || ctx.superBase == null)
          throw new ReferenceError("'super' keyword unexpected here");

        const { superBase, thisRef } = ctx;
        const key = target.computed
          ? toPropertyKey(yield* this.evalAsyncExpr(target.property as Expression, env))
          : (target.property as string);

        return {
          get: () => Reflect.get(superBase, key, thisRef.value) as unknown,
          set: (value) => {
            this.writeProperty(thisRef.value, key, value);
          },
        };
      }

      const object = yield* this.evalAsyncExpr(target.object, env);
      const key = target.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(target.property as Expression, env))
        : (target.property as string);

      return {
        get: () => getProperty(object, key),
        set: (value) => {
          this.writeProperty(object, key, value);
        },
      };
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
   * @param namedEvaluation - Whether the value may receive an inferred function name / 是否可推断函数名
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator / 生成器
   */
  // oxlint-disable-next-line max-params -- initialize + namedEvaluation are independent flags
  private *evalAsyncAssignTo(
    target: AssignmentTarget,
    value: unknown,
    env: Environment,
    initialize = false,
    namedEvaluation = false,
  ): Generator<unknown, void, unknown> {
    // ordinary targets have no `await`; delegate to the sync assigner
    // 普通目标不含 `await`，委托给同步赋值器
    if (!containsAwait(target)) {
      this.assignTo(target, value, env, initialize, namedEvaluation);

      return;
    }

    switch (target.type) {
      case "member": {
        const { object, key } = yield* this.evalAsyncMemberRef(target, env);

        this.writeProperty(object, key, value);
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
            isAnonymousFunctionDefinition(target.right),
          );
        } else {
          yield* this.evalAsyncAssignTo(target.left, value, env, initialize);
        }
        break;
      }
      /* istanbul ignore next -- callers unwrap rest targets before assigning to them */
      case "rest": {
        yield* this.evalAsyncAssignTo(target.argument, value, env, initialize);
        break;
      }
      /* istanbul ignore next -- AssignmentTarget is fully covered by the cases above */
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

      /* istanbul ignore next -- a super target only reaches the async assigner through a computed key */
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
   * Evaluate the member target of a `delete` operation, tracking optional-chain short-circuits.
   *
   * 求值 `delete` 的成员目标，跟踪可选链短路。
   *
   * @param node - The member expression / 成员表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The object, key, and whether the chain short-circuited / 对象、键与是否短路
   */
  private *evalAsyncDeleteTarget(
    node: MemberExpr,
    env: Environment,
  ): Generator<
    unknown,
    { object: unknown; key: PropertyKey | null; shortCircuited: boolean },
    unknown
  > {
    const { object, shortCircuited } = yield* this.evalAsyncDeleteObject(node.object, env);

    // a short-circuited chain must not evaluate the computed key at all
    // 链已短路时不得求值计算键
    if (shortCircuited || (node.optional && object == null))
      return { object, key: null, shortCircuited: true };

    const key = node.computed
      ? toPropertyKey(yield* this.evalAsyncExpr(node.property as Expression, env))
      : (node.property as string);

    return { object, key, shortCircuited: false };
  }

  /**
   * Evaluate the object chain of a `delete` target, propagating optional-chain short-circuits.
   *
   * 求值 `delete` 目标的对象链，传播可选链短路。
   *
   * @param expr - The object expression / 对象表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The object value and whether an optional link short-circuited / 对象值与是否短路
   */
  private *evalAsyncDeleteObject(
    expr: Expression,
    env: Environment,
  ): Generator<unknown, { object: unknown; shortCircuited: boolean }, unknown> {
    if (expr.type === "member") {
      const inner = yield* this.evalAsyncDeleteObject(expr.object, env);

      if (inner.shortCircuited) return { object: void 0, shortCircuited: true };

      if (expr.optional && inner.object == null) return { object: void 0, shortCircuited: true };

      const key = expr.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(expr.property as Expression, env))
        : (expr.property as string);

      return { object: getProperty(inner.object, key), shortCircuited: false };
    }

    return { object: yield* this.evalAsyncExpr(expr, env), shortCircuited: false };
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
          for (const key of ownEnumerableKeys(source))
            obj[key] = (source as Record<PropertyKey, unknown>)[key];
        }

        continue;
      }

      const key = prop.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(prop.key as Expression, env))
        : (prop.key as string);

      if (prop.kind === "get" || prop.kind === "set") {
        const fn = this.makeFunction(prop.value as FunctionExpr, env, {
          superBase: Object.getPrototypeOf(obj) as object | null,
          constructable: false,
        });
        const descriptor: PropertyDescriptor = { enumerable: true, configurable: true };

        if (prop.kind === "get") descriptor.get = fn;
        else descriptor.set = fn as (value: unknown) => void;

        Object.defineProperty(obj, key, descriptor);
        continue;
      }

      const { value } = prop;

      if (value.type === "functionExpr" || value.type === "arrow") {
        // method shorthand: home object is `obj`, and methods are not constructable
        // 方法简写：home object 为 `obj`，且方法不可被 `new`（`m: function(){}` 仍可构造）
        const fn = this.makeFunction(value, env, {
          superBase: Object.getPrototypeOf(obj) as object | null,
          constructable: !prop.method,
        });

        inferFunctionName(fn, typeof key === "string" ? key : null);

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
    const taken = new Set<PropertyKey>();

    for (const prop of target.props) {
      const key = prop.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(prop.key as Expression, env))
        : (prop.key as string);

      taken.add(key);
      /* istanbul ignore else -- the parser never emits an object-pattern property without a value */
      if (prop.value != null)
        yield* this.evalAsyncAssignTo(prop.value, source[key], env, initialize);
    }

    if (target.rest != null) {
      const rest: Record<PropertyKey, unknown> = {};

      for (const key of ownEnumerableKeys(source)) if (!taken.has(key)) rest[key] = source[key];

      yield* this.evalAsyncAssignTo(target.rest.argument, rest, env, initialize);
    }
  }

  /**
   * Evaluate call arguments in async code (with spread), suspending on `await`.
   *
   * 在 async 代码中求值调用实参（含展开），遇 `await` 挂起。
   *
   * @param args - Argument expressions / 实参表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator, completing with the evaluated arguments / 生成器，完成值为已求值的实参
   */
  private *evalAsyncArgs(
    args: readonly (Expression | SpreadExpr)[],
    env: Environment,
  ): Generator<unknown, unknown[], unknown> {
    const result: unknown[] = [];

    for (const arg of args) {
      if (arg.type === "spread")
        for (const item of iterate(yield* this.evalAsyncExpr(arg.argument, env))) result.push(item);
      else result.push(yield* this.evalAsyncExpr(arg, env));
    }

    return result;
  }

  /**
   * Evaluate a callee in async code together with its `this` value.
   *
   * 在 async 代码中求值 callee 及其 `this` 值。
   *
   * @param callee - Callee expression / callee 表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator, completing with the callee and `this` value / 生成器，完成值为 callee 与 `this`
   *   值
   */
  private *evalAsyncCallee(
    callee: Expression,
    env: Environment,
  ): Generator<unknown, { callee: unknown; thisArg: unknown }, unknown> {
    if (callee.type === "member") {
      if (callee.object.type === "super") {
        const ctx = this.currentContext();

        if (ctx == null || ctx.superBase == null)
          throw new ReferenceError("'super' keyword unexpected here");

        const key = callee.computed
          ? toPropertyKey(yield* this.evalAsyncExpr(callee.property as Expression, env))
          : (callee.property as string);

        return { callee: getProperty(ctx.superBase, key), thisArg: ctx.thisRef.value };
      }

      const object = yield* this.evalAsyncExpr(callee.object, env);

      const key = callee.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(callee.property as Expression, env))
        : (callee.property as string);

      return { callee: getProperty(object, key), thisArg: object };
    }

    return { callee: yield* this.evalAsyncExpr(callee, env), thisArg: void 0 };
  }

  /**
   * Evaluate a member/call link of an optional chain in async code, propagating short-circuiting.
   *
   * 在 async 代码中求值可选链的一个链节，并向上传播短路状态。
   *
   * @param node - Member/call link / 成员或调用链节
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator, completing with the value or `SHORT_CIRCUIT` / 生成器，完成值为值或短路哨兵
   */
  private *evalAsyncChainLink(
    node: MemberExpr | CallExpr,
    env: Environment,
  ): Generator<unknown, unknown, unknown> {
    if (node.type === "member") {
      if (node.object.type === "super") {
        const ctx = this.currentContext();

        if (ctx == null || ctx.superBase == null)
          throw new ReferenceError("'super' keyword unexpected here");

        const key = node.computed
          ? toPropertyKey(yield* this.evalAsyncExpr(node.property as Expression, env))
          : (node.property as string);

        return Reflect.get(ctx.superBase, key, ctx.thisRef.value) as unknown;
      }

      const object = yield* this.evalAsyncChainOperand(node.object, env);

      if (object === SHORT_CIRCUIT) return SHORT_CIRCUIT;
      if (node.optional && object == null) return SHORT_CIRCUIT;

      const key = node.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(node.property as Expression, env))
        : (node.property as string);

      return getProperty(object, key);
    }

    if (node.callee.type === "super")
      return this.evalSuperCall(yield* this.evalAsyncArgs(node.args, env));

    const { callee, thisArg } = yield* this.evalAsyncChainCallee(node.callee, env);

    if (callee === SHORT_CIRCUIT) return SHORT_CIRCUIT;
    if (node.optional && callee == null) return SHORT_CIRCUIT;

    return yield* this.evalAsyncCallValue(
      callee,
      yield* this.evalAsyncArgs(node.args, env),
      thisArg,
    );
  }

  /**
   * Evaluate an operand inside an async optional chain, keeping the chain state.
   *
   * 在 async 可选链内部求值操作数，保留整链短路状态。
   *
   * @param expr - The operand / 操作数
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator, completing with the value or `SHORT_CIRCUIT` / 生成器，完成值为值或短路哨兵
   */
  private *evalAsyncChainOperand(
    expr: Expression,
    env: Environment,
  ): Generator<unknown, unknown, unknown> {
    if (expr.type === "member" || expr.type === "call")
      return yield* this.evalAsyncChainLink(expr, env);

    return yield* this.evalAsyncExpr(expr, env);
  }

  /**
   * Evaluate a callee inside an async optional chain, keeping the chain state.
   *
   * 在 async 可选链内部求值 callee，保留整链短路状态。
   *
   * @param callee - Callee expression / callee 表达式
   * @param env - Current environment / 当前环境
   * @yields {unknown} The pending promise when suspending at `await` / 在 `await` 处挂起时的 pending
   *   promise
   * @returns The generator, completing with the callee and `this` value; `callee` is
   *   `SHORT_CIRCUIT` when the chain short-circuits / 生成器，完成值为 callee 与 `this` 值；链短路时 `callee`
   *   为短路哨兵
   */
  private *evalAsyncChainCallee(
    callee: Expression,
    env: Environment,
  ): Generator<unknown, { callee: unknown; thisArg: unknown }, unknown> {
    if (callee.type === "member") {
      if (callee.object.type === "super") {
        const ctx = this.currentContext();

        if (ctx == null || ctx.superBase == null)
          throw new ReferenceError("'super' keyword unexpected here");

        const key = callee.computed
          ? toPropertyKey(yield* this.evalAsyncExpr(callee.property as Expression, env))
          : (callee.property as string);

        return { callee: getProperty(ctx.superBase, key), thisArg: ctx.thisRef.value };
      }

      const object = yield* this.evalAsyncChainOperand(callee.object, env);

      if (object === SHORT_CIRCUIT) return { callee: SHORT_CIRCUIT, thisArg: void 0 };
      if (callee.optional && object == null) return { callee: SHORT_CIRCUIT, thisArg: void 0 };

      const key = callee.computed
        ? toPropertyKey(yield* this.evalAsyncExpr(callee.property as Expression, env))
        : (callee.property as string);

      return { callee: getProperty(object, key), thisArg: object };
    }

    return { callee: yield* this.evalAsyncChainOperand(callee, env), thisArg: void 0 };
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

    if (meta == null) {
      this.checkDeadline();

      const result: unknown = Reflect.apply(callee, this.hostThis(thisArg), args);

      this.checkDeadline();

      return result;
    }

    // async functions return a host Promise; async-context arrows run inline
    // async 函数返回宿主 Promise；async 上下文箭头内联运行
    if (meta.isAsync) return this.invokeFunction(meta, args, thisArg, false);

    if (meta.containsAwait) return yield* this.asyncBodyGenerator(meta, args, thisArg);

    return this.invokeFunction(meta, args, thisArg, false);
  }
}

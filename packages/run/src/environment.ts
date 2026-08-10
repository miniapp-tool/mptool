/**
 * Lexical environment (scope) implementation for `@mptool/run`.
 *
 * `@mptool/run` 的词法作用域环境实现。
 *
 * An `Environment` is a declarative record chained to a parent environment. `var` declarations and
 * function declarations are hoisted into the nearest **function scope**, while `let`/`const`
 * declarations live in the current (block) environment and are guarded by a TDZ sentinel — reading
 * or assigning a binding before its initializer runs throws a `ReferenceError`.
 *
 * `Environment` 是链接到父环境的声明式记录。`var` 声明与函数声明提升到最近的**函数作用域**；`let`/`const` 声明位于当前（块级）环境，并以 TDZ 哨兵守卫
 * —— 在初始化器执行之前读取或赋值会抛出 `ReferenceError`。
 */

/** TDZ sentinel: the binding is declared but not yet initialized / TDZ 哨兵：绑定已声明但未初始化 */
const TDZ = Symbol("TDZ sentinel");

/** A single binding: its value and whether it is reassignable / 单个绑定：值与其是否可重赋值 */
interface Binding {
  value: unknown;
  mutable: boolean;
}

/**
 * Lexical environment: a declarative record with an optional parent.
 *
 * 词法环境：带可选父环境的声明式记录。
 */
export class Environment {
  /** Own declarative records / 自身的声明式记录 */
  private readonly records = new Map<string, Binding>();

  /**
   * @param parent - Parent environment, or `null` for the global one / 父环境，全局环境为 `null`
   * @param isFunctionScope - Whether this is a function scope / 是否为函数作用域
   * @param globalObject - The sandbox global object (only the global environment passes it) /
   *   沙箱全局对象（仅全局环境传入）
   */
  constructor(
    /** Parent environment (`null` for the global environment) / 父环境（全局环境为 `null`） */
    public readonly parent: Environment | null,
    /** Whether this environment is a function scope (target of `var` hoisting) / 是否为函数作用域（var 提升的目标） */
    private readonly isFunctionScope = false,
    /**
     * The sandbox global object; `var` declarations and builtins are mirrored onto it /
     * 沙箱全局对象；`var` 声明与内建会镜像到它上面
     */
    private readonly globalObject: Record<PropertyKey, unknown> | null = null,
  ) {}

  /**
   * The nearest function scope (itself when `isFunctionScope`).
   *
   * 最近的函数作用域（自身为函数作用域时即自身）。
   *
   * @returns The nearest function scope / 最近的函数作用域
   */
  get functionScope(): Environment {
    if (this.isFunctionScope) return this;

    return this.parent?.functionScope ?? this;
  }

  /**
   * Whether a binding with the given name exists in this environment chain (including the sandbox
   * global object for the global environment).
   *
   * 指定名称的绑定是否存在于本环境链中（全局环境还会检查沙箱全局对象）。
   *
   * @param name - Binding name / 绑定名称
   * @returns Whether it exists / 是否存在
   */
  has(name: string): boolean {
    return this.hasOwn(name) || (this.parent != null && this.parent.has(name));
  }

  /**
   * Whether a binding with the given name exists in this environment only.
   *
   * 指定名称的绑定是否仅存在于本环境。
   *
   * @param name - Binding name / 绑定名称
   * @returns Whether it exists / 是否存在
   */
  hasOwn(name: string): boolean {
    return (
      this.records.has(name) ||
      (this.globalObject != null && Object.hasOwn(this.globalObject, name))
    );
  }

  /**
   * Read a binding, following the parent chain.
   *
   * 沿父链读取绑定。
   *
   * Throws `ReferenceError` when the binding is in TDZ or not declared at all.
   *
   * 绑定处于 TDZ 或完全未声明时抛出 `ReferenceError`。
   *
   * @param name - Binding name / 绑定名称
   * @returns The bound value / 绑定值
   */
  get(name: string): unknown {
    const binding = this.records.get(name);

    if (binding != null) {
      if (binding.value === TDZ)
        throw new ReferenceError(`Cannot access '${name}' before initialization`);

      return binding.value;
    }

    if (this.globalObject != null && Object.hasOwn(this.globalObject, name))
      return this.globalObject[name];

    if (this.parent != null) return this.parent.get(name);

    throw new ReferenceError(`${name} is not defined`);
  }

  /**
   * Write a binding, following the parent chain.
   *
   * 沿父链写入绑定。
   *
   * Returns `false` when no binding exists anywhere (the caller decides: sloppy writes the global,
   * strict throws). Throws `ReferenceError` on TDZ and `TypeError` on a constant binding.
   *
   * 链上不存在任何绑定时返回 `false`（由调用方决定：sloppy 写全局、strict 抛错）；TDZ 抛 `ReferenceError`， 常量绑定抛 `TypeError`。
   *
   * @param name - Binding name / 绑定名称
   * @param value - New value / 新值
   * @returns Whether the write succeeded / 是否写入成功
   */
  set(name: string, value: unknown): boolean {
    const binding = this.records.get(name);

    if (binding != null) {
      if (binding.value === TDZ)
        throw new ReferenceError(`Cannot access '${name}' before initialization`);
      if (!binding.mutable) throw new TypeError(`Assignment to constant variable '${name}'`);

      binding.value = value;

      if (this.globalObject != null) this.globalObject[name] = value;

      return true;
    }

    if (this.globalObject != null && Object.hasOwn(this.globalObject, name)) {
      this.globalObject[name] = value;

      return true;
    }

    if (this.parent != null) return this.parent.set(name, value);

    return false;
  }

  /**
   * Write a binding directly in this environment, bypassing all checks.
   *
   * 直接在本环境写入绑定，绕过所有检查（仅供内部使用）。
   *
   * @param name - Binding name / 绑定名称
   * @param value - New value / 新值
   */
  setOwn(name: string, value: unknown): void {
    this.records.set(name, { value, mutable: true });

    if (this.globalObject != null) this.globalObject[name] = value;
  }

  /**
   * Hoist a `var` declaration into the function scope (no-op when already declared).
   *
   * 将 `var` 声明提升到函数作用域（已声明时无操作）。
   *
   * @param name - Binding name / 绑定名称
   */
  declareVar(name: string): void {
    const env = this.functionScope;

    if (!env.records.has(name)) {
      env.records.set(name, { value: void 0, mutable: true });
      if (env.globalObject != null) env.globalObject[name] = void 0;
    }
  }

  /**
   * Declare a `let` binding in this environment with a TDZ sentinel.
   *
   * 在本环境以 TDZ 哨兵声明 `let` 绑定。
   *
   * @param name - Binding name / 绑定名称
   */
  declareLet(name: string): void {
    this.records.set(name, { value: TDZ, mutable: true });
  }

  /**
   * Declare a `const` binding in this environment with a TDZ sentinel.
   *
   * 在本环境以 TDZ 哨兵声明 `const` 绑定。
   *
   * @param name - Binding name / 绑定名称
   */
  declareConst(name: string): void {
    this.records.set(name, { value: TDZ, mutable: false });
  }

  /**
   * Define (or re-define) a binding in this environment, releasing its TDZ.
   *
   * 在本环境定义（或重定义）绑定，解除 TDZ。
   *
   * Used to initialize `let`/`const`, bind parameters, inject `arguments` and install builtins.
   *
   * 用于初始化 `let`/`const`、绑定参数、注入 `arguments` 与安装内建。
   *
   * @param name - Binding name / 绑定名称
   * @param value - New value / 新值
   * @param mutable - Whether the binding is reassignable (ignored when the binding already exists)
   *   / 是否可重赋值（绑定已存在时忽略）
   */
  define(name: string, value: unknown, mutable = true): void {
    const existing = this.records.get(name);

    this.records.set(name, {
      value,
      mutable: existing == null ? mutable : existing.mutable,
    });

    if (this.globalObject != null) this.globalObject[name] = value;
  }

  /**
   * Initialize a binding in this environment, releasing its TDZ.
   *
   * 在本环境初始化绑定，解除 TDZ。
   *
   * Unlike `set`, this is allowed for constant bindings (used for `let`/`const` initializers and
   * `catch` parameters). Unlike `define`, it throws when the binding does not exist in this
   * environment.
   *
   * 与 `set` 不同，它允许常量绑定（用于 `let`/`const` 初始化与 `catch` 参数）；与 `define` 不同，它要求绑定 存在于本环境，否则抛错。
   *
   * @param name - Binding name / 绑定名称
   * @param value - New value / 新值
   */
  initialize(name: string, value: unknown): void {
    const binding = this.records.get(name);

    if (binding == null) throw new ReferenceError(`${name} is not defined`);

    binding.value = value;
  }

  /**
   * Delete an own binding in the nearest environment that declares it.
   *
   * 删除声明该绑定的最近环境中的自身绑定。
   *
   * @param name - Binding name / 绑定名称
   * @returns Whether a binding was removed / 是否删除了绑定
   */
  delete(name: string): boolean {
    if (this.records.has(name)) {
      this.records.delete(name);

      if (this.globalObject != null) {
        // oxlint-disable-next-line typescript/no-dynamic-delete -- the key is a binding name
        delete this.globalObject[name];
      }

      return true;
    }

    if (this.globalObject != null && Object.hasOwn(this.globalObject, name)) {
      // oxlint-disable-next-line typescript/no-dynamic-delete -- the key is a binding name
      delete this.globalObject[name];

      return true;
    }

    if (this.parent != null) return this.parent.delete(name);

    return false;
  }

  /**
   * Copy all own bindings into `target` (used for per-iteration loop environments).
   *
   * 将全部自身绑定复制到 `target`（用于循环的逐迭代环境）。
   *
   * @param target - The target environment / 目标环境
   */
  copyTo(target: Environment): void {
    for (const [name, binding] of this.records) target.records.set(name, { ...binding });
  }
}

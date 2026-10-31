// oxlint-disable max-statements complexity max-lines-per-function max-lines
// oxlint-disable-next-line max-classes-per-file
import type {
  ArrayExpr,
  ArrayPattern,
  ArrowFunctionExpr,
  AssignmentOperator,
  AssignmentTarget,
  BinaryOperator,
  BlockStatement,
  ClassBody,
  ClassMethod,
  ClassMethodKind,
  CallExpr,
  Expression,
  ExpressionStatement,
  FunctionExpr,
  IdentifierExpr,
  MemberExpr,
  NewExpr,
  ObjectExpr,
  ObjectPattern,
  ObjectProperty,
  Pattern,
  Program,
  RestPattern,
  SpreadExpr,
  SpreadProperty,
  Statement,
  TemplateExpr,
  TemplateQuasi,
  VariableDeclaration,
  VariableDeclarator,
} from "./ast.js";
import type { RunOptions } from "./index.js";
/**
 * Recursive descent parser for `@mptool/run`.
 *
 * `@mptool/run` 的递归下降解析器。
 *
 * The parser consumes the `Lexer` token stream and produces an AST (see `./ast.js`). It covers ES5
 * plus the planned ES6 subset: `let`/`const`, arrow functions, template literals, destructuring,
 * default/rest/spread, object literal enhancements, `for...of`, `class`, `async`/`await` and
 * optional chaining.
 *
 * 解析器消费 `Lexer` 的 token 流并产出 AST（见 `./ast.js`），覆盖 ES5 全量 + 计划内的 ES6 子集：
 * `let`/`const`、箭头函数、模板字符串、解构、默认参数/rest/spread、对象字面量增强、`for...of`、 `class`、`async`/`await` 与可选链。
 *
 * Template literal handling is parser-driven: after a `templateHead`/`templateMiddle`, the parser
 * parses the interpolation expression in code mode, consumes the closing `}`, then calls
 * `lexer.resumeTemplate()` to obtain the next `templateMiddle`/`templateTail`.
 *
 * 模板字符串由解析器驱动：拿到 `templateHead`/`templateMiddle` 后在代码模式下解析插值表达式， 消费闭合的 `}`，再调用
 * `lexer.resumeTemplate()` 获取下一个 `templateMiddle`/`templateTail`。
 */
import { Lexer } from "./lexer.js";
import type { Token } from "./lexer.js";

/** Feature flags with defaults applied / 应用默认值后的特性开关 */
export type FeatureOptions = Required<NonNullable<RunOptions["features"]>>;

const DEFAULT_FEATURES: FeatureOptions = {
  class: true,
  forOf: true,
  async: true,
  bigint: true,
};

/** Binary operator precedence (higher binds tighter); `**` is right-associative. */
const BINARY_PRECEDENCE: Readonly<Record<string, number>> = {
  "|": 6,
  "^": 7,
  "&": 8,
  "==": 9,
  "!=": 9,
  "===": 9,
  "!==": 9,
  "<": 10,
  ">": 10,
  "<=": 10,
  ">=": 10,
  in: 10,
  instanceof: 10,
  "<<": 11,
  ">>": 11,
  ">>>": 11,
  "+": 12,
  "-": 12,
  "*": 13,
  "/": 13,
  "%": 13,
  "**": 14,
};

/** Assignment operators / 赋值运算符 */
const ASSIGNMENT_OPERATORS: Readonly<Set<string>> = new Set([
  "=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "**=",
  "<<=",
  ">>=",
  ">>>=",
  "&=",
  "|=",
  "^=",
  "&&=",
  "||=",
  "??=",
]);

/**
 * The token value, or empty string for tokens without a value (e.g. eof).
 *
 * 返回 token 的值，无值的 token（如 eof）返回空字符串。
 *
 * @param token - Token to read / 待读取的 token
 * @returns The token value / token 的值
 */
const tokenValue = (token: Token): string => {
  // quoted property names carry their source text in `value`; the semantic name is `cooked`
  // 带引号的属性名原始文本在 `value` 中，语义名称应取 `cooked`
  if (token.type === "string") return token.cooked;

  return "value" in token ? token.value : "";
};

/**
 * Original source text of parsed function nodes, used for `Function.prototype.toString`.
 *
 * 已解析函数节点的源码原文，用于实现 `Function.prototype.toString`。
 */
const functionSources = new WeakMap<object, string>();

/**
 * Get the original source text of a parsed function/arrow node.
 *
 * 获取已解析函数/箭头节点的源码原文。
 *
 * @param node - Function AST node / 函数 AST 节点
 * @returns The source text, or `null` / 源码原文，或 `null`
 */
export const getFunctionSource = (node: object): string | null => functionSources.get(node) ?? null;

/**
 * Whether the token can be a property name (identifier/keyword/string/number/bigint).
 *
 * 判断 token 是否可作为属性名（标识符/关键字/字符串/数字/bigint）。
 *
 * @param token - Token to check / 待判断的 token
 * @returns Whether it is a property name / 是否为属性名
 */
const isPropertyNameToken = (token: Token): boolean =>
  token.type === "identifier" ||
  token.type === "keyword" ||
  token.type === "string" ||
  token.type === "number" ||
  token.type === "bigint";

/**
 * Human-readable description of a token for error messages.
 *
 * 返回 token 的人类可读描述，用于错误消息。
 *
 * @param token - Token to describe / 待描述的 token
 * @returns The description / 描述
 */
const describeToken = (token: Token): string =>
  token.type === "eof" ? "end of input" : `'${token.value}'`;

/**
 * Whether the token is an assignment operator.
 *
 * 判断 token 是否为赋值运算符。
 *
 * @param token - Token to check / 待判断的 token
 * @returns Whether it is an assignment operator / 是否为赋值运算符
 */
const isAssignmentOperator = (token: Token): boolean =>
  token.type === "punct" && ASSIGNMENT_OPERATORS.has(token.value);

/**
 * Whether an expression is a valid assignment target (identifier, member or call).
 *
 * 判断表达式是否为合法的赋值目标（标识符、成员或调用）。
 *
 * @param node - Expression to check / 待判断的表达式
 * @returns Whether it is a valid assignment target / 是否为合法赋值目标
 */
const isValidAssignmentTarget = (
  node: Expression,
): node is IdentifierExpr | MemberExpr | CallExpr =>
  node.type === "identifier" || node.type === "member" || node.type === "call";

/**
 * Find a CoverInitializedName (`{ a = 1 }`) property in an object literal.
 *
 * 查找对象字面量中的 CoverInitializedName（`{ a = 1 }`）属性。
 *
 * @param node - Object literal / 对象字面量
 * @returns The offending property range, or `null` / 违规属性的范围，无则 `null`
 */
const findCoverInitializedName = (node: ObjectExpr): { start: number; end: number } | null => {
  for (const prop of node.props) {
    if (prop.type !== "property" || !prop.shorthand || prop.value.type !== "assignment") continue;

    return { start: prop.start, end: prop.end };
  }

  return null;
};

/**
 * Map a token to a binary operator, or null if it is not one.
 *
 * 将 token 映射为二元运算符，非二元运算符时返回 null。
 *
 * @param token - Token to check / 待判断的 token
 * @returns The binary operator or null / 二元运算符或 null
 */
const binaryOperatorOf = (token: Token): BinaryOperator | null => {
  if (token.type === "punct") {
    if (BINARY_PRECEDENCE[token.value] == null) return null;

    return token.value as BinaryOperator;
  }

  if (token.type === "keyword" && (token.value === "in" || token.value === "instanceof"))
    return token.value;

  return null;
};

const getLineColumn = (source: string, offset: number): { line: number; column: number } => {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset; i += 1) {
    if (source[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
};

/**
 * Error thrown by the `Parser` on invalid syntax, carrying source positions.
 *
 * 解析器在遇到非法语法时抛出的错误，包含源码位置信息。
 */
export class ParseError extends SyntaxError {
  /** Start offset of the offending range / 出错范围的起始偏移 */
  readonly start: number;

  /** End offset of the offending range / 出错范围的结束偏移 */
  readonly end: number;

  /** 1-based line number / 从 1 开始的行号 */
  readonly line: number;

  /** 1-based column number / 从 1 开始的列号 */
  readonly column: number;

  /**
   * @param message - Error message / 错误信息
   * @param source - Full source string / 完整源码
   * @param start - Start offset / 起始偏移
   * @param end - End offset / 结束偏移
   */
  constructor(message: string, source: string, start: number, end: number) {
    const { line, column } = getLineColumn(source, start);

    super(`${message} (line ${line}, column ${column})`);

    this.name = "ParseError";
    this.start = start;
    this.end = end;
    this.line = line;
    this.column = column;
  }
}

/**
 * Parser budgets. They are opt-in (except the backtracking budget) so hosts can decide how much
 * untrusted dynamic code may consume while parsing.
 *
 * 解析器预算。除回溯预算外均为可选开启，由宿主决定解析不可信动态代码时允许的开销。
 */
export interface ParserLimits {
  /**
   * Maximum source length in code units, unlimited when omitted
   *
   * 源码长度上限（UTF-16 code unit），省略时不限制
   */
  maxSourceLength?: number;

  /**
   * Maximum expression/statement nesting depth, unlimited when omitted
   *
   * 表达式/语句最大嵌套深度，省略时不限制
   */
  maxParseDepth?: number;

  /**
   * Maximum number of tokens consumed while backtracking, `5000` by default
   *
   * 回溯期间允许消费的最大 token 数，默认 `5000`
   */
  maxBacktracks?: number;

  /**
   * Whether to apply strict-mode early errors (octal literals/escapes, duplicate parameters)
   *
   * 是否启用严格模式早错误（八进制字面量/转义、重复形参）
   */
  strict?: boolean;
}

/**
 * Default speculative parsing budget (tokens).
 *
 * The `async (...) => ...` cover-grammar probe parses a parenthesized group and rewinds when it is
 * not an arrow. Nested `async(` calls make that work grow exponentially, so speculative token
 * consumption is bounded and aborted with a `ParseError` instead of blocking the host thread.
 *
 * 默认回溯解析预算（token 数）。`async (...) => ...` 的 cover 语法探测会先整体解析括号再回滚；嵌套 `async(` 会使其指数增长，因此为试探期间的 token
 * 消费设置上限，超限抛出 `ParseError`，避免阻塞宿主线程。
 */
const DEFAULT_MAX_BACKTRACKS = 5000;

/**
 * Whether a statement is (or directly wraps) an iteration statement, used to validate `continue
 * label`.
 *
 * 判断语句是否为（或直接包裹）迭代语句，用于校验 `continue label`。
 *
 * @param statement - The statement / 语句
 * @returns Whether it is an iteration target / 是否为迭代目标
 */
const isIterationTarget = (statement: Statement): boolean => {
  let current = statement;

  while (current.type === "labeled") current = current.body;

  return ["for", "forIn", "forOf", "while", "doWhile"].includes(current.type);
};

/**
 * Collect the binding names of a pattern.
 *
 * 收集模式绑定的名称。
 *
 * @param pattern - The pattern / 模式
 * @param out - Collected names / 收集结果
 */
const patternNames = (pattern: AssignmentTarget, out: string[]): void => {
  switch (pattern.type) {
    case "identifier": {
      out.push(pattern.name);
      break;
    }
    case "assignmentPattern": {
      patternNames(pattern.left, out);
      break;
    }
    case "rest": {
      patternNames(pattern.argument, out);
      break;
    }
    case "arrayPattern": {
      for (const element of pattern.elements) if (element != null) patternNames(element, out);
      break;
    }
    case "objectPattern": {
      for (const prop of pattern.props)
        /* istanbul ignore else -- the parser never emits an object-pattern property without a value */
        if (prop.value != null) patternNames(prop.value, out);
      if (pattern.rest != null) patternNames(pattern.rest.argument, out);
      break;
    }
    /* istanbul ignore next -- AssignmentTarget is exhaustively handled above */
    default: {
      break;
    }
  }
};

/**
 * Recursive descent parser producing an AST.
 *
 * 递归下降解析器，产出 AST。
 */
export class Parser {
  private readonly lexer: Lexer;
  private readonly features: FeatureOptions;
  private readonly tokens: Token[] = [];
  private pos = 0;
  private lastEnd = 0;
  private inAsyncFunction = false;
  /** Nesting depth of speculative (backtracked) parses / 试探（回溯）解析的嵌套深度 */
  private speculationDepth = 0;
  /** Tokens consumed while speculating, bounded by `maxBacktracks` / 试探期间已消费的 token 数 */
  private speculativeTokens = 0;
  /** Current expression/statement nesting depth / 当前表达式/语句嵌套深度 */
  private parseDepth = 0;
  /** Nesting depth of function bodies (return legality) / 函数体嵌套深度（return 合法性） */
  private functionDepth = 0;
  /** Nesting depth of loops (break/continue legality) / 循环嵌套深度（break/continue 合法性） */
  private loopDepth = 0;
  /** Nesting depth of switch statements / switch 嵌套深度 */
  private switchDepth = 0;
  /**
   * CoverInitializedName markers collected while a cover grammar may still turn into a pattern.
   *
   * `null` outside a cover grammar (a plain object literal is rejected immediately); an array
   * inside a cover grammar (parenthesized arrow parameters, `for-in`/`for-of` heads), where the
   * object may still be converted into a destructuring pattern.
   *
   * CoverInitializedName 标记：处于 cover 语法（括号箭头参数、`for-in`/`for-of` 头部）时收集，`null` 表示普通表达式上下文（立即报错）。
   */
  private pendingCoverInitialized: { start: number; end: number }[] | null = null;
  /** Labels currently in scope / 当前作用域内的标签 */
  private readonly labels: { name: string; token: Token; needsIteration: boolean }[] = [];
  private readonly strict: boolean;
  private readonly maxSourceLength: number;
  private readonly maxParseDepth: number;
  private readonly maxBacktracks: number;

  /**
   * @param source - Source code to parse / 待解析的源码
   * @param features - Feature toggles / 特性开关
   * @param limits - Parser budgets / 解析器预算
   */
  constructor(
    private readonly source: string,
    features?: Partial<FeatureOptions>,
    limits: ParserLimits = {},
  ) {
    this.lexer = new Lexer(source);
    this.features = { ...DEFAULT_FEATURES, ...features };
    this.strict = limits.strict ?? false;
    this.maxSourceLength = limits.maxSourceLength ?? Number.POSITIVE_INFINITY;
    this.maxParseDepth = limits.maxParseDepth ?? Number.POSITIVE_INFINITY;
    this.maxBacktracks = limits.maxBacktracks ?? DEFAULT_MAX_BACKTRACKS;
  }

  /**
   * Record the source text of every function/arrow node for `Function.prototype.toString`.
   *
   * 记录所有函数/箭头节点的源码原文，供 `Function.prototype.toString` 使用。
   *
   * @param programBody - Parsed program body / 已解析的 program 主体
   */
  private recordFunctionSources(programBody: Statement[]): void {
    const record = (value: unknown): void => {
      if (value == null || typeof value !== "object") return;

      const node = value as { type?: string; start?: number; end?: number };

      if (
        (node.type === "functionDeclaration" ||
          node.type === "functionExpr" ||
          node.type === "arrow" ||
          node.type === "classMethod") &&
        typeof node.start === "number" &&
        typeof node.end === "number"
      ) {
        let text = this.source.slice(node.start, node.end);
        const { kind } = node as { kind?: string };

        // V8's Function.prototype.toString omits the `static` modifier
        // V8 的 Function.prototype.toString 会省略 `static` 修饰符
        if (
          node.type === "classMethod" &&
          (kind === "static" || kind === "staticGet" || kind === "staticSet")
        )
          text = text.slice("static".length).trimStart();

        functionSources.set(node, text);
      }

      for (const key of Object.keys(node)) {
        const child = (node as Record<string, unknown>)[key];

        if (Array.isArray(child)) for (const item of child) record(item);
        else record(child);
      }
    };

    for (const statement of programBody) record(statement);
  }

  /**
   * Parse the whole source into a program.
   *
   * 将整个源码解析为 program。
   *
   * @returns The parsed program / 解析出的 program
   */
  parseProgram(): Program {
    if (this.source.length > this.maxSourceLength) {
      throw new ParseError(
        `Source code length ${this.source.length} exceeds the limit of ${this.maxSourceLength}`,
        this.source,
        0,
        this.source.length,
      );
    }

    const { start } = this.current();
    const body: Statement[] = [];

    for (;;) {
      // a statement may start with a regex literal (`if (x) /re/`, `{ } /re/`)
      // 语句可以以正则字面量开头（`if (x) /re/`、`{ } /re/`）
      if (this.pos >= this.tokens.length) this.lexer.expectRegex();

      if (this.current().type === "eof") break;

      body.push(this.parseStatement());
    }

    this.recordFunctionSources(body);

    return { type: "program", body, start, end: this.lastEnd };
  }

  // ---------------------------------------------------------------------------
  // Token helpers
  // ---------------------------------------------------------------------------

  /**
   * Get the current token, fetching from the lexer if needed.
   *
   * 获取当前 token，必要时向词法分析器取下一个。
   *
   * @returns The current token / 当前 token
   */
  private current(): Token {
    if (this.pos >= this.tokens.length) this.fetch();

    return this.tokens[this.pos];
  }

  /**
   * Peek `offset` tokens ahead without consuming.
   *
   * 向前预读 `offset` 个 token 但不消费。
   *
   * @param offset - Number of tokens ahead / 向前预读的 token 数
   * @returns The peeked token / 预读到的 token
   */
  private peek(offset = 1): Token {
    while (this.pos + offset >= this.tokens.length) this.fetch();

    return this.tokens[this.pos + offset];
  }

  /**
   * Consume and return the current token.
   *
   * 消费并返回当前 token。
   *
   * @returns The consumed token / 被消费的 token
   */
  private advance(): Token {
    const token = this.current();

    this.pos += 1;
    this.lastEnd = token.end;

    if (this.speculationDepth > 0) {
      this.speculativeTokens += 1;

      if (this.speculativeTokens > this.maxBacktracks)
        throw this.error("Parser backtracking limit exceeded", token);
    }

    return token;
  }

  /** Fetch one token from the lexer in code mode. */
  private fetch(): void {
    this.tokens.push(this.lexer.next());
  }

  /**
   * Fetch the template continuation token via `lexer.resumeTemplate()`.
   *
   * If the token was already fetched (e.g. by a backtracked cover parse), it is reused instead of
   * asking the lexer again.
   *
   * 通过 `lexer.resumeTemplate()` 获取模板续接 token；若该 token 已被预取（例如被回溯的 cover 解析取过）， 则直接复用，避免再次询问词法分析器。
   *
   * @returns The `templateMiddle` or `templateTail` token / `templateMiddle` 或 `templateTail` token
   */
  private resumeTemplate(): Token {
    if (this.pos < this.tokens.length) return this.tokens[this.pos];

    const token = this.lexer.resumeTemplate();

    this.tokens.push(token);

    return token;
  }

  /**
   * Save the parser position for backtracking.
   *
   * 保存解析位置以便回溯。
   *
   * @returns The saved snapshot / 保存的快照
   */
  private save(): { pos: number; lastEnd: number } {
    return { pos: this.pos, lastEnd: this.lastEnd };
  }

  /**
   * Restore a previously saved position.
   *
   * 恢复之前保存的位置。
   *
   * @param snapshot - The saved snapshot / 保存的快照
   */
  private restore(snapshot: { pos: number; lastEnd: number }): void {
    this.pos = snapshot.pos;
    this.lastEnd = snapshot.lastEnd;
  }

  /**
   * Whether the current token is a punct/keyword with the given value.
   *
   * 判断当前 token 是否为指定值的 punct/keyword。
   *
   * @param value - The expected token value / 期望的 token 值
   * @returns Whether it matches / 是否匹配
   */
  private match(value: string): boolean {
    const token = this.current();

    return (token.type === "punct" || token.type === "keyword") && token.value === value;
  }

  /**
   * Whether the current token is the identifier with the given name.
   *
   * 判断当前 token 是否为指定名称的标识符。
   *
   * @param name - The expected identifier name / 期望的标识符名
   * @returns Whether it matches / 是否匹配
   */
  private matchIdentifier(name: string): boolean {
    const token = this.current();

    return token.type === "identifier" && token.value === name;
  }

  /**
   * Consume the current token if it matches `value`, otherwise throw.
   *
   * 若当前 token 匹配 `value` 则消费之，否则抛错。
   *
   * @param value - The expected token value / 期望的 token 值
   * @returns The consumed token / 被消费的 token
   */
  private expect(value: string): Token {
    const token = this.current();

    if ((token.type === "punct" || token.type === "keyword") && token.value === value)
      return this.advance();

    throw this.error(`Expected '${value}' but found ${describeToken(token)}`);
  }

  /**
   * Create a `ParseError` pointing at the given token.
   *
   * 创建指向给定 token 的 `ParseError`。
   *
   * @param message - Error message / 错误信息
   * @param token - Token to point at / 指向的 token
   * @returns The created error / 创建的错误
   */
  private error(message: string, token: Token = this.current()): ParseError {
    return new ParseError(message, this.source, token.start, token.end);
  }

  /**
   * Prepare the current position as the start of an expression.
   *
   * A `/` at an expression start always begins a regular expression literal. When the token was
   * already fetched in a preceding context (e.g. a buffered `else` lookahead after a block), the
   * lexer may have read it as division; re-lex it from its source offset in expression position.
   *
   * 将当前位置标记为表达式起始位置。表达式起始处的 `/` 必为正则字面量；若该 token 已在先前上下文 （如块语句后预读
   * `else`）被读成除号，则从其源码偏移处以表达式位置重新词法分析。
   */
  private expectExpressionStart(): void {
    if (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];

      if (token.type !== "punct" || token.value !== "/") return;

      this.tokens.length = this.pos;
      this.lexer.restartAt(token.start);
    }

    this.lexer.expectRegex();
  }

  /**
   * Reject a CoverInitializedName that did not become a destructuring pattern.
   *
   * In a cover grammar it is buffered until the grammar is resolved (a `for-in`/`for-of` head or
   * arrow parameters may still turn the object into a pattern); everywhere else it is an early
   * error, because a plain object literal only allows shorthand properties.
   *
   * 拒绝未能转换为解构模式的 CoverInitializedName。cover 语法中先缓存，待语法确定（`for-in`/`for-of`
   * 头部或箭头参数仍可能转换为模式）后再判断；其余上下文立即报错，因为普通对象字面量只允许简写属性。
   *
   * @param node - Object literal / 对象字面量
   */
  private rejectCoverInitializedName(node: ObjectExpr): void {
    const offending = findCoverInitializedName(node);

    /* istanbul ignore if -- only called for object literals that contain one */
    if (offending == null) return;

    if (this.pendingCoverInitialized != null) {
      this.pendingCoverInitialized.push(offending);

      return;
    }

    throw new ParseError(
      "Invalid shorthand property initializer",
      this.source,
      offending.start,
      offending.end,
    );
  }

  // ---------------------------------------------------------------------------
  // Statements
  // ---------------------------------------------------------------------------

  private parseStatement(): Statement {
    // a statement may begin with a regex literal, even after `)` / `}` where the lexer's
    // last-token heuristic would treat `/` as division (`if (x) /re/.test(y)`)
    // 语句可以以正则字面量开头：`if (x) /re/.test(y)` 中 `)` 之后的 `/` 必须按正则处理
    if (this.pos >= this.tokens.length) this.lexer.expectRegex();

    this.parseDepth += 1;

    if (this.parseDepth > this.maxParseDepth)
      throw this.error(`Maximum parse depth of ${this.maxParseDepth} exceeded`);

    try {
      return this.parseStatementInner();
    } finally {
      this.parseDepth -= 1;
    }
  }

  private parseStatementInner(): Statement {
    const token = this.current();

    if (this.match("{")) return this.parseBlock();
    if (this.match(";")) {
      const empty = this.advance();

      return { type: "empty", start: empty.start, end: empty.end };
    }

    if (token.type === "keyword") {
      switch (token.value) {
        case "var":
        case "let":
        case "const": {
          return this.parseVariableStatement();
        }
        case "if": {
          return this.parseIfStatement();
        }
        case "for": {
          return this.parseForStatement();
        }
        case "while": {
          return this.parseWhileStatement();
        }
        case "do": {
          return this.parseDoWhileStatement();
        }
        case "switch": {
          return this.parseSwitchStatement();
        }
        case "try": {
          return this.parseTryStatement();
        }
        case "throw": {
          return this.parseThrowStatement();
        }
        case "return": {
          return this.parseReturnStatement();
        }
        case "break": {
          return this.parseBreakContinue(false);
        }
        case "continue": {
          return this.parseBreakContinue(true);
        }
        case "function": {
          return this.parseFunctionDeclaration(false);
        }
        case "class": {
          return this.parseClassDeclaration();
        }
        case "debugger": {
          const debuggerToken = this.advance();

          if (this.match(";")) this.advance();

          return { type: "debugger", start: debuggerToken.start, end: this.lastEnd };
        }
        case "with": {
          throw this.error("'with' statements are not supported", token);
        }
        case "import":
        case "export":
        case "enum": {
          throw this.error(`'${token.value}' is not supported`, token);
        }
        default: {
          return this.parseExpressionStatement();
        }
      }
    }

    // async function declaration
    if (
      token.type === "identifier" &&
      token.value === "async" &&
      !this.peek().newlineBefore &&
      this.peek().type === "keyword" &&
      tokenValue(this.peek()) === "function"
    )
      return this.parseFunctionDeclaration(true);

    // labeled statement
    if (token.type === "identifier" && tokenValue(this.peek()) === ":")
      return this.parseLabeledStatement();

    return this.parseExpressionStatement();
  }

  private parseBlock(): BlockStatement {
    const { start } = this.current();

    this.expect("{");

    const body: Statement[] = [];

    for (;;) {
      if (this.pos >= this.tokens.length) this.lexer.expectRegex();

      if (this.match("}")) {
        this.advance();
        break;
      }

      if (this.current().type === "eof") throw this.error("Unexpected end of input, expected '}'");

      body.push(this.parseStatement());
    }

    return { type: "block", body, start, end: this.lastEnd };
  }

  private parseVariableStatement(): VariableDeclaration {
    const kindToken = this.advance();
    const declarations = [this.parseVariableDeclarator(true)];

    while (this.match(",")) {
      this.advance();
      declarations.push(this.parseVariableDeclarator(true));
    }

    if (tokenValue(kindToken) === "const") this.requireConstInitializers(declarations);

    if (this.match(";")) this.advance();

    return {
      type: "variable",
      kind: tokenValue(kindToken) as "var" | "let" | "const",
      declarations,
      start: kindToken.start,
      end: this.lastEnd,
    };
  }

  private parseVariableDeclarator(allowIn: boolean): VariableDeclarator {
    const { start } = this.current();
    const id = this.parseBindingTarget();
    let init: Expression | null = null;

    if (this.match("=")) {
      this.advance();
      init = this.parseAssignment(allowIn);
    }

    return { id, init, start, end: this.lastEnd };
  }

  /**
   * Validate that every `const` declarator has an initializer.
   *
   * 校验每个 `const` 声明符都有初始化器。
   *
   * @param declarations - Declarators / 声明符
   */
  private requireConstInitializers(declarations: VariableDeclarator[]): void {
    for (const declaration of declarations)
      if (declaration.init == null) throw this.error("Missing initializer in const declaration");
  }

  /**
   * Validate the binding of a `for-in` / `for-of` header.
   *
   * 校验 `for-in` / `for-of` 头部的绑定。
   *
   * @param declarations - Declarators / 声明符
   */
  private requireSingleForBinding(declarations: VariableDeclarator[]): void {
    if (declarations.length > 1)
      throw this.error("Only one binding is allowed in a for-in/of header");

    if (declarations[0].init != null)
      throw this.error("for-in/of loop variable declaration may not have an initializer");
  }

  private parseIfStatement(): Statement {
    const { start } = this.current();

    this.expect("if");
    this.expect("(");

    const test = this.parseExpression(true);

    this.expect(")");

    const consequent = this.parseStatement();
    let alternate: Statement | null = null;

    if (this.match("else")) {
      this.advance();
      alternate = this.parseStatement();
    }

    return { type: "if", test, consequent, alternate, start, end: this.lastEnd };
  }

  private parseWhileStatement(): Statement {
    const { start } = this.current();

    this.expect("while");
    this.expect("(");

    const test = this.parseExpression(true);

    this.expect(")");

    this.loopDepth += 1;

    let body: Statement;

    try {
      body = this.parseStatement();
    } finally {
      this.loopDepth -= 1;
    }

    return { type: "while", test, body, start, end: this.lastEnd };
  }

  private parseDoWhileStatement(): Statement {
    const { start } = this.current();

    this.expect("do");

    this.loopDepth += 1;

    let body: Statement;

    try {
      body = this.parseStatement();
    } finally {
      this.loopDepth -= 1;
    }

    this.expect("while");
    this.expect("(");

    const test = this.parseExpression(true);

    this.expect(")");

    if (this.match(";")) this.advance();

    return { type: "doWhile", test, body, start, end: this.lastEnd };
  }

  private parseForStatement(): Statement {
    const { start } = this.current();

    this.expect("for");
    this.expect("(");

    if (this.match(";")) {
      this.advance();

      const test = this.match(";") ? null : this.parseExpression(true);

      this.expect(";");

      const update = this.match(")") ? null : this.parseExpression(true);

      this.expect(")");

      this.loopDepth += 1;

      let body: Statement;

      try {
        body = this.parseStatement();
      } finally {
        this.loopDepth -= 1;
      }

      return { type: "for", init: null, test, update, body, start, end: this.lastEnd };
    }

    // `for await` (async iteration) is not supported
    if (this.matchIdentifier("await")) throw this.error("for await is not supported");

    if (this.match("var") || this.match("let") || this.match("const")) {
      const kindToken = this.advance();
      const declarations = [this.parseVariableDeclarator(false)];

      while (this.match(",")) {
        this.advance();
        declarations.push(this.parseVariableDeclarator(false));
      }

      const declaration: VariableDeclaration = {
        type: "variable",
        kind: tokenValue(kindToken) as "var" | "let" | "const",
        declarations,
        start: kindToken.start,
        end: this.lastEnd,
      };

      if (this.match("in")) {
        this.advance();

        this.requireSingleForBinding(declarations);

        const right = this.parseExpression(true);

        this.expect(")");

        this.loopDepth += 1;

        let body: Statement;

        try {
          body = this.parseStatement();
        } finally {
          this.loopDepth -= 1;
        }

        return { type: "forIn", left: declaration, right, body, start, end: this.lastEnd };
      }

      if (this.matchIdentifier("of")) {
        if (!this.features.forOf) throw this.error("for...of is not supported", this.current());

        this.advance();

        this.requireSingleForBinding(declarations);

        const right = this.parseAssignment(true);

        this.expect(")");

        this.loopDepth += 1;

        let body: Statement;

        try {
          body = this.parseStatement();
        } finally {
          this.loopDepth -= 1;
        }

        return { type: "forOf", left: declaration, right, body, start, end: this.lastEnd };
      }

      if (tokenValue(kindToken) === "const") this.requireConstInitializers(declarations);

      this.expect(";");

      const test = this.match(";") ? null : this.parseExpression(true);

      this.expect(";");

      const update = this.match(")") ? null : this.parseExpression(true);

      this.expect(")");

      this.loopDepth += 1;

      let body: Statement;

      try {
        body = this.parseStatement();
      } finally {
        this.loopDepth -= 1;
      }

      return { type: "for", init: declaration, test, update, body, start, end: this.lastEnd };
    }

    // A `for-in`/`for-of` head is an assignment target, so a CoverInitializedName there may still
    // become a destructuring pattern; buffer it until the head form is known.
    // `for-in`/`for-of` 头部是赋值目标，其中的 CoverInitializedName 仍可能成为解构模式，
    // 因此先缓存，待确定头部形式后再判断。
    const outerCover = this.pendingCoverInitialized;
    const coverMarkers: { start: number; end: number }[] = [];
    let init: Expression;

    this.pendingCoverInitialized = coverMarkers;

    try {
      init = this.parseExpression(false);
    } finally {
      this.pendingCoverInitialized = outerCover;
    }

    if (this.match("in")) {
      this.advance();

      const right = this.parseExpression(true);

      this.expect(")");

      this.loopDepth += 1;

      let body: Statement;

      try {
        body = this.parseStatement();
      } finally {
        this.loopDepth -= 1;
      }

      const left: AssignmentTarget | VariableDeclaration = this.toAssignmentTarget(init);

      return { type: "forIn", left, right, body, start, end: this.lastEnd };
    }

    if (this.matchIdentifier("of")) {
      if (!this.features.forOf) throw this.error("for...of is not supported", this.current());

      this.advance();

      const right = this.parseAssignment(true);

      this.expect(")");

      this.loopDepth += 1;

      let body: Statement;

      try {
        body = this.parseStatement();
      } finally {
        this.loopDepth -= 1;
      }

      const left: AssignmentTarget | VariableDeclaration = this.toAssignmentTarget(init);

      return { type: "forOf", left, right, body, start, end: this.lastEnd };
    }

    // not a destructuring head: the buffered CoverInitializedName is an early error
    // 不是解构头部：缓存的 CoverInitializedName 属于早期错误
    const [coverMarker] = coverMarkers;

    /* istanbul ignore else -- every buffered marker is pushed by rejectCoverInitializedName */
    if (coverMarker != null) {
      throw new ParseError(
        "Invalid shorthand property initializer",
        this.source,
        coverMarker.start,
        coverMarker.end,
      );
    }

    this.expect(";");

    const test = this.match(";") ? null : this.parseExpression(true);

    this.expect(";");

    const update = this.match(")") ? null : this.parseExpression(true);

    this.expect(")");

    this.loopDepth += 1;

    let body: Statement;

    try {
      body = this.parseStatement();
    } finally {
      this.loopDepth -= 1;
    }

    return { type: "for", init, test, update, body, start, end: this.lastEnd };
  }

  private parseSwitchStatement(): Statement {
    const { start } = this.current();

    this.expect("switch");
    this.expect("(");

    const discriminant = this.parseExpression(true);

    this.expect(")");
    this.expect("{");

    const cases: { test: Expression | null; body: Statement[] }[] = [];

    this.switchDepth += 1;

    while (!this.match("}")) {
      let test: Expression | null;

      if (this.match("case")) {
        this.advance();
        test = this.parseExpression(true);
      } else if (this.match("default")) {
        this.advance();
        test = null;
      } else {
        throw this.error("Expected 'case' or 'default'");
      }

      this.expect(":");

      const body: Statement[] = [];

      for (;;) {
        if (this.pos >= this.tokens.length) this.lexer.expectRegex();

        if (this.match("case") || this.match("default") || this.match("}")) break;

        if (this.current().type === "eof") throw this.error("Unexpected end of input");

        body.push(this.parseStatement());
      }

      cases.push({ test, body });
    }

    this.switchDepth -= 1;

    this.expect("}");

    return { type: "switch", discriminant, cases, start, end: this.lastEnd };
  }

  private parseTryStatement(): Statement {
    const { start } = this.current();

    this.expect("try");

    const block = this.parseBlock();
    let handler: { param: Pattern | null; body: BlockStatement } | null = null;
    let finalizer: BlockStatement | null = null;

    /* istanbul ignore else -- a buffered lookahead already fixed its own regex/division reading */
    if (this.pos >= this.tokens.length) this.lexer.expectRegex();

    if (this.match("catch")) {
      this.advance();

      let param: Pattern | null = null;

      if (this.match("(")) {
        this.advance();
        param = this.parseBindingTarget();
        this.expect(")");
      }

      handler = { param, body: this.parseBlock() };
    }

    if (this.pos >= this.tokens.length) this.lexer.expectRegex();

    if (this.match("finally")) {
      this.advance();
      finalizer = this.parseBlock();
    }

    if (handler == null && finalizer == null)
      throw this.error("Missing catch or finally after try");

    return { type: "try", block, handler, finalizer, start, end: this.lastEnd };
  }

  private parseThrowStatement(): Statement {
    const { start } = this.current();

    this.advance();

    // `throw` is a restricted production: a line terminator before the operand is a syntax error
    // `throw` 是受限产生式：操作数前出现行终结符属于语法错误
    if (this.current().newlineBefore) throw this.error("Illegal newline after 'throw'");

    const argument = this.parseExpression(true);

    if (this.match(";")) this.advance();

    return { type: "throw", argument, start, end: this.lastEnd };
  }

  private parseReturnStatement(): Statement {
    const token = this.current();
    const { start } = token;

    this.advance();

    if (this.functionDepth === 0) throw this.error("Illegal return statement", token);

    let argument: Expression | null = null;

    // restricted production: a line terminator after `return` terminates the statement
    // 受限产生式：`return` 后出现行终结符即结束语句（返回 undefined）
    if (
      !this.current().newlineBefore &&
      !this.match(";") &&
      !this.match("}") &&
      this.current().type !== "eof"
    )
      argument = this.parseExpression(true);

    if (this.match(";")) this.advance();

    return { type: "return", argument, start, end: this.lastEnd };
  }

  private parseBreakContinue(isContinue: boolean): Statement {
    const startToken = this.current();
    const { start } = startToken;

    this.advance();

    let label: string | null = null;

    // restricted production: a line terminator after `break`/`continue` ends the statement
    // 受限产生式：`break`/`continue` 后出现行终结符即结束语句（无标签）
    if (!this.current().newlineBefore && this.current().type === "identifier")
      label = tokenValue(this.advance());

    if (this.match(";")) this.advance();

    if (label == null) {
      if (isContinue) {
        if (this.loopDepth === 0) throw this.error("Illegal continue statement", startToken);
      } else if (this.loopDepth === 0 && this.switchDepth === 0) {
        throw this.error("Illegal break statement", startToken);
      }
    } else {
      const target = [...this.labels].reverse().find((item) => item.name === label);

      if (target == null) throw this.error(`Undefined label '${label}'`, startToken);

      // `continue label` only allows labels that denote an iteration statement
      // `continue label` 只允许指向迭代语句的标签
      if (isContinue) target.needsIteration = true;
    }

    if (isContinue) return { type: "continue", label, start, end: this.lastEnd };

    return { type: "break", label, start, end: this.lastEnd };
  }

  private parseLabeledStatement(): Statement {
    const labelToken = this.advance();
    const labelName = tokenValue(labelToken);

    if (this.labels.some((item) => item.name === labelName))
      throw this.error(`Label '${labelName}' has already been declared`, labelToken);

    this.expect(":");

    const label = { name: labelName, token: labelToken, needsIteration: false };

    this.labels.push(label);

    let body: Statement;

    try {
      body = this.parseStatement();
    } finally {
      this.labels.pop();
    }

    if (label.needsIteration && !isIterationTarget(body))
      throw this.error(`Illegal continue target '${labelName}'`, labelToken);

    return {
      type: "labeled",
      label: labelName,
      body,
      start: labelToken.start,
      end: body.end,
    };
  }

  private parseExpressionStatement(): ExpressionStatement {
    const { start } = this.current();
    const expression = this.parseExpression(true);

    if (this.match(";")) this.advance();

    return { type: "expression", expression, start, end: this.lastEnd };
  }

  private parseFunctionDeclaration(isAsync: boolean): Statement {
    if (isAsync) {
      if (!this.features.async) throw this.error("'async' is not supported");
      this.advance();
    }

    const { start } = this.advance();

    if (this.match("*")) throw this.error("Generator functions are not supported");

    const name = this.parseFunctionName();
    const params = this.parseParams();
    const body = this.parseFunctionBody(isAsync);

    return {
      type: "functionDeclaration",
      name,
      params,
      body,
      isAsync,
      start,
      end: this.lastEnd,
    };
  }

  private parseFunctionName(): string {
    const token = this.current();

    if (token.type === "identifier") {
      this.advance();

      return token.value;
    }

    throw this.error("Expected a function name", token);
  }

  private parseParams(): Pattern[] {
    this.expect("(");

    const params: Pattern[] = [];

    if (this.match(")")) {
      this.advance();
      this.validateParams(params);

      return params;
    }

    if (this.match("...")) {
      const restStart = this.current().start;

      this.advance();

      const argument = this.parseBindingTarget();

      params.push({ type: "rest", argument, start: restStart, end: argument.end });
      this.expect(")");
      this.validateParams(params);

      return params;
    }

    for (;;) {
      // a rest parameter may follow regular parameters (it is the last parameter)
      // rest 参数可位于普通参数之后（作为最后一个参数）
      if (this.match("...")) {
        const restStart = this.current().start;

        this.advance();

        const argument = this.parseBindingTarget();

        params.push({ type: "rest", argument, start: restStart, end: argument.end });
        break;
      }

      let target = this.parseBindingTarget();

      if (this.match("=")) {
        this.advance();
        target = {
          type: "assignmentPattern",
          left: target,
          right: this.parseAssignment(true),
          start: target.start,
          end: this.lastEnd,
        };
      }

      params.push(target);

      if (this.match(",")) {
        this.advance();

        if (this.match(")")) break;

        continue;
      }

      break;
    }

    this.expect(")");
    this.validateParams(params);

    return params;
  }

  /**
   * Reject duplicate parameter names (always for non-simple lists, in strict mode for simple ones).
   *
   * 拒绝重复形参（非简单参数列表始终拒绝；简单列表仅严格模式拒绝）。
   *
   * @param params - Parsed parameters / 已解析参数
   */
  private validateParams(params: readonly Pattern[]): void {
    const names: string[] = [];
    const seen = new Set<string>();
    const nonSimple = params.some((param) => param.type !== "identifier");

    for (const param of params) patternNames(param, names);

    for (const name of names) {
      if (seen.has(name) && (this.strict || nonSimple))
        throw this.error(`Duplicate parameter name '${name}'`);

      seen.add(name);
    }
  }

  /**
   * Parse inside a function context: `return` becomes legal, while `break`/`continue` and labels do
   * not cross the function boundary.
   *
   * 在函数上下文中解析：`return` 合法，而 `break`/`continue` 与标签不能跨函数边界。
   *
   * @param isAsync - Whether the function is async / 是否 async 函数
   * @param parse - Callback parsing the body / 解析函数体的回调
   * @returns The parse result / 解析结果
   */
  private parseWithFunctionContext<T>(isAsync: boolean, parse: () => T): T {
    const savedAsync = this.inAsyncFunction;
    const savedFunctionDepth = this.functionDepth;
    const savedLoopDepth = this.loopDepth;
    const savedSwitchDepth = this.switchDepth;
    const savedLabels = [...this.labels];

    this.inAsyncFunction = isAsync;
    this.functionDepth += 1;
    this.loopDepth = 0;
    this.switchDepth = 0;
    this.labels.length = 0;

    try {
      return parse();
    } finally {
      this.inAsyncFunction = savedAsync;
      this.functionDepth = savedFunctionDepth;
      this.loopDepth = savedLoopDepth;
      this.switchDepth = savedSwitchDepth;
      this.labels.length = 0;
      this.labels.push(...savedLabels);
    }
  }

  private parseFunctionBody(isAsync: boolean): BlockStatement {
    return this.parseWithFunctionContext(isAsync, () => this.parseBlock());
  }

  private parseClassDeclaration(): Statement {
    if (!this.features.class) throw this.error("'class' is not supported");

    const { start } = this.current();

    this.expect("class");

    const nameToken = this.current();

    if (nameToken.type !== "identifier") throw this.error("Expected a class name", nameToken);

    this.advance();

    const { superClass, body } = this.parseClassTail();

    return {
      type: "classDeclaration",
      name: nameToken.value,
      superClass,
      body,
      start,
      end: this.lastEnd,
    };
  }

  private parseClassTail(): { superClass: Expression | null; body: ClassBody } {
    let superClass: Expression | null = null;

    if (this.match("extends")) {
      this.advance();
      superClass = this.parseLeftHandSide();
    }

    return { superClass, body: this.parseClassBody() };
  }

  private parseClassBody(): ClassBody {
    const { start } = this.current();

    this.expect("{");

    const methods: ClassMethod[] = [];
    let hasConstructor = false;

    while (!this.match("}")) {
      if (this.match(";")) {
        this.advance();
        continue;
      }

      if (this.current().type === "eof") throw this.error("Unexpected end of input");

      const method = this.parseClassMethod();

      if (method.kind === "constructor") {
        if (hasConstructor) throw this.error("A class may only have one constructor");

        hasConstructor = true;
      }

      methods.push(method);
    }

    this.expect("}");

    return { type: "classBody", methods, start, end: this.lastEnd };
  }

  private parseClassMethod(): ClassMethod {
    const { start } = this.current();
    let isStatic = false;
    let isAsync = false;
    let kind: ClassMethodKind = "method";

    // `static` modifier — `static() {}` / `static = x` / `static;` are not modifiers
    const staticToken = this.current();

    if (staticToken.type === "keyword" && staticToken.value === "static") {
      const next = tokenValue(this.peek());

      if (next !== "(" && next !== "=" && next !== ";" && next !== "}") {
        isStatic = true;
        this.advance();
      }
    }

    // `async` modifier — `async() {}` / `async = x` are not modifiers
    const asyncToken = this.current();

    if (
      asyncToken.type === "identifier" &&
      asyncToken.value === "async" &&
      !this.peek().newlineBefore
    ) {
      const next = tokenValue(this.peek());

      if (next !== "(" && next !== "=" && next !== ";" && next !== "}") {
        if (!this.features.async) throw this.error("'async' is not supported");

        isAsync = true;
        this.advance();
      }
    }

    // getter/setter
    const accessorToken = this.current();

    if (
      accessorToken.type === "identifier" &&
      (accessorToken.value === "get" || accessorToken.value === "set") &&
      (isPropertyNameToken(this.peek()) || tokenValue(this.peek()) === "[")
    ) {
      if (accessorToken.value === "get") kind = isStatic ? "staticGet" : "get";
      else kind = isStatic ? "staticSet" : "set";
      this.advance();
    }

    const { key, computed } = this.parsePropertyKey();

    if (key === "constructor" && !computed && !isStatic) {
      if (isAsync) throw this.error("Class constructor may not be async");

      if (kind === "get" || kind === "set")
        throw this.error("Class constructor may not be an accessor");
    }

    if (kind === "method" && key === "constructor" && !computed && !isAsync && !isStatic)
      kind = "constructor";
    else if (kind === "method" && isStatic) kind = "static";

    const params = this.parseParams();
    const body = this.parseFunctionBody(isAsync);

    return {
      type: "classMethod",
      kind,
      key,
      computed,
      params,
      body,
      isAsync,
      start,
      end: this.lastEnd,
    };
  }

  // ---------------------------------------------------------------------------
  // Patterns
  // ---------------------------------------------------------------------------

  private parseBindingTarget(): Pattern {
    const token = this.current();

    if (this.match("[")) return this.parseArrayPattern();
    if (this.match("{")) return this.parseObjectPattern();

    if (token.type === "identifier") {
      this.advance();

      return { type: "identifier", name: token.value, start: token.start, end: token.end };
    }

    throw this.error("Expected a binding target", token);
  }

  /**
   * Parse an array destructuring pattern.
   *
   * 解析数组解构模式。
   *
   * @returns The parsed pattern / 解析出的模式
   */
  private parseArrayPattern(): ArrayPattern {
    const { start } = this.current();

    this.expect("[");

    const elements: (Pattern | null | RestPattern)[] = [];

    while (!this.match("]")) {
      if (this.match(",")) {
        this.advance();
        elements.push(null);
        continue;
      }

      if (this.match("...")) {
        const restStart = this.current().start;

        this.advance();

        const argument = this.parseBindingTarget();

        elements.push({ type: "rest", argument, start: restStart, end: argument.end });
        break;
      }

      let target = this.parseBindingTarget();

      if (this.match("=")) {
        this.advance();
        target = {
          type: "assignmentPattern",
          left: target,
          right: this.parseAssignment(true),
          start: target.start,
          end: this.lastEnd,
        };
      }

      elements.push(target);

      if (this.match(",")) {
        this.advance();
        continue;
      }

      break;
    }

    this.expect("]");

    return { type: "arrayPattern", elements, start, end: this.lastEnd };
  }

  private parseObjectPattern(): ObjectPattern {
    const { start } = this.current();

    this.expect("{");

    const props: {
      key: string | Expression;
      computed: boolean;
      value: Pattern | null;
      shorthand: boolean;
    }[] = [];
    let rest: RestPattern | null = null;

    while (!this.match("}")) {
      if (this.match("...")) {
        const restStart = this.current().start;

        this.advance();

        const argument = this.parseBindingTarget();

        rest = { type: "rest", argument, start: restStart, end: argument.end };
        break;
      }

      const { key, computed, shorthand: keyCanShorthand } = this.parsePropertyKey();
      let value: Pattern;
      let shorthand = false;

      if (this.match(":")) {
        this.advance();
        value = this.parseBindingTarget();
      } else {
        // only a bare identifier can be a shorthand binding (`{ 'a' }` / `{ 123 }` / `{ if }`
        // all require an explicit `: target`)
        // 只有裸标识符才能作为简写绑定（`{ 'a' }` / `{ 123 }` / `{ if }` 都必须显式写 `: target`）
        if (!keyCanShorthand || typeof key !== "string")
          throw this.error("Invalid shorthand property in destructuring pattern");

        value = { type: "identifier", name: key, start: this.lastEnd, end: this.lastEnd };
        shorthand = true;
      }

      if (this.match("=")) {
        this.advance();
        value = {
          type: "assignmentPattern",
          left: value,
          right: this.parseAssignment(true),
          start: value.start,
          end: this.lastEnd,
        };
      }

      props.push({ key, computed, value, shorthand });

      if (this.match(",")) {
        this.advance();
        continue;
      }

      break;
    }

    this.expect("}");

    return { type: "objectPattern", props, rest, start, end: this.lastEnd };
  }

  /**
   * Convert an expression parsed as a cover grammar into a destructuring pattern.
   *
   * 将按 cover 语法解析出的表达式转换为解构模式。
   *
   * @param node - The cover expression / cover 表达式
   * @param allowMember - Whether member expressions are valid targets / 成员表达式是否可作为目标
   * @returns The destructuring pattern / 解构模式
   */
  private toPattern(
    node: Expression | FunctionExpr | ArrowFunctionExpr | Pattern,
    allowMember = false,
  ): AssignmentTarget {
    switch (node.type) {
      case "identifier":
      case "objectPattern":
      case "arrayPattern":
      case "assignmentPattern":
      case "rest": {
        return node;
      }
      case "member": {
        // A member expression is a valid assignment target (e.g. `[a.b, c] = x`),
        // but not a valid binding target.
        // 成员表达式是合法的赋值目标（如 `[a.b, c] = x`），但不是合法的绑定目标。
        if (!allowMember) throw this.error("Invalid binding target");

        return node;
      }
      case "array": {
        return {
          type: "arrayPattern",
          elements: node.elements.map((element) => {
            if (element == null) return null;

            if (element.type === "spread") {
              return {
                type: "rest",
                argument: this.toPattern(element.argument, allowMember),
                start: element.start,
                end: element.end,
              };
            }

            return this.toPattern(element, allowMember);
          }),
          start: node.start,
          end: node.end,
        };
      }
      case "object": {
        let rest: RestPattern | null = null;
        const props: {
          key: string | Expression;
          computed: boolean;
          value: AssignmentTarget | null;
          shorthand: boolean;
        }[] = [];

        for (const prop of node.props) {
          if (prop.type === "spreadProperty") {
            rest = {
              type: "rest",
              argument: this.toPattern(prop.argument, allowMember),
              start: prop.start,
              end: prop.end,
            };
            continue;
          }

          props.push({
            key: prop.key,
            computed: prop.computed,
            value: this.toPattern(prop.value, allowMember),
            shorthand: prop.shorthand,
          });
        }

        return { type: "objectPattern", props, rest, start: node.start, end: node.end };
      }
      case "assignment": {
        if (node.op !== "=") throw this.error("Invalid destructuring target");

        return {
          type: "assignmentPattern",
          left: this.toPattern(node.target, allowMember),
          right: node.value,
          start: node.start,
          end: node.end,
        };
      }
      default: {
        throw this.error("Invalid destructuring target");
      }
    }
  }

  /**
   * Convert a `for...in`/`for...of` head expression into a valid assignment target.
   *
   * 将 `for...in`/`for...of` 头部表达式转换为合法赋值目标。
   *
   * @param init - Head expression / 头部表达式
   * @returns The assignment target / 赋值目标
   */
  private toAssignmentTarget(init: Expression): AssignmentTarget {
    if (init.type === "array" || init.type === "object") return this.toPattern(init, true);

    if (isValidAssignmentTarget(init)) return init;

    throw this.error("Invalid assignment target");
  }

  // ---------------------------------------------------------------------------
  // Expressions
  // ---------------------------------------------------------------------------

  private parseExpression(allowIn: boolean): Expression {
    const first = this.parseAssignment(allowIn);

    if (!this.match(",")) return first;

    const expressions: Expression[] = [first];

    while (this.match(",")) {
      this.advance();
      expressions.push(this.parseAssignment(allowIn));
    }

    return {
      type: "sequence",
      expressions,
      start: first.start,
      end: expressions[expressions.length - 1].end,
    };
  }

  /**
   * Parse an assignment expression, arrow function or conditional at the assignment level.
   *
   * 解析赋值层级的表达式（赋值、箭头函数或条件表达式）。
   *
   * @param allowIn - Whether the `in` operator is allowed / 是否允许 `in` 运算符
   * @returns The parsed expression / 解析出的表达式
   */
  private parseAssignment(allowIn: boolean): Expression {
    this.parseDepth += 1;

    if (this.parseDepth > this.maxParseDepth)
      throw this.error(`Maximum parse depth of ${this.maxParseDepth} exceeded`);

    try {
      return this.parseAssignmentInner(allowIn);
    } finally {
      this.parseDepth -= 1;
    }
  }

  private parseAssignmentInner(allowIn: boolean): Expression {
    const token = this.current();

    // single-parameter arrow: `x => ...`
    if (token.type === "identifier" && tokenValue(this.peek()) === "=>") {
      const param: Pattern = {
        type: "identifier",
        name: token.value,
        start: token.start,
        end: token.end,
      };

      this.advance();
      this.advance();

      const body = this.parseArrowBody(false, allowIn);

      return {
        type: "arrow",
        params: [param],
        body,
        isAsync: false,
        start: token.start,
        end: body.end,
      };
    }

    // async arrows: `async (params) => ...` / `async x => ...`
    if (
      token.type === "identifier" &&
      token.value === "async" &&
      !this.peek().newlineBefore &&
      (tokenValue(this.peek()) === "(" || this.peek().type === "identifier")
    ) {
      const snapshot = this.save();

      let arrow: ArrowFunctionExpr | null = null;

      // Count the speculative tokens so nested `async(` input cannot blow up exponentially
      // 统计试探期间的 token 消费，避免嵌套 `async(` 输入指数级放大
      this.speculationDepth += 1;

      try {
        this.advance();

        if (this.match("(")) {
          const cover = this.parseParenOrArrow(true);

          if (cover.kind === "arrow") {
            const { arrow: coverArrow } = cover;

            arrow = coverArrow;
          }
        } else {
          // the outer guard above only lets `(` or an identifier through
          const paramToken = this.advance();

          if (this.match("=>")) {
            this.advance();

            const param: Pattern = {
              type: "identifier",
              name: tokenValue(paramToken),
              start: paramToken.start,
              end: paramToken.end,
            };
            const body = this.parseArrowBody(true, allowIn);

            arrow = {
              type: "arrow",
              params: [param],
              body,
              isAsync: true,
              start: token.start,
              end: body.end,
            };
          }
        }
      } finally {
        this.speculationDepth -= 1;
      }

      if (arrow == null) {
        this.restore(snapshot);
      } else {
        if (!this.features.async) throw this.error("'async' is not supported");

        return { ...arrow, isAsync: true };
      }
    }

    const left = this.parseConditional(allowIn);

    if (isAssignmentOperator(this.current())) {
      const op = tokenValue(this.advance()) as AssignmentOperator;
      const right = this.parseAssignment(allowIn);
      let target: AssignmentTarget;

      if (left.type === "array" || left.type === "object") {
        if (op !== "=") throw this.error("Invalid assignment target");

        target = this.toPattern(left, true);
      } else if (isValidAssignmentTarget(left)) {
        target = left;
      } else {
        throw this.error("Invalid assignment target");
      }

      return { type: "assignment", op, target, value: right, start: left.start, end: right.end };
    }

    // a CoverInitializedName only survives as part of a converted destructuring pattern
    // CoverInitializedName 只有转换为解构模式时才合法
    if (left.type === "object") this.rejectCoverInitializedName(left);

    return left;
  }

  private parseConditional(allowIn: boolean): Expression {
    const test = this.parseBinaryOrHigher(allowIn);

    if (this.match("?")) {
      this.advance();

      const consequent = this.parseAssignment(true);

      this.expect(":");

      const alternate = this.parseAssignment(true);

      return {
        type: "conditional",
        test,
        consequent,
        alternate,
        start: test.start,
        end: alternate.end,
      };
    }

    return test;
  }

  /**
   * Parse the logical level (`&&`/`||`/`??`), rejecting mixes of `??` with `&&`/`||`.
   *
   * 解析逻辑层（`&&`/`||`/`??`），拒绝 `??` 与 `&&`/`||` 混用。
   *
   * @param allowIn - Whether the `in` operator is allowed / 是否允许 `in` 运算符
   * @returns The parsed expression / 解析出的表达式
   */
  private parseBinaryOrHigher(allowIn: boolean): Expression {
    let left = this.parseBitwiseOr(allowIn);
    let sawCoalesce = false;
    let sawAndOr = false;

    for (;;) {
      const token = this.current();
      let op: "&&" | "||" | "??" | null = null;

      if (token.type === "punct" && token.value === "??") op = "??";
      else if (token.type === "punct" && token.value === "&&") op = "&&";
      else if (token.type === "punct" && token.value === "||") op = "||";

      if (op == null) break;

      if (op === "??") {
        if (sawAndOr)
          throw this.error("Cannot mix '??' with '&&' or '||' without parentheses", token);
        sawCoalesce = true;
      } else {
        if (sawCoalesce)
          throw this.error("Cannot mix '??' with '&&' or '||' without parentheses", token);
        sawAndOr = true;
      }

      this.advance();

      const right = this.parseBitwiseOr(allowIn);

      left = { type: "logical", op, left, right, start: left.start, end: right.end };
    }

    return left;
  }

  private parseBitwiseOr(allowIn: boolean): Expression {
    return this.parseBinary(6, allowIn);
  }

  private parseBinary(minPrec: number, allowIn: boolean): Expression {
    let left = this.parseUnary();

    for (;;) {
      const token = this.current();
      const op = binaryOperatorOf(token);

      if (op == null) break;
      if (op === "in" && !allowIn) break;

      const prec = BINARY_PRECEDENCE[op];

      if (prec < minPrec) break;

      this.advance();

      const right = this.parseBinary(op === "**" ? prec : prec + 1, allowIn);

      left = { type: "binary", op, left, right, start: left.start, end: right.end };
    }

    return left;
  }

  private parseUnary(): Expression {
    // a `/` at an operand position always starts a regex literal; this also repairs tokens
    // prefetched by a preceding lookahead (e.g. `await /re/`, `for (x of /re/)`)
    // 操作数位置的 `/` 必为正则字面量；同时修复先前预读（如 `await /re/`、`for (x of /re/)`）得到的 token
    this.expectExpressionStart();

    const token = this.current();

    if (
      token.type === "punct" &&
      (token.value === "+" || token.value === "-" || token.value === "~" || token.value === "!")
    ) {
      this.advance();

      const argument = this.parseUnary();

      return { type: "unary", op: token.value, argument, start: token.start, end: argument.end };
    }

    if (token.type === "punct" && (token.value === "++" || token.value === "--")) {
      this.advance();

      const argument = this.parseUnary();

      return {
        type: "update",
        op: token.value,
        prefix: true,
        argument,
        start: token.start,
        end: argument.end,
      };
    }

    if (
      token.type === "keyword" &&
      (token.value === "delete" || token.value === "typeof" || token.value === "void")
    ) {
      this.advance();

      const argument = this.parseUnary();

      return { type: "unary", op: token.value, argument, start: token.start, end: argument.end };
    }

    if (token.type === "identifier" && token.value === "await") {
      if (!this.inAsyncFunction)
        throw this.error("'await' is only allowed within async functions", token);

      this.advance();

      const argument = this.parseUnary();

      return { type: "await", argument, start: token.start, end: argument.end };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    const node = this.parseLeftHandSide();
    const token = this.current();

    // restricted production: a line terminator before `++`/`--` means it starts a new statement
    // 受限产生式：`++`/`--` 前出现行终结符时，它开启新语句而非后缀自增
    if (
      !token.newlineBefore &&
      token.type === "punct" &&
      (token.value === "++" || token.value === "--")
    ) {
      const op = token.value;

      this.advance();

      return {
        type: "update",
        op,
        prefix: false,
        argument: node,
        start: node.start,
        end: token.end,
      };
    }

    return node;
  }

  private parseLeftHandSide(): Expression {
    const token = this.current();

    if (token.type === "keyword" && token.value === "new") return this.parseNewExpression(false);

    return this.parseMemberExpression(true);
  }

  /**
   * Parse a `new` expression.
   *
   * 解析 `new` 表达式。
   *
   * When `isCallee` is true (this expression is the callee of an outer `new`), a trailing `(...)`
   * belongs to the outer `new` and is not consumed as a call.
   *
   * 当 `isCallee` 为 true（本表达式作为外层 `new` 的 callee）时，紧随的 `(...)` 属于外层 `new`， 不会作为函数调用被消费。
   *
   * @param isCallee - Whether this is the callee of an outer `new` / 是否为外层 `new` 的 callee
   * @returns The parsed expression / 解析出的表达式
   */
  private parseNewExpression(isCallee: boolean): Expression {
    const { start } = this.current();

    this.advance();

    if (this.match(".")) throw this.error("new.target is not supported");

    const newToken = this.current();
    const callee =
      newToken.type === "keyword" && newToken.value === "new"
        ? this.parseNewExpression(true)
        : this.parseMemberExpression(false);
    let args: (Expression | SpreadExpr)[] = [];

    if (this.match("(")) args = this.parseArguments();

    const node: NewExpr = { type: "new", callee, args, start, end: this.lastEnd };

    return this.parseMemberTail(node, !isCallee);
  }

  private parseMemberExpression(allowCall: boolean): Expression {
    return this.parseMemberTail(this.parsePrimary(), allowCall);
  }

  private parseMemberTail(node: Expression, allowCall: boolean): Expression {
    let result = node;

    for (;;) {
      const token = this.current();

      if (token.type === "punct" && token.value === ".") {
        this.advance();

        const name = this.parsePropertyName();

        result = {
          type: "member",
          object: result,
          property: name,
          computed: false,
          optional: false,
          start: result.start,
          end: this.lastEnd,
        };
      } else if (token.type === "punct" && token.value === "[") {
        this.advance();

        const property = this.parseExpression(true);

        this.expect("]");

        result = {
          type: "member",
          object: result,
          property,
          computed: true,
          optional: false,
          start: result.start,
          end: this.lastEnd,
        };
      } else if (token.type === "punct" && token.value === "?.") {
        this.advance();

        const next = this.current();

        if (next.type === "punct" && next.value === "(") {
          const args = this.parseArguments();

          result = {
            type: "call",
            callee: result,
            args,
            optional: true,
            start: result.start,
            end: this.lastEnd,
          };
        } else if (next.type === "punct" && next.value === "[") {
          this.advance();

          const property = this.parseExpression(true);

          this.expect("]");

          result = {
            type: "member",
            object: result,
            property,
            computed: true,
            optional: true,
            start: result.start,
            end: this.lastEnd,
          };
        } else {
          const name = this.parsePropertyName();

          result = {
            type: "member",
            object: result,
            property: name,
            computed: false,
            optional: true,
            start: result.start,
            end: this.lastEnd,
          };
        }
      } else if (token.type === "punct" && token.value === "(" && allowCall) {
        const args = this.parseArguments();

        result = {
          type: "call",
          callee: result,
          args,
          optional: false,
          start: result.start,
          end: this.lastEnd,
        };
      } else if (
        token.type === "templateNoSubstitution" ||
        token.type === "templateHead" ||
        token.type === "templateMiddle" ||
        token.type === "templateTail"
      ) {
        throw this.error("Tagged templates are not supported", token);
      } else {
        break;
      }
    }

    return result;
  }

  private parsePropertyName(): string {
    const token = this.current();

    if (token.type === "identifier" || token.type === "keyword") {
      this.advance();

      return token.value;
    }

    throw this.error("Expected a property name after '.' or '?.'", token);
  }

  private parseArguments(): (Expression | SpreadExpr)[] {
    this.expect("(");

    const args: (Expression | SpreadExpr)[] = [];

    if (this.match(")")) {
      this.advance();

      return args;
    }

    for (;;) {
      if (this.match("...")) {
        const spreadStart = this.current().start;

        this.advance();

        const argument = this.parseAssignment(true);

        args.push({ type: "spread", argument, start: spreadStart, end: argument.end });
      } else {
        args.push(this.parseAssignment(true));
      }

      if (this.match(",")) {
        this.advance();

        if (this.match(")")) break;

        continue;
      }

      break;
    }

    this.expect(")");

    return args;
  }

  private parsePrimary(): Expression {
    const token = this.current();

    switch (token.type) {
      case "number": {
        if (this.strict && token.legacyOctal)
          throw this.error("Octal literals are not allowed in strict mode", token);

        this.advance();

        return {
          type: "literal",
          value: token.numericValue ?? Number(token.value),
          start: token.start,
          end: token.end,
        };
      }
      case "bigint": {
        if (!this.features.bigint) throw this.error("BigInt literals are not supported", token);

        this.advance();

        return { type: "literal", value: BigInt(token.value), start: token.start, end: token.end };
      }
      case "string": {
        if (this.strict && token.legacyOctal)
          throw this.error("Octal escape sequences are not allowed in strict mode", token);

        this.advance();

        return { type: "literal", value: token.cooked, start: token.start, end: token.end };
      }
      case "regexp": {
        this.advance();

        return {
          type: "regexp",
          pattern: token.pattern,
          flags: token.flags,
          start: token.start,
          end: token.end,
        };
      }
      case "templateNoSubstitution": {
        this.advance();

        return {
          type: "template",
          quasis: [{ raw: token.value, cooked: token.cooked }],
          expressions: [],
          start: token.start,
          end: token.end,
        };
      }
      case "templateHead": {
        return this.parseTemplate();
      }
      case "identifier": {
        if (
          token.value === "async" &&
          !this.peek().newlineBefore &&
          this.peek().type === "keyword" &&
          tokenValue(this.peek()) === "function"
        )
          return this.parseFunctionExpression(true);

        this.advance();

        return { type: "identifier", name: token.value, start: token.start, end: token.end };
      }
      case "keyword": {
        switch (token.value) {
          case "this": {
            this.advance();

            return { type: "this", start: token.start, end: token.end };
          }
          case "super": {
            this.advance();

            return { type: "super", start: token.start, end: token.end };
          }
          case "true": {
            this.advance();

            return { type: "literal", value: true, start: token.start, end: token.end };
          }
          case "false": {
            this.advance();

            return { type: "literal", value: false, start: token.start, end: token.end };
          }
          case "null": {
            this.advance();

            return { type: "literal", value: null, start: token.start, end: token.end };
          }
          case "function": {
            return this.parseFunctionExpression(false);
          }
          case "class": {
            return this.parseClassExpression();
          }
          case "yield": {
            throw this.error("Generator functions are not supported", token);
          }
          default: {
            throw this.error(`Unexpected token ${describeToken(token)}`, token);
          }
        }
      }
      case "punct": {
        if (token.value === "(") {
          const cover = this.parseParenOrArrow();

          return cover.kind === "arrow" ? cover.arrow : cover.expr;
        }
        if (token.value === "[") return this.parseArrayLiteral();
        if (token.value === "{") return this.parseObjectLiteral();

        throw this.error(`Unexpected token ${describeToken(token)}`, token);
      }
      case "eof": {
        throw this.error("Unexpected end of input", token);
      }
      /* istanbul ignore next -- template middle/tail tokens are only consumed inside parseTemplate */
      default: {
        throw this.error(`Unexpected token ${describeToken(token)}`, token);
      }
    }
  }

  private parseFunctionExpression(isAsync: boolean): FunctionExpr {
    if (isAsync) {
      if (!this.features.async) throw this.error("'async' is not supported");
      this.advance();
    }

    const { start } = this.current();

    this.expect("function");

    if (this.match("*")) throw this.error("Generator functions are not supported");

    let name: string | null = null;
    const nameToken = this.current();

    if (nameToken.type === "identifier" || nameToken.type === "keyword") {
      this.advance();
      name = nameToken.value;
    }

    const params = this.parseParams();
    const body = this.parseFunctionBody(isAsync);

    return { type: "functionExpr", name, params, body, isAsync, start, end: this.lastEnd };
  }

  private parseClassExpression(): Expression {
    if (!this.features.class) throw this.error("'class' is not supported");

    const { start } = this.current();

    this.expect("class");

    let name: string | null = null;
    const nameToken = this.current();

    if (nameToken.type === "identifier") {
      this.advance();
      name = nameToken.value;
    }

    const { superClass, body } = this.parseClassTail();

    return { type: "classExpr", name, superClass, body, start, end: this.lastEnd };
  }

  /**
   * Parse an array literal, handling elisions (`null`) and spread elements.
   *
   * 解析数组字面量，处理空位（`null`）与展开元素。
   *
   * @param allowIn - Whether the `in` operator is allowed / 是否允许 `in` 运算符
   * @returns The parsed array literal / 解析出的数组字面量
   */
  private parseArrayLiteral(): ArrayExpr {
    const { start } = this.current();

    this.expect("[");

    const elements: (Expression | SpreadExpr | null)[] = [];

    while (!this.match("]")) {
      if (this.match(",")) {
        this.advance();
        elements.push(null);
        continue;
      }

      if (this.match("...")) {
        const spreadStart = this.current().start;

        this.advance();

        const argument = this.parseAssignment(true);

        elements.push({ type: "spread", argument, start: spreadStart, end: argument.end });
      } else {
        elements.push(this.parseAssignment(true));
      }

      if (this.match(",")) {
        this.advance();
        continue;
      }

      break;
    }

    this.expect("]");

    return { type: "array", elements, start, end: this.lastEnd };
  }

  /**
   * Parse an object literal, handling shorthand/computed keys, methods, getters/setters and spread.
   *
   * 解析对象字面量，处理简写/计算键、方法、getter/setter 与展开。
   *
   * @param allowIn - Whether the `in` operator is allowed / 是否允许 `in` 运算符
   * @returns The parsed object literal / 解析出的对象字面量
   */
  private parseObjectLiteral(): ObjectExpr {
    const { start } = this.current();

    this.expect("{");

    const props: (ObjectProperty | SpreadProperty)[] = [];

    while (!this.match("}")) {
      if (this.match("...")) {
        const spreadStart = this.current().start;

        this.advance();

        const argument = this.parseAssignment(true);

        props.push({ type: "spreadProperty", argument, start: spreadStart, end: argument.end });
      } else {
        props.push(this.parseObjectProperty());
      }

      if (this.match(",")) {
        this.advance();
        continue;
      }

      break;
    }

    this.expect("}");

    return { type: "object", props, start, end: this.lastEnd };
  }

  /**
   * Parse a single object literal property.
   *
   * 解析单个对象字面量属性。
   *
   * @param allowIn - Whether the `in` operator is allowed / 是否允许 `in` 运算符
   * @returns The parsed property / 解析出的属性
   */
  private parseObjectProperty(): ObjectProperty {
    const { start } = this.current();
    const token = this.current();

    // getter/setter: `get`/`set` followed by a property name or `[`
    if (
      token.type === "identifier" &&
      (token.value === "get" || token.value === "set") &&
      (isPropertyNameToken(this.peek()) || tokenValue(this.peek()) === "[")
    ) {
      const kind = token.value === "get" ? "get" : "set";

      this.advance();

      const { key, computed } = this.parsePropertyKey();
      const params = this.parseParams();
      const body = this.parseFunctionBody(false);
      const value: FunctionExpr = {
        type: "functionExpr",
        name: null,
        params,
        body,
        isAsync: false,
        start,
        end: body.end,
      };

      return {
        type: "property",
        kind,
        key,
        computed,
        value,
        shorthand: false,
        method: true,
        start,
        end: body.end,
      };
    }

    // async method: `async foo() {}` / `async [key]() {}`
    if (
      token.type === "identifier" &&
      token.value === "async" &&
      !this.peek().newlineBefore &&
      (isPropertyNameToken(this.peek()) || tokenValue(this.peek()) === "[") &&
      tokenValue(this.peek()) !== ":" &&
      tokenValue(this.peek()) !== "," &&
      tokenValue(this.peek()) !== "}"
    ) {
      if (!this.features.async) throw this.error("'async' is not supported");

      this.advance();

      const { key, computed } = this.parsePropertyKey();

      if (!this.match("(")) throw this.error("Expected '(' after async method name");

      const params = this.parseParams();
      const body = this.parseFunctionBody(true);
      const value: FunctionExpr = {
        type: "functionExpr",
        name: null,
        params,
        body,
        isAsync: true,
        start,
        end: body.end,
      };

      return {
        type: "property",
        kind: "init",
        key,
        computed,
        value,
        shorthand: false,
        method: true,
        start,
        end: body.end,
      };
    }

    const { key, computed, shorthand: keyCanShorthand } = this.parsePropertyKey();

    if (this.match(":")) {
      this.advance();

      const value = this.parseAssignment(true);

      return {
        type: "property",
        kind: "init",
        key,
        computed,
        value,
        shorthand: false,
        method: false,
        start,
        end: value.end,
      };
    }

    if (this.match("(")) {
      const params = this.parseParams();
      const body = this.parseFunctionBody(false);
      const value: FunctionExpr = {
        type: "functionExpr",
        name: null,
        params,
        body,
        isAsync: false,
        start,
        end: body.end,
      };

      return {
        type: "property",
        kind: "init",
        key,
        computed,
        value,
        shorthand: false,
        method: true,
        start,
        end: body.end,
      };
    }

    // shorthand: `{ a }` or `{ a = 1 }` (default value in cover grammar)
    if (keyCanShorthand && typeof key === "string") {
      let value: Expression | FunctionExpr | ArrowFunctionExpr = {
        type: "identifier",
        name: key,
        start,
        end: this.lastEnd,
      };

      if (this.match("=")) {
        this.advance();

        value = {
          type: "assignment",
          op: "=",
          target: value,
          value: this.parseAssignment(true),
          start,
          end: this.lastEnd,
        };
      }

      return {
        type: "property",
        kind: "init",
        key,
        computed: false,
        value,
        shorthand: true,
        method: false,
        start,
        end: this.lastEnd,
      };
    }

    throw this.error("Expected ':' or '(' after property key");
  }

  /**
   * Parse a property key (computed `[...]` or a plain name).
   *
   * 解析属性键（计算 `[...]` 或普通名称）。
   *
   * @returns The key, whether it is computed, and whether it can be used as a shorthand property (a
   *   bare `IdentifierReference`) / 键、是否计算、以及能否作为简写属性（裸 `IdentifierReference`）
   */
  private parsePropertyKey(): {
    key: Expression | string;
    computed: boolean;
    shorthand: boolean;
  } {
    const token = this.current();

    if (this.match("[")) {
      this.advance();

      const key = this.parseExpression(true);

      this.expect("]");

      return { key, computed: true, shorthand: false };
    }

    if (isPropertyNameToken(token)) {
      this.advance();

      const name = tokenValue(token);
      // `let`/`static`/`yield` are only reserved in strict mode, so they stay valid shorthands in
      // sloppy mode. Any other keyword, string, number or BigInt key needs an explicit `:`.
      // `let`/`static`/`yield` 仅在严格模式下是保留字，sloppy 模式下仍可作为简写属性；
      // 其余关键字、字符串、数字或 BigInt 键必须显式写 `:`。
      const contextual = !this.strict && (name === "let" || name === "static" || name === "yield");

      return {
        key: name,
        computed: false,
        shorthand: token.type === "identifier" || contextual,
      };
    }

    throw this.error("Expected a property name", token);
  }

  /**
   * Parse a template literal (parser-driven, in cooperation with the lexer).
   *
   * 解析模板字符串（由解析器驱动，与词法分析器配合）。
   *
   * @returns The parsed template expression / 解析出的模板表达式
   */
  private parseTemplate(): TemplateExpr {
    const { start } = this.current();
    const quasis: TemplateQuasi[] = [];
    const expressions: Expression[] = [];

    for (;;) {
      const token = this.current();

      /* istanbul ignore else -- parseTemplate is entered on a `templateHead` and only continues on middles */
      if (token.type === "templateHead" || token.type === "templateMiddle") {
        this.advance();
        quasis.push({ raw: token.value, cooked: token.cooked });

        if (this.match("}")) throw this.error("Empty template substitution", this.current());

        expressions.push(this.parseExpression(true));
        this.expect("}");

        const next = this.resumeTemplate();

        if (next.type === "templateTail") {
          quasis.push({ raw: next.value, cooked: next.cooked });
          this.advance();
          break;
        }

        continue;
      } else {
        throw this.error("Unexpected token in template literal", token);
      }
    }

    return { type: "template", quasis, expressions, start, end: this.lastEnd };
  }

  /**
   * Parse an arrow function body (block or expression).
   *
   * 解析箭头函数体（块或表达式）。
   *
   * @param isAsync - Whether the arrow is async / 箭头函数是否 async
   * @param allowIn - Whether the `in` operator is allowed / 是否允许 `in` 运算符
   * @returns The parsed body / 解析出的函数体
   */
  private parseArrowBody(isAsync: boolean, allowIn: boolean): Expression | BlockStatement {
    // a non-async arrow inherits the enclosing async context, so `await` stays legal
    // 非 async 箭头继承外层 async 上下文，因此 `await` 仍然合法
    const isAsyncContext = this.inAsyncFunction || isAsync;
    // an arrow body is always an expression (or a block), never a destructuring pattern, so a
    // CoverInitializedName inside it is an immediate early error even while the parameters are
    // still being parsed as a cover grammar
    // 箭头函数体始终是表达式（或块），绝不可能是解构模式；因此即使参数仍按 cover 语法解析，
    // 函数体内的 CoverInitializedName 也应立即报错
    const savedCover = this.pendingCoverInitialized;

    this.pendingCoverInitialized = null;

    try {
      return this.parseWithFunctionContext(isAsyncContext, () => {
        if (this.match("{")) return this.parseBlock();

        return this.parseAssignment(allowIn);
      });
    } finally {
      this.pendingCoverInitialized = savedCover;
    }
  }

  /**
   * Parse a parenthesized expression or an arrow function (`(...)` cover grammar).
   *
   * 解析带括号的表达式或箭头函数（`(...)` cover 语法）。
   *
   * @param isAsync - Whether the arrow is async / 箭头函数是否 async
   * @returns The parsed paren expression or arrow / 解析出的括号表达式或箭头函数
   */
  private parseParenOrArrow(
    isAsync = false,
  ): { kind: "paren"; expr: Expression } | { kind: "arrow"; arrow: ArrowFunctionExpr } {
    const { start } = this.current();
    const outerCover = this.pendingCoverInitialized;
    const coverMarkers: { start: number; end: number }[] = [];

    this.pendingCoverInitialized = coverMarkers;

    try {
      this.expect("(");

      const items: ({ kind: "rest"; arg: Pattern } | { kind: "expr"; expr: Expression })[] = [];
      let sawTrailingComma = false;

      if (this.match(")")) {
        this.advance();

        if (this.match("=>")) {
          this.advance();

          const body = this.parseArrowBody(isAsync, true);

          return {
            kind: "arrow",
            arrow: { type: "arrow", params: [], body, isAsync: false, start, end: body.end },
          };
        }

        throw this.error("Unexpected token ')'");
      }

      for (;;) {
        if (this.match("...")) {
          this.advance();
          items.push({ kind: "rest", arg: this.parseBindingTarget() });
        } else {
          items.push({ kind: "expr", expr: this.parseAssignment(true) });
        }

        if (this.match(",")) {
          this.advance();

          if (this.match(")")) {
            sawTrailingComma = true;
            break;
          }

          continue;
        }

        break;
      }

      this.expect(")");

      if (this.match("=>")) {
        this.advance();

        const body = this.parseArrowBody(isAsync, true);
        const params: Pattern[] = items.map((item) =>
          item.kind === "rest"
            ? { type: "rest", argument: item.arg, start: item.arg.start, end: item.arg.end }
            : (this.toPattern(item.expr) as Pattern),
        );

        return {
          kind: "arrow",
          arrow: { type: "arrow", params, body, isAsync: false, start, end: body.end },
        };
      }

      if (items.some((item) => item.kind === "rest"))
        throw this.error("'...' can only be used in arrow function parameters");

      // a trailing comma is only valid in arrow parameter lists, not in a plain
      // parenthesized expression (e.g. `(a,)` is a SyntaxError)
      // 尾逗号只允许出现在箭头函数参数列表中，普通括号表达式（如 `(a,)`）是语法错误
      if (sawTrailingComma) throw this.error("Unexpected token ')'");

      // the cover grammar was not resolved into an arrow parameter list, so any buffered
      // CoverInitializedName is an early error after all
      // cover 语法未转换为箭头参数列表，缓存的 CoverInitializedName 属于早期错误
      const [coverMarker] = coverMarkers;

      /* istanbul ignore else -- every buffered marker is pushed by rejectCoverInitializedName */
      if (coverMarker != null) {
        throw new ParseError(
          "Invalid shorthand property initializer",
          this.source,
          coverMarker.start,
          coverMarker.end,
        );
      }

      const expressions: Expression[] = [];

      for (const item of items)
        /* istanbul ignore else -- rest items were rejected above, so every remaining item is an expression */
        if (item.kind === "expr") expressions.push(item.expr);

      if (expressions.length === 1) return { kind: "paren", expr: expressions[0] };

      return {
        kind: "paren",
        expr: {
          type: "sequence",
          expressions,
          start: expressions[0].start,
          end: expressions[expressions.length - 1].end,
        },
      };
    } finally {
      this.pendingCoverInitialized = outerCover;
    }
  }
}

/**
 * Parse source code into an AST program.
 *
 * 将源码解析为 AST program。
 *
 * @param source - Source code / 源码
 * @param features - Feature toggles (all default to `true`) / 特性开关（默认全开）
 * @param limits - Parser budgets / 解析器预算
 * @returns The parsed program / 解析出的 program
 */
export const parse = (
  source: string,
  features: FeatureOptions = DEFAULT_FEATURES,
  limits: ParserLimits = {},
): Program => new Parser(source, features, limits).parseProgram();

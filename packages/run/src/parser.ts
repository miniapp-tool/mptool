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
const tokenValue = (token: Token): string => ("value" in token ? token.value : "");

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

  /**
   * @param source - Source code to parse / 待解析的源码
   * @param features - Feature toggles / 特性开关
   */
  constructor(
    private readonly source: string,
    features?: Partial<FeatureOptions>,
  ) {
    this.lexer = new Lexer(source);
    this.features = { ...DEFAULT_FEATURES, ...features };
  }

  /**
   * Parse the whole source into a program.
   *
   * 将整个源码解析为 program。
   *
   * @returns The parsed program / 解析出的 program
   */
  parseProgram(): Program {
    const { start } = this.current();
    const body: Statement[] = [];

    while (this.current().type !== "eof") body.push(this.parseStatement());

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

  // ---------------------------------------------------------------------------
  // Statements
  // ---------------------------------------------------------------------------

  private parseStatement(): Statement {
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

    while (!this.match("}")) {
      if (this.current().type === "eof") throw this.error("Unexpected end of input, expected '}'");

      body.push(this.parseStatement());
    }

    this.expect("}");

    return { type: "block", body, start, end: this.lastEnd };
  }

  private parseVariableStatement(): VariableDeclaration {
    const kindToken = this.advance();
    const declarations = [this.parseVariableDeclarator(true)];

    while (this.match(",")) {
      this.advance();
      declarations.push(this.parseVariableDeclarator(true));
    }

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

    const body = this.parseStatement();

    return { type: "while", test, body, start, end: this.lastEnd };
  }

  private parseDoWhileStatement(): Statement {
    const { start } = this.current();

    this.expect("do");

    const body = this.parseStatement();

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

      const body = this.parseStatement();

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

        const right = this.parseExpression(true);

        this.expect(")");

        const body = this.parseStatement();

        return { type: "forIn", left: declaration, right, body, start, end: this.lastEnd };
      }

      if (this.matchIdentifier("of")) {
        if (!this.features.forOf) throw this.error("for...of is not supported", this.current());

        this.advance();

        const right = this.parseAssignment(true);

        this.expect(")");

        const body = this.parseStatement();

        return { type: "forOf", left: declaration, right, body, start, end: this.lastEnd };
      }

      this.expect(";");

      const test = this.match(";") ? null : this.parseExpression(true);

      this.expect(";");

      const update = this.match(")") ? null : this.parseExpression(true);

      this.expect(")");

      const body = this.parseStatement();

      return { type: "for", init: declaration, test, update, body, start, end: this.lastEnd };
    }

    const init = this.parseExpression(false);

    if (this.match("in")) {
      this.advance();

      const right = this.parseExpression(true);

      this.expect(")");

      const body = this.parseStatement();
      const left: AssignmentTarget | VariableDeclaration = this.toAssignmentTarget(init);

      return { type: "forIn", left, right, body, start, end: this.lastEnd };
    }

    if (this.matchIdentifier("of")) {
      if (!this.features.forOf) throw this.error("for...of is not supported", this.current());

      this.advance();

      const right = this.parseAssignment(true);

      this.expect(")");

      const body = this.parseStatement();
      const left: AssignmentTarget | VariableDeclaration = this.toAssignmentTarget(init);

      return { type: "forOf", left, right, body, start, end: this.lastEnd };
    }

    this.expect(";");

    const test = this.match(";") ? null : this.parseExpression(true);

    this.expect(";");

    const update = this.match(")") ? null : this.parseExpression(true);

    this.expect(")");

    const body = this.parseStatement();

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

      while (!this.match("case") && !this.match("default") && !this.match("}")) {
        if (this.current().type === "eof") throw this.error("Unexpected end of input");
        body.push(this.parseStatement());
      }

      cases.push({ test, body });
    }

    this.expect("}");

    return { type: "switch", discriminant, cases, start, end: this.lastEnd };
  }

  private parseTryStatement(): Statement {
    const { start } = this.current();

    this.expect("try");

    const block = this.parseBlock();
    let handler: { param: Pattern | null; body: BlockStatement } | null = null;
    let finalizer: BlockStatement | null = null;

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

    const argument = this.parseExpression(true);

    if (this.match(";")) this.advance();

    return { type: "throw", argument, start, end: this.lastEnd };
  }

  private parseReturnStatement(): Statement {
    const { start } = this.current();

    this.advance();

    let argument: Expression | null = null;

    if (!this.match(";") && !this.match("}") && this.current().type !== "eof")
      argument = this.parseExpression(true);

    if (this.match(";")) this.advance();

    return { type: "return", argument, start, end: this.lastEnd };
  }

  private parseBreakContinue(isContinue: boolean): Statement {
    const { start } = this.current();

    this.advance();

    let label: string | null = null;

    if (this.current().type === "identifier") label = tokenValue(this.advance());

    if (this.match(";")) this.advance();

    if (isContinue) return { type: "continue", label, start, end: this.lastEnd };

    return { type: "break", label, start, end: this.lastEnd };
  }

  private parseLabeledStatement(): Statement {
    const labelToken = this.advance();

    this.expect(":");

    const body = this.parseStatement();

    return {
      type: "labeled",
      label: tokenValue(labelToken),
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

    if (token.type === "identifier" || token.type === "keyword") {
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

      return params;
    }

    if (this.match("...")) {
      const restStart = this.current().start;

      this.advance();

      const argument = this.parseBindingTarget();

      params.push({ type: "rest", argument, start: restStart, end: argument.end });
      this.expect(")");

      return params;
    }

    for (;;) {
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

    return params;
  }

  private parseFunctionBody(isAsync: boolean): BlockStatement {
    const saved = this.inAsyncFunction;

    this.inAsyncFunction = isAsync;

    try {
      return this.parseBlock();
    } finally {
      this.inAsyncFunction = saved;
    }
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

    while (!this.match("}")) {
      if (this.match(";")) {
        this.advance();
        continue;
      }

      if (this.current().type === "eof") throw this.error("Unexpected end of input");

      methods.push(this.parseClassMethod());
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

    if (asyncToken.type === "identifier" && asyncToken.value === "async") {
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

      const { key, computed } = this.parsePropertyKey();
      let value: Pattern;
      let shorthand = false;

      if (this.match(":")) {
        this.advance();
        value = this.parseBindingTarget();
      } else {
        if (computed || typeof key !== "string")
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
      (tokenValue(this.peek()) === "(" || this.peek().type === "identifier")
    ) {
      const snapshot = this.save();

      this.advance();

      let arrow: ArrowFunctionExpr | null = null;

      if (this.match("(")) {
        const cover = this.parseParenOrArrow(true);

        if (cover.kind === "arrow") {
          const { arrow: coverArrow } = cover;

          arrow = coverArrow;
        }
      } else if (this.current().type === "identifier") {
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

    if (token.type === "punct" && (token.value === "++" || token.value === "--")) {
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
        this.advance();

        return { type: "literal", value: Number(token.value), start: token.start, end: token.end };
      }
      case "bigint": {
        if (!this.features.bigint) throw this.error("BigInt literals are not supported", token);

        this.advance();

        return { type: "literal", value: BigInt(token.value), start: token.start, end: token.end };
      }
      case "string": {
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
      case "templateMiddle":
      case "templateTail": {
        throw this.error(`Unexpected token ${describeToken(token)}`, token);
      }
      case "eof": {
        throw this.error("Unexpected end of input", token);
      }
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
        start,
        end: body.end,
      };
    }

    // async method: `async foo() {}` / `async [key]() {}`
    if (
      token.type === "identifier" &&
      token.value === "async" &&
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
        start,
        end: body.end,
      };
    }

    const { key, computed } = this.parsePropertyKey();

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
        start,
        end: body.end,
      };
    }

    // shorthand: `{ a }` or `{ a = 1 }` (default value in cover grammar)
    if (!computed && typeof key === "string") {
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
   * @returns The key and whether it is computed / 键与是否计算
   */
  private parsePropertyKey(): { key: Expression | string; computed: boolean } {
    const token = this.current();

    if (this.match("[")) {
      this.advance();

      const key = this.parseExpression(true);

      this.expect("]");

      return { key, computed: true };
    }

    if (isPropertyNameToken(token)) {
      this.advance();

      return { key: tokenValue(token), computed: false };
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

      if (token.type === "templateNoSubstitution") {
        this.advance();
        quasis.push({ raw: token.value, cooked: token.cooked });
        break;
      }

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
      }

      throw this.error("Unexpected token in template literal", token);
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
    const saved = this.inAsyncFunction;

    this.inAsyncFunction = isAsync;

    try {
      if (this.match("{")) return this.parseBlock();

      return this.parseAssignment(allowIn);
    } finally {
      this.inAsyncFunction = saved;
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

    this.expect("(");

    const items: ({ kind: "rest"; arg: Pattern } | { kind: "expr"; expr: Expression })[] = [];

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

        if (this.match(")")) break;

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

    const expressions: Expression[] = [];

    for (const item of items) if (item.kind === "expr") expressions.push(item.expr);

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
  }
}

/**
 * Parse source code into an AST program.
 *
 * 将源码解析为 AST program。
 *
 * @param source - Source code / 源码
 * @param features - Feature toggles (all default to `true`) / 特性开关（默认全开）
 * @returns The parsed program / 解析出的 program
 */
export const parse = (source: string, features: FeatureOptions = DEFAULT_FEATURES): Program =>
  new Parser(source, features).parseProgram();

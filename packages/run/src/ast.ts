/**
 * Abstract Syntax Tree (AST) node definitions for `@mptool/run`.
 *
 * `@mptool/run` 的抽象语法树（AST）节点定义。
 *
 * All nodes are discriminated unions keyed on the `type` field. Every node also carries `start` /
 * `end` source offsets so the interpreter can report positions when errors occur.
 *
 * 所有节点均为以 `type` 字段区分的联合类型；每个节点还携带 `start`/`end` 源码偏移，便于解释器在报错时给出位置。
 */

/** Binary operator strings / 二元运算符字符串 */
export type BinaryOperator =
  | "=="
  | "!="
  | "==="
  | "!=="
  | "<"
  | ">"
  | "<="
  | ">="
  | "<<"
  | ">>"
  | ">>>"
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "**"
  | "|"
  | "^"
  | "&"
  | "in"
  | "instanceof";

/** Assignment operator strings / 赋值运算符字符串 */
export type AssignmentOperator =
  | "="
  | "+="
  | "-="
  | "*="
  | "/="
  | "%="
  | "**="
  | "<<="
  | ">>="
  | ">>>="
  | "&="
  | "|="
  | "^="
  | "&&="
  | "||="
  | "??=";

/** Unary operator strings / 一元运算符字符串 */
export type UnaryOperator = "delete" | "typeof" | "void" | "+" | "-" | "~" | "!";

/** Logical operator strings / 逻辑运算符字符串 */
export type LogicalOperator = "&&" | "||" | "??";

/** Object property kinds / 对象属性类型 */
export type ObjectPropertyKind = "init" | "get" | "set";

/** Class method kinds / 类方法类型 */
export type ClassMethodKind =
  | "constructor"
  | "method"
  | "get"
  | "set"
  | "static"
  | "staticGet"
  | "staticSet";

/** A literal value / 字面量值 */
export type LiteralValue = string | number | bigint | boolean | null;

/** A template quasi (raw and cooked text) / 模板准文本（raw 与 cooked） */
export interface TemplateQuasi {
  raw: string;
  cooked: string;
}

/** Literal expression (number/string/bigint/boolean/null) / 字面量表达式 */
export interface LiteralExpr {
  type: "literal";
  value: LiteralValue;
  start: number;
  end: number;
}

/** Regular expression literal / 正则字面量 */
export interface RegexpExpr {
  type: "regexp";
  pattern: string;
  flags: string;
  start: number;
  end: number;
}

/**
 * Identifier expression — also used as the identifier pattern.
 *
 * 标识符表达式 —— 同时作为标识符解构模式使用。
 */
export interface IdentifierExpr {
  type: "identifier";
  name: string;
  start: number;
  end: number;
}

/** `this` expression / `this` 表达式 */
export interface ThisExpr {
  type: "this";
  start: number;
  end: number;
}

/** `super` expression (only inside class methods as `super.x` / `super()`) / `super` 表达式 */
export interface SuperExpr {
  type: "super";
  start: number;
  end: number;
}

/**
 * Array literal. `null` elements are elisions (holes).
 *
 * 数组字面量。`null` 元素表示空位（elision）。
 */
export interface ArrayExpr {
  type: "array";
  elements: (Expression | SpreadExpr | null)[];
  start: number;
  end: number;
}

/** Object literal / 对象字面量 */
export interface ObjectExpr {
  type: "object";
  props: (ObjectProperty | SpreadProperty)[];
  start: number;
  end: number;
}

/** Object literal property (init/get/set) / 对象字面量属性 */
export interface ObjectProperty {
  type: "property";
  kind: ObjectPropertyKind;
  key: Expression | string;
  computed: boolean;
  value: Expression | FunctionExpr | ArrowFunctionExpr;
  shorthand: boolean;
  /** Whether this is a method shorthand (`m() {}`), which is not constructable / 是否为方法简写（不可构造） */
  method: boolean;
  start: number;
  end: number;
}

/** Object literal spread property (`...obj`) / 对象字面量展开属性 */
export interface SpreadProperty {
  type: "spreadProperty";
  argument: Expression;
  start: number;
  end: number;
}

/** Member access (`.` / `[]` / `?.`) / 成员访问 */
export interface MemberExpr {
  type: "member";
  object: Expression;
  property: Expression | string;
  computed: boolean;
  optional: boolean;
  start: number;
  end: number;
}

/** Function call / 函数调用 */
export interface CallExpr {
  type: "call";
  callee: Expression;
  args: (Expression | SpreadExpr)[];
  optional: boolean;
  start: number;
  end: number;
}

/** `new` expression / `new` 表达式 */
export interface NewExpr {
  type: "new";
  callee: Expression;
  args: (Expression | SpreadExpr)[];
  start: number;
  end: number;
}

/** Unary expression / 一元表达式 */
export interface UnaryExpr {
  type: "unary";
  op: UnaryOperator;
  argument: Expression;
  start: number;
  end: number;
}

/** Update expression (`++` / `--`) / 更新表达式 */
export interface UpdateExpr {
  type: "update";
  op: "++" | "--";
  prefix: boolean;
  argument: Expression;
  start: number;
  end: number;
}

/** Binary expression / 二元表达式 */
export interface BinaryExpr {
  type: "binary";
  op: BinaryOperator;
  left: Expression;
  right: Expression;
  start: number;
  end: number;
}

/** Logical expression (`&&` / `||` / `??`) / 逻辑表达式 */
export interface LogicalExpr {
  type: "logical";
  op: LogicalOperator;
  left: Expression;
  right: Expression;
  start: number;
  end: number;
}

/** Conditional (ternary) expression / 三元条件表达式 */
export interface ConditionalExpr {
  type: "conditional";
  test: Expression;
  consequent: Expression;
  alternate: Expression;
  start: number;
  end: number;
}

/** Assignment expression / 赋值表达式 */
export interface AssignmentExpr {
  type: "assignment";
  op: AssignmentOperator;
  target: AssignmentTarget;
  value: Expression;
  start: number;
  end: number;
}

/** Sequence (comma) expression / 逗号序列表达式 */
export interface SequenceExpr {
  type: "sequence";
  expressions: Expression[];
  start: number;
  end: number;
}

/** Arrow function / 箭头函数 */
export interface ArrowFunctionExpr {
  type: "arrow";
  params: Pattern[];
  body: Expression | BlockStatement;
  isAsync: boolean;
  start: number;
  end: number;
}

/** Function expression / 函数表达式 */
export interface FunctionExpr {
  type: "functionExpr";
  name: string | null;
  params: Pattern[];
  body: BlockStatement;
  isAsync: boolean;
  start: number;
  end: number;
}

/** Class expression / 类表达式 */
export interface ClassExpr {
  type: "classExpr";
  name: string | null;
  superClass: Expression | null;
  body: ClassBody;
  start: number;
  end: number;
}

/** Template literal (untagged) / 模板字符串（无标签） */
export interface TemplateExpr {
  type: "template";
  quasis: TemplateQuasi[];
  expressions: Expression[];
  start: number;
  end: number;
}

/** `await` expression / `await` 表达式 */
export interface AwaitExpr {
  type: "await";
  argument: Expression;
  start: number;
  end: number;
}

/** Spread expression (`...x` in calls/arrays) / 展开表达式（调用/数组内） */
export interface SpreadExpr {
  type: "spread";
  argument: Expression;
  start: number;
  end: number;
}

/** Object destructuring pattern / 对象解构模式 */
export interface ObjectPattern {
  type: "objectPattern";
  props: {
    key: string | Expression;
    computed: boolean;
    value: AssignmentTarget | null;
    shorthand: boolean;
  }[];
  rest: RestPattern | null;
  start: number;
  end: number;
}

/**
 * Array destructuring pattern. `null` elements are elisions.
 *
 * 数组解构模式。`null` 元素表示空位。
 */
export interface ArrayPattern {
  type: "arrayPattern";
  elements: (AssignmentTarget | null | RestPattern)[];
  start: number;
  end: number;
}

/** Assignment (default value) pattern / 默认值模式 */
export interface AssignmentPattern {
  type: "assignmentPattern";
  left: AssignmentTarget;
  right: Expression;
  start: number;
  end: number;
}

/** Rest pattern (`...rest`) / rest 模式 */
export interface RestPattern {
  type: "rest";
  argument: AssignmentTarget;
  start: number;
  end: number;
}

/** Expression union / 表达式联合 */
export type Expression =
  | LiteralExpr
  | RegexpExpr
  | IdentifierExpr
  | ThisExpr
  | SuperExpr
  | ArrayExpr
  | ObjectExpr
  | MemberExpr
  | CallExpr
  | NewExpr
  | UnaryExpr
  | UpdateExpr
  | BinaryExpr
  | LogicalExpr
  | ConditionalExpr
  | AssignmentExpr
  | SequenceExpr
  | ArrowFunctionExpr
  | FunctionExpr
  | ClassExpr
  | TemplateExpr
  | AwaitExpr
  | SpreadExpr;

/** Destructuring pattern union / 解构模式联合 */
export type Pattern =
  | IdentifierExpr
  | ObjectPattern
  | ArrayPattern
  | AssignmentPattern
  | RestPattern;

/**
 * Assignment target union: a destructuring pattern or a member/call expression.
 *
 * 赋值目标联合：解构模式、成员表达式或调用表达式。
 */
export type AssignmentTarget = Pattern | MemberExpr | CallExpr;

/** Expression statement / 表达式语句 */
export interface ExpressionStatement {
  type: "expression";
  expression: Expression;
  start: number;
  end: number;
}

/** Block statement / 块语句 */
export interface BlockStatement {
  type: "block";
  body: Statement[];
  start: number;
  end: number;
}

/** Empty statement (`;`) / 空语句 */
export interface EmptyStatement {
  type: "empty";
  start: number;
  end: number;
}

/** `debugger` statement / `debugger` 语句 */
export interface DebuggerStatement {
  type: "debugger";
  start: number;
  end: number;
}

/** A single variable declarator / 单个变量声明符 */
export interface VariableDeclarator {
  id: Pattern;
  init: Expression | null;
  start: number;
  end: number;
}

/** Variable declaration (`var`/`let`/`const`) / 变量声明 */
export interface VariableDeclaration {
  type: "variable";
  kind: "var" | "let" | "const";
  declarations: VariableDeclarator[];
  start: number;
  end: number;
}

/** Function declaration / 函数声明 */
export interface FunctionDeclaration {
  type: "functionDeclaration";
  name: string;
  params: Pattern[];
  body: BlockStatement;
  isAsync: boolean;
  start: number;
  end: number;
}

/** Class declaration / 类声明 */
export interface ClassDeclaration {
  type: "classDeclaration";
  name: string;
  superClass: Expression | null;
  body: ClassBody;
  start: number;
  end: number;
}

/** Class body / 类体 */
export interface ClassBody {
  type: "classBody";
  methods: ClassMethod[];
  start: number;
  end: number;
}

/** Class method / 类方法 */
export interface ClassMethod {
  type: "classMethod";
  kind: ClassMethodKind;
  key: Expression | string;
  computed: boolean;
  params: Pattern[];
  body: BlockStatement;
  isAsync: boolean;
  start: number;
  end: number;
}

/** `if` statement / `if` 语句 */
export interface IfStatement {
  type: "if";
  test: Expression;
  consequent: Statement;
  alternate: Statement | null;
  start: number;
  end: number;
}

/** `while` statement / `while` 语句 */
export interface WhileStatement {
  type: "while";
  test: Expression;
  body: Statement;
  start: number;
  end: number;
}

/** `do...while` statement / `do...while` 语句 */
export interface DoWhileStatement {
  type: "doWhile";
  test: Expression;
  body: Statement;
  start: number;
  end: number;
}

/** `for` statement / `for` 语句 */
export interface ForStatement {
  type: "for";
  init: VariableDeclaration | Expression | null;
  test: Expression | null;
  update: Expression | null;
  body: Statement;
  start: number;
  end: number;
}

/** `for...in` statement / `for...in` 语句 */
export interface ForInStatement {
  type: "forIn";
  left: VariableDeclaration | AssignmentTarget;
  right: Expression;
  body: Statement;
  start: number;
  end: number;
}

/** `for...of` statement / `for...of` 语句 */
export interface ForOfStatement {
  type: "forOf";
  left: VariableDeclaration | AssignmentTarget;
  right: Expression;
  body: Statement;
  start: number;
  end: number;
}

/** A single switch case / 单个 switch 分支 */
export interface SwitchCase {
  test: Expression | null;
  body: Statement[];
}

/** `switch` statement / `switch` 语句 */
export interface SwitchStatement {
  type: "switch";
  discriminant: Expression;
  cases: SwitchCase[];
  start: number;
  end: number;
}

/** `try` statement / `try` 语句 */
export interface TryStatement {
  type: "try";
  block: BlockStatement;
  handler: { param: Pattern | null; body: BlockStatement } | null;
  finalizer: BlockStatement | null;
  start: number;
  end: number;
}

/** `throw` statement / `throw` 语句 */
export interface ThrowStatement {
  type: "throw";
  argument: Expression;
  start: number;
  end: number;
}

/** `return` statement / `return` 语句 */
export interface ReturnStatement {
  type: "return";
  argument: Expression | null;
  start: number;
  end: number;
}

/** `break` statement / `break` 语句 */
export interface BreakStatement {
  type: "break";
  label: string | null;
  start: number;
  end: number;
}

/** `continue` statement / `continue` 语句 */
export interface ContinueStatement {
  type: "continue";
  label: string | null;
  start: number;
  end: number;
}

/** Labeled statement / 标签语句 */
export interface LabeledStatement {
  type: "labeled";
  label: string;
  body: Statement;
  start: number;
  end: number;
}

/** Statement union / 语句联合 */
export type Statement =
  | ExpressionStatement
  | BlockStatement
  | EmptyStatement
  | DebuggerStatement
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration
  | IfStatement
  | WhileStatement
  | DoWhileStatement
  | ForStatement
  | ForInStatement
  | ForOfStatement
  | SwitchStatement
  | TryStatement
  | ThrowStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | LabeledStatement;

/** Root program node / 根程序节点 */
export interface Program {
  type: "program";
  body: Statement[];
  start: number;
  end: number;
}

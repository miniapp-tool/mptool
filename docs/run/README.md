---
title: "@mptool/run"
icon: play
---

小程序自定义 JS 解释器，可在受限环境中执行动态下发的代码。

微信小程序出于安全考虑禁用了 `eval` 与 `new Function`，导致无法执行动态代码。`@mptool/run` 通过自研的「词法分析 → 语法分析 → AST → 求值」流水线，在受限环境下运行 **ES5 全量 + 常用 ES6 子集** 的代码，是 `eval` / `new Function` 的替代品。

::: danger 定位：受限代码执行器，不是安全沙箱

`@mptool/run` 的对象与内建直接复用宿主运行时，用户代码可以通过 `[].constructor.constructor("return this")()` 之类的手法触达宿主全局并绕过限制。它面向**受信 / 半受信**的动态代码（例如运营下发的配置与逻辑），安全能力依赖「全局白名单 + 步数/栈上限」，**不能**用于隔离恶意代码。

:::

## 快速开始

```ts
import { run, runSync, createSandbox, createFunction } from "@mptool/run";

// 一次性执行
run("1 + 2 * 3"); // 7
run("const f = async () => await Promise.resolve(5); f()"); // Promise<5>（含 async 返回 Promise）

// 同步执行（代码触发 async 则抛错）
runSync("let s = 0; for (let i = 0; i < 3; i += 1) s += i; s"); // 3

// 复用沙箱（共享全局环境）
const sandbox = createSandbox({ globals: { wx, console } });
sandbox.setGlobal("answer", 42);
sandbox.run("answer + 1"); // 43

// 替代 new Function
const fn = createFunction(["a", "b"], "return a + b;");
fn(1, 2); // 3
```

## API

### `run(code, options?)`

执行一段代码，返回**完成值**（最后一条表达式的值）。代码含 `async`/`await` 时返回 `Promise`。

### `runSync(code, options?)`

同步执行，代码触发 async 时抛出 `Error`（明确同步语义）。

### `createSandbox(options?)`

创建共享全局环境的沙箱，提供 `run` / `setGlobal` / `getGlobal`，适合多次执行并保留全局状态。

### `createFunction(args, body, options?)`

替代 `new Function`，用参数名数组与函数体创建可调用函数。每个函数拥有独立沙箱。

### 选项 `RunOptions`

| 选项       | 默认值   | 说明                                               |
| ---------- | -------- | -------------------------------------------------- |
| `globals`  | `{}`     | 显式注入宿主能力（`wx`、`console` 等，默认不暴露） |
| `maxSteps` | `1e6`    | 步数上限（防死循环）                               |
| `maxStack` | `512`    | 调用栈深度上限（防深递归）                         |
| `strict`   | `false`  | 是否以严格模式执行（全局严格模式）                 |
| `features` | 全部开启 | 特性开关：`class` / `forOf` / `async` / `bigint`   |

## 支持的语法

### 语句

- `var`、`let`、`const`（含块级作用域与 TDZ）
- `if/else`、`switch`（含 fall-through）
- `for`、`for...in`、`for...of`、`while`、`do...while`
- `try/catch/finally`、`throw`
- `return`、`break`、`continue`、**标签语句**（`label: for ...`）
- 函数声明/表达式、块、空语句、`debugger`

### 表达式与运算符

- 字面量：数字（含 `0b`/`0o`/`0x`、科学计数法）、字符串、`BigInt`（`123n`）、正则、数组、对象
- 成员访问 `.`/`[]`、**可选链 `?.`**、**空值合并 `??`**、**指数 `**`**
- 调用、`new`、`delete`、`typeof`、`void`、`instanceof`、`in`
- 一元/二元/三元/逗号运算符、赋值（含 `+=` 等复合赋值与 `&&=`/`||=`/`??=`）
- 递增/递减（`++`/`--`）
- `this`、`arguments`、`super`（类与对象字面量方法中）

### ES6+ 语法特性

| 特性                            | 说明                                                   |
| ------------------------------- | ------------------------------------------------------ |
| 箭头函数                        | 词法 `this`，支持表达式体与块体                        |
| 模板字符串                      | 支持嵌套插值 `` `a${b}c` ``                            |
| 解构赋值                        | 数组/对象/嵌套/默认值/rest，声明与赋值目标均可         |
| 默认参数 / rest 参数            | `function(a, b = 1, ...rest)`                          |
| Spread                          | 数组字面量、对象字面量、函数调用（含 `new`）           |
| 对象字面量增强                  | 简写属性、计算键 `[k]`、方法简写 `m() {}`、`__proto__` |
| `for...of`                      | 委托宿主迭代协议，支持字符串/数组/Map/Set              |
| `class` / `extends` / `super`   | 支持静态成员、getter/setter、派生类、`super()`         |
| `async` / `await`               | 见「async/await」一节                                  |
| 对象/数组 rest/spread（ES2018） | `{...a}`、`[...a]`                                     |

### 特殊语义（与标准 JS 一致）

- **函数声明提升**：函数声明在其作用域顶部**连同函数值**一起提升，可先调用后声明
  ```js
  f(); // 42
  function f() {
    return 42;
  }
  ```
- **`var` 提升**：`var` 声明提升到函数作用域顶部，初始值为 `undefined`
- **`let`/`const` TDZ**：声明前访问抛 `ReferenceError`；`const` 重赋值抛 `TypeError`
- **逐迭代 `let`**：`for (let i...)` 每次迭代创建独立绑定，闭包捕获各自的值
- **sloppy 模式**（默认）：独立函数调用中 `this` 为 `undefined` 时装箱为全局；给未声明变量赋值会创建全局；`arguments` 与命名参数映射（`arguments[0] = 9` 会同步修改 `a`）
- **严格模式**：通过 `RunOptions.strict` 开启——`this` 保持 `undefined`、未声明赋值抛 `ReferenceError`、`delete` 标识符抛错、`arguments` 不映射
- **程序完成值**：`run()` 返回最后一条表达式的值（如 `run("1 + 1")` 返回 `2`）

## 内建对象与原型方法

所有内建对象**直接委托宿主运行时**，因此宿主（微信基础库 3.8.2，iOS 14 JSCore + Chrome 86 V8 + core-js 3.38.1）支持的方法全部可用，无需逐条实现。默认暴露以下全局：

**值**：`undefined`、`NaN`、`Infinity`、`globalThis`

**全局函数**：`parseInt`、`parseFloat`、`isNaN`、`isFinite`、`encodeURI(Component)`、`decodeURI(Component)`、`escape`、`unescape`

**构造函数**：`Object`、`Array`、`String`、`Number`、`Boolean`、`Date`、`RegExp`、`Error`（及 `TypeError`/`ReferenceError`/`SyntaxError`/`RangeError`/`EvalError`/`URIError`）、`Symbol`、`BigInt`、`Map`、`Set`、`WeakMap`、`WeakSet`、`Promise`、`ArrayBuffer`、`DataView`、全部 `TypedArray`（`Int8Array`...`Float64Array`）、`JSON`、`Math`、`Reflect`

因此以下**原型/静态方法原生可用**（仅为示例，并非完整清单）：

- `Array.prototype`：`map/filter/reduce/forEach/find/includes/flat/flatMap/at` 等全部方法；`Array.isArray/from/of`
- `String.prototype`：`includes/startsWith/endsWith/repeat/padStart/padEnd/replaceAll/matchAll` 等
- `Object`：`assign/entries/values/fromEntries/create/defineProperty/getPrototypeOf/keys/setPrototypeOf` 等
- `Number`、`Math`：`isInteger/isSafeInteger`、`trunc/sign/cbrt/hypot` 等
- `Map`/`Set`/`WeakMap`/`WeakSet`：完整实例方法
- `Promise`：`all/race/allSettled/any` 等；解释器函数可作 `then` 回调与宿主互操作
- `Symbol`、`BigInt`、`Reflect`、`TypedArray`/`DataView`：完整委托
- 正则、`Date`、`JSON`、`Error` 家族：完整委托

解释器函数是**宿主可调用包装**：`[1,2,3].map(x => x * 2)` 中宿主 `map` 可直接调用解释器箭头函数；`call`/`apply`/`bind`、`instanceof` 均按宿主语义工作。

## 不支持的语法与 API

拿到文档即可确认以下内容**不可用**：

### 语法层面（解析到会报错或拒绝）

| 特性                       | 说明                                            |
| -------------------------- | ----------------------------------------------- |
| `with` 语句                | 明确不支持，解析即报错                          |
| 生成器                     | `function*` / `yield` / `yield*` 不支持         |
| `Proxy`                    | 不支持（也不暴露到全局）                        |
| 模块语法                   | `import` / `export` 不支持（单脚本执行）        |
| 标签模板                   | `` tag`...` `` 不支持                           |
| `new.target`               | 不支持                                          |
| 函数内 `"use strict"` 指令 | 未实现，仅 `RunOptions.strict` 全局严格模式生效 |

### API / 全局层面（默认不暴露）

| 内容                                   | 说明                                        |
| -------------------------------------- | ------------------------------------------- |
| `Function` 构造器                      | 不暴露（替代品是 `createFunction`）         |
| `eval`                                 | 不暴露（替代品是 `run`）                    |
| `Proxy`                                | 不暴露                                      |
| `console`、`wx`、`setTimeout` 等       | 不暴露，必须通过 `options.globals` 显式注入 |
| `Function.caller` / `arguments.caller` | 禁用                                        |
| `String.prototype.normalize`           | 不支持（宿主限制）                          |

### 已知差异（错误路径）

按设计原则，错误路径只保证「能抛错」，**不保证**错误类型、错误消息、抛错时机与标准引擎逐字一致。例如顶层 `super.x` 在 Node 抛 `SyntaxError`、在本解释器抛 `ReferenceError`——两侧都抛错但类型不同，属预期行为。基类方法内使用 `super` 也存在类似差异（Node 读取 `Object.prototype`，本解释器报错）。

## async/await

- `await` 可出现在任意表达式与控制流中（循环、`try/catch/finally`、`switch` 内均可）
- 代码含 async 时 `run()` 返回 `Promise`；`runSync()` 直接抛错
- 微信端 Promise 时序差异：基础库 3.8.2 基线（iOS 14 ≤ 15）用 `setTimeout` 模拟 Promise（宏任务），async 时序与标准不同；iOS 16+ 无差异
- **有意扩展**：async 函数内的非 async 箭头继承 async 上下文，`() => await p` 在 async 体内合法（标准引擎会拒绝）

## 安全与限制

- **步数上限** `maxSteps`（默认 `1e6`）：防止死循环耗尽 CPU
- **调用栈上限** `maxStack`（默认 `512`）：防止深递归溢出
- **全局白名单**：默认只暴露受控内建，`wx`/`console` 等必须显式注入
- **⚠️ 非沙箱**：宿主值模型可被 `[].constructor.constructor` 绕过，仅适合受信代码

## 平台要求

- **仅微信小程序**，最低基础库 **3.8.2**（iOS 14 JSCore + Chrome 86 V8 + core-js 3.38.1）
- QQ 端不在支持范围（X5 JSCore 较弱且缺 `Array.prototype.values`/`Proxy`/`normalize`），QQ 使用者需自行处理边界
- 不加入 `@mptool/all` 全量包，按需单独引入

## 错误处理原则

- 假定传入代码是**可运行的正常代码**，正常路径必须与标准语义一致
- 错误路径只要求「能抛错」，不追求错误语义逐字对齐（见「已知差异」）
- 测试采用 **golden 对照**：同一段代码在 Node 与解释器分别执行并比较结果，Node 是唯一依据

---
title: "@mptool/run"
icon: play
---

小程序自定义 JS 解释器，可在微信小程序中执行动态下发的代码，替代被禁用的 `eval` 与 `new Function`。大小约 202 kb。

框架自研了「词法分析 → 语法分析 → AST → 求值」的完整解释器流水线，在受限环境下运行 **ES5 全量 + 常用 ES6 语法**，内建对象则全部复用宿主运行时。

::: danger 不是安全沙箱

`@mptool/run` 的对象与内建直接复用宿主运行时，用户代码可以通过 `[].constructor.constructor("return this")()` 触达宿主全局并绕过限制。它面向**受信/半受信**的动态代码（如运营下发的配置与逻辑），安全能力依赖「全局白名单 + 步数/栈上限」，**不能**用于隔离恶意代码。

:::

## 快速开始

```ts
import { run, runSync, createSandbox, createFunction } from "@mptool/run";

// 一次性执行
run("1 + 2 * 3"); // 7
run("const f = async () => await Promise.resolve(5); f()"); // Promise<5>

// 同步执行（代码含 async 时抛错）
runSync("let s = 0; for (let i = 0; i < 3; i += 1) s += i; s"); // 3

// 复用沙箱，保留全局状态
const sandbox = createSandbox({ globals: { wx, console } });
sandbox.setGlobal("answer", 42);
sandbox.run("answer + 1"); // 43

// 替代 new Function
const fn = createFunction(["a", "b"], "return a + b;");
fn(1, 2); // 3
```

## API

### `run(code, options?): unknown`

- `code`: 要执行的源码
- `options`: 解释器选项，见下方

执行一段代码，返回**完成值**（最后一条表达式的值）。代码含 `async`/`await` 时返回 `Promise`。

### `runSync(code, options?): unknown`

同步执行，代码触发 async 时抛出 `Error`。

### `createSandbox(options?): Sandbox`

创建共享全局环境的沙箱，适合多次执行并保留全局状态。

- `sandbox.run(code): unknown`: 执行代码（含 async 时返回 `Promise`）
- `sandbox.setGlobal(name, value)`: 设置全局变量
- `sandbox.getGlobal(name): unknown`: 读取全局变量

### `createFunction(args, body, options?): (...args: unknown[]) => unknown`

替代 `new Function`，每个函数拥有独立沙箱。

- `args`: 参数名数组，如 `["a", "b"]`
- `body`: 函数体源码

### 选项 `RunOptions`

| 选项       | 默认值   | 说明                                           |
| ---------- | -------- | ---------------------------------------------- |
| `globals`  | `{}`     | 注入宿主能力（`wx`、`console` 等，默认不暴露） |
| `maxSteps` | `1e6`    | 步数上限，防止死循环                           |
| `maxStack` | `512`    | 调用栈深度上限，防止深递归                     |
| `strict`   | `false`  | 是否以严格模式执行                             |
| `features` | 全部开启 | 特性开关：`class`、`forOf`、`async`、`bigint`  |

## 支持的语法

### 语句

`var` / `let` / `const`、`if/else`、`switch`、`for`、`for...in`、`for...of`、`while`、`do...while`、`try/catch/finally`、`throw`、`return`、`break`、`continue`、标签语句、函数声明/表达式、块、空语句、`debugger`。

### 表达式与运算符

- 字面量：数字（`0b`/`0o`/`0x`、科学计数法）、字符串、正则、数组、对象、`BigInt`（`123n`）
- 成员访问 `.`/`[]`、可选链 `?.`、空值合并 `??`、指数 `**`
- 调用、`new`、`delete`、`typeof`、`void`、`instanceof`、`in`
- 一元/二元/三元/逗号运算符
- 赋值：`=`、复合赋值（`+=` 等）、逻辑赋值（`&&=`/`||=`/`??=`）、递增递减（`++`/`--`）
- `this`、`arguments`、`super`

### ES6+ 语法

| 特性                 | 说明                                                   |
| -------------------- | ------------------------------------------------------ |
| 箭头函数             | 词法 `this`，支持表达式体与块体                        |
| 模板字符串           | 支持嵌套插值 `` `a${b}c` ``                            |
| 解构赋值             | 数组/对象/嵌套/默认值/rest，声明与赋值目标均可         |
| 默认参数 / rest 参数 | `function(a, b = 1, ...rest)`                          |
| Spread               | 数组/对象字面量、函数调用（含 `new`）                  |
| 对象字面量增强       | 简写属性、计算键 `[k]`、方法简写 `m() {}`、`__proto__` |
| `for...of`           | 委托宿主迭代协议，支持字符串/数组/Map/Set              |
| `class`              | `extends`、`super`、静态成员、getter/setter            |
| `async` / `await`    | 见「async/await」一节                                  |

## 内建对象与原型方法

所有内建对象**直接复用宿主运行时**，本库不重复实现任何方法——宿主（微信基础库 3.8.2）支持的全部原型方法与静态方法均可用。默认暴露以下全局：

**值**: `undefined`、`NaN`、`Infinity`、`globalThis`

**全局函数**: `parseInt`、`parseFloat`、`isNaN`、`isFinite`、`encodeURI`、`decodeURI`、`encodeURIComponent`、`decodeURIComponent`、`escape`、`unescape`

**构造函数**: `Object`、`Array`、`String`、`Number`、`Boolean`、`Date`、`RegExp`、`Error`（及 `TypeError`/`ReferenceError`/`SyntaxError`/`RangeError`/`EvalError`/`URIError`）、`Symbol`、`BigInt`、`Map`、`Set`、`WeakMap`、`WeakSet`、`Promise`、`ArrayBuffer`、`DataView`、全部 `TypedArray`

**其他对象**: `JSON`、`Math`、`Reflect`

各构造函数可用的方法如下（全部可用，具体范围以宿主基础库 3.8.2 支持情况为准）：

### `Array`

静态方法: `isArray`、`from`、`of`

原型方法: `concat`、`copyWithin`、`entries`、`every`、`fill`、`filter`、`find`、`findIndex`、`findLast`、`findLastIndex`、`flat`、`flatMap`、`forEach`、`includes`、`indexOf`、`join`、`keys`、`lastIndexOf`、`map`、`pop`、`push`、`reduce`、`reduceRight`、`reverse`、`shift`、`slice`、`some`、`sort`、`splice`、`toReversed`、`toSorted`、`toSpliced`、`unshift`、`values`、`with`、`at`

### `String`

静态方法: `fromCharCode`、`fromCodePoint`、`raw`

原型方法: `at`、`charAt`、`charCodeAt`、`codePointAt`、`concat`、`endsWith`、`includes`、`indexOf`、`lastIndexOf`、`localeCompare`、`match`、`matchAll`、`normalize`、`padEnd`、`padStart`、`repeat`、`replace`、`replaceAll`、`search`、`slice`、`split`、`startsWith`、`substr`、`substring`、`toLocaleLowerCase`、`toLocaleUpperCase`、`toLowerCase`、`toUpperCase`、`trim`、`trimEnd`、`trimStart`、`valueOf`

### `Object`

静态方法: `assign`、`create`、`defineProperties`、`defineProperty`、`entries`、`freeze`、`fromEntries`、`getOwnPropertyDescriptor`、`getOwnPropertyDescriptors`、`getOwnPropertyNames`、`getOwnPropertySymbols`、`getPrototypeOf`、`hasOwn`、`is`、`isExtensible`、`isFrozen`、`isSealed`、`keys`、`preventExtensions`、`seal`、`setPrototypeOf`、`values`

原型方法: `hasOwnProperty`、`isPrototypeOf`、`propertyIsEnumerable`、`toString`、`valueOf`

### `Number` / `Math` / `Boolean`

- `Number` 静态方法: `isFinite`、`isInteger`、`isNaN`、`isSafeInteger`、`parseFloat`、`parseInt`；原型方法: `toExponential`、`toFixed`、`toPrecision`、`toString`
- `Math`: `abs`、`acos`、`acosh`、`asin`、`asinh`、`atan`、`atan2`、`atanh`、`cbrt`、`ceil`、`clz32`、`cos`、`cosh`、`exp`、`expm1`、`floor`、`fround`、`hypot`、`imul`、`log`、`log10`、`log1p`、`log2`、`max`、`min`、`pow`、`random`、`round`、`sign`、`sin`、`sinh`、`sqrt`、`tan`、`tanh`、`trunc`
- `Boolean` 原型方法: `toString`、`valueOf`

### `Date` / `RegExp` / `JSON`

- `Date` 静态方法: `now`、`parse`、`UTC`；原型方法: `getDate`、`getDay`、`getFullYear`、`getHours`、`getMilliseconds`、`getMinutes`、`getMonth`、`getSeconds`、`getTime`、`getTimezoneOffset`、`getUTCDate`、`getUTCDay`、`getUTCFullYear`、`getUTCHours`、`getUTCMilliseconds`、`getUTCMinutes`、`getUTCMonth`、`getUTCSeconds`、`setDate`、`setFullYear`、`setHours`、`setMilliseconds`、`setMinutes`、`setMonth`、`setSeconds`、`setTime`、`setUTCDate`、`setUTCFullYear`、`setUTCHours`、`setUTCMilliseconds`、`setUTCMinutes`、`setUTCMonth`、`setUTCSeconds`、`toDateString`、`toISOString`、`toJSON`、`toLocaleDateString`、`toLocaleString`、`toLocaleTimeString`、`toString`、`toTimeString`、`toUTCString`、`valueOf`
- `RegExp` 原型方法: `exec`、`test`、`toString`
- `JSON`: `parse`、`stringify`

### `Map` / `Set` / `WeakMap` / `WeakSet`

- `Map` 原型方法: `clear`、`delete`、`entries`、`forEach`、`get`、`has`、`keys`、`set`、`values`
- `Set` 原型方法: `add`、`clear`、`delete`、`difference`、`entries`、`forEach`、`has`、`intersection`、`isDisjointFrom`、`isSubsetOf`、`isSupersetOf`、`keys`、`symmetricDifference`、`union`、`values`
- `WeakMap` 原型方法: `delete`、`get`、`has`、`set`
- `WeakSet` 原型方法: `add`、`delete`、`has`

### `Promise` / `Symbol` / `BigInt` / `Reflect`

- `Promise` 静态方法: `all`、`allSettled`、`any`、`race`、`reject`、`resolve`；原型方法: `catch`、`finally`、`then`
- `Symbol` 静态方法: `for`、`keyFor`；原型方法: `toString`、`valueOf`
- `BigInt` 静态方法: `asIntN`、`asUintN`；原型方法: `toString`、`valueOf`
- `Reflect`: `apply`、`construct`、`defineProperty`、`deleteProperty`、`get`、`getOwnPropertyDescriptor`、`getPrototypeOf`、`has`、`isExtensible`、`ownKeys`、`preventExtensions`、`set`、`setPrototypeOf`

### `ArrayBuffer` / `DataView` / `TypedArray`

- `ArrayBuffer` 静态方法: `isView`；原型方法: `slice`
- `DataView` 原型方法: `getBigInt64`、`getBigUint64`、`getFloat32`、`getFloat64`、`getInt16`、`getInt32`、`getInt8`、`getUint16`、`getUint32`、`getUint8`、`setBigInt64`、`setBigUint64`、`setFloat32`、`setFloat64`、`setInt16`、`setInt32`、`setInt8`、`setUint16`、`setUint32`、`setUint8`
- `TypedArray`（`Int8Array` 等全部类型）: 支持索引访问，全部原型方法可用（委托宿主）

解释器函数是宿主可调用包装：`[1,2,3].map(x => x * 2)` 中宿主 `map` 可直接调用解释器箭头函数，`call`/`apply`/`bind`、`instanceof` 均按宿主语义工作。

## 特殊语义

- **函数声明提升**：函数声明连同函数值一起提升，可先调用后声明
  ```js
  f(); // 42
  function f() {
    return 42;
  }
  ```
- **`var` 提升**：提升到函数作用域顶部，初始值为 `undefined`
- **`let`/`const` TDZ**：声明前访问抛 `ReferenceError`；`const` 重赋值抛 `TypeError`
- **逐迭代 `let`**：`for (let i...)` 每次迭代创建独立绑定，闭包捕获各自的值
- **sloppy 模式**（默认）：独立函数调用中 `this` 为 `undefined` 时装箱为全局；给未声明变量赋值会创建全局；`arguments` 与命名参数映射
- **严格模式**：通过 `RunOptions.strict` 开启——`this` 保持 `undefined`、未声明赋值抛 `ReferenceError`、`arguments` 不映射
- **程序完成值**：`run()` 返回最后一条表达式的值（`run("1 + 1")` 返回 `2`）

## 不支持的语法与 API

### 语法

| 特性                       | 说明                                            |
| -------------------------- | ----------------------------------------------- |
| `with` 语句                | 不支持，解析即报错                              |
| 生成器                     | `function*` / `yield` / `yield*` 不支持         |
| `Proxy`                    | 不支持                                          |
| 模块语法                   | `import` / `export` 不支持（单脚本执行）        |
| 标签模板                   | `` tag`...` `` 不支持                           |
| `new.target`               | 不支持                                          |
| 函数内 `"use strict"` 指令 | 未实现，仅 `RunOptions.strict` 全局严格模式生效 |

### 全局 API

| 内容                                   | 说明                                    |
| -------------------------------------- | --------------------------------------- |
| `Function` 构造器                      | 不暴露，使用 `createFunction` 替代      |
| `eval`                                 | 不暴露，使用 `run` 替代                 |
| `Proxy`                                | 不暴露                                  |
| `console`、`wx`、`setTimeout` 等       | 不暴露，通过 `options.globals` 显式注入 |
| `Function.caller` / `arguments.caller` | 禁用                                    |

### 已知差异

错误路径只保证「能抛错」，错误类型与消息可能与标准引擎不同。例如顶层 `super.x` 在 Node 抛 `SyntaxError`、在本解释器抛 `ReferenceError`；基类方法内使用 `super`，Node 读取 `Object.prototype`、本解释器报错。

## async/await

- `await` 可出现在任意表达式与控制流中（循环、`try/catch/finally`、`switch` 内均可）
- 代码含 async 时 `run()` 返回 `Promise`；`runSync()` 抛错
- 微信端 Promise 时序：基础库 3.8.2 基线（iOS 14 ≤ 15）以 `setTimeout` 模拟 Promise（宏任务），async 时序与标准不同；iOS 16+ 无差异
- **有意扩展**：async 函数内的非 async 箭头继承 async 上下文，`() => await p` 在 async 体内合法（标准引擎会拒绝）

## 平台要求

- **仅微信小程序**，最低基础库 **3.8.2**（iOS 14 JSCore + Chrome 86 V8 + core-js 3.38.1）
- QQ 端不在支持范围（X5 JSCore 较弱且缺 `Array.prototype.values`/`Proxy`/`normalize`），QQ 使用者需自行处理
- 不加入 `@mptool/all` 全量包，按需单独引入

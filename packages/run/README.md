# @mptool/run

小程序自定义 JS 解释器（自定义 eval），支持 ES5 全量 + 常用 ES6 子集。

> 完整的能力清单（支持的语法、可用的内建与原型方法、不支持的语法与 API、特殊语义）见仓库 [`docs/run/README.md`](../../docs/run/README.md)。

## 快速开始

```ts
import { run, runSync, createSandbox, createFunction } from "@mptool/run";

run("1 + 2 * 3"); // 7
run("const f = async () => await Promise.resolve(5); f()"); // Promise<5>

const sandbox = createSandbox({ globals: { wx, console } });
sandbox.setGlobal("answer", 42);
sandbox.run("answer + 1"); // 43

const fn = createFunction(["a", "b"], "return a + b;");
fn(1, 2); // 3
```

## 定位

- **受限代码求值器**，替代被禁用的 `eval` / `new Function`，**不是安全沙箱**
- 微信小程序，最低基础库 **3.8.2**
- 内建对象全部委托宿主运行时（原型方法原生可用）
- 资源防护依赖：执行步数 / 调用栈 / 解析预算（见下）

## 选项 `RunOptions`

| 选项              | 默认值   | 说明                                                                     |
| ----------------- | -------- | ------------------------------------------------------------------------ |
| `globals`         | `{}`     | 注入宿主能力（`wx`、`console` 等）                                       |
| `global`          | `false`  | 暴露宿主 `globalThis` 自有属性（不会注入 `eval` / `Function`）           |
| `maxSteps`        | `1e6`    | 解释执行步数上限（不覆盖解析与宿主调用）                                 |
| `maxStack`        | `512`    | 调用栈深度上限                                                           |
| `maxDuration`     | 不限制   | 单次运行挂钟预算（毫秒），超时抛错；无法中断单个宿主调用内部             |
| `strict`          | `false`  | 严格模式：`this` 不装箱、未声明赋值抛错、重复形参/八进制/`eval` 赋值报错 |
| `features`        | 全部开启 | 特性开关：`class`、`forOf`、`async`、`bigint`                            |
| `maxSourceLength` | 不限制   | 源码长度上限（UTF-16 code unit）                                         |
| `maxParseDepth`   | 不限制   | 解析嵌套深度上限                                                         |
| `maxBacktracks`   | `5000`   | 解析回溯 token 预算                                                      |

> `maxSteps` 只约束解释执行；`maxDuration`（opt-in）在解释步进与宿主调用边界检查挂钟时间。解析用 `maxSourceLength`/`maxParseDepth`/`maxBacktracks`；单个宿主调用内部与永不结算的宿主 Promise 无法被打断（热更新链路已显式限制远程代码的步数/栈/源码长度）。

## 串行执行

`createSandbox()` 返回的 sandbox 必须串行使用：上一次 `run()`（以及它返回的 Promise）结算前再次调用会抛 `Runtime is not reentrant`。需要并发请使用多个 sandbox 或 `run()`。

## 已知限制（速查）

- 语法：`with`、生成器、`Proxy`、模块语法、标签模板、`new.target`、class 字段/私有字段/数字分隔符/Unicode 标识符
- 函数内 `"use strict"` 指令不生效（仅 `RunOptions.strict` 全局严格模式；class 体因此也按 sloppy 处理）
- 不强制 ASI 语句边界（缺少分号的代码仍会被接受，受限产生式已按标准处理）
- 不暴露 `Function` / `eval`，因此 `fn instanceof Function` 会抛 `ReferenceError`
- 箭头函数/方法仍拥有值为 `undefined` 的自有 `prototype`；`Class.toString()` 返回宿主编译包装而非类源码

更完整的支持清单、内建列表与语义说明见 [`docs/run/README.md`](../../docs/run/README.md)。

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
- 安全靠全局白名单 + 步数/栈上限

## 不支持（速查）

- 语法：`with`、生成器（`function*`）、`Proxy`、模块（`import`/`export`）、标签模板、`new.target`、函数内 `"use strict"` 指令
- 全局：`Function`、`eval`、`Proxy`、`console`/`wx`/`setTimeout`（需 `globals` 显式注入）

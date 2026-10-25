---
title: "@mptool/shared"
icon: share-nodes
---

`@mptool` 各包共用的基础工具。多数场景下你不需要直接安装它（`@mptool/all` / `@mptool/skyline` 已经 re-export 了常用成员），需要单独使用时可以安装：

```bash
npm i @mptool/shared
```

## 内容

| 导出                                                      | 说明                                           |
| --------------------------------------------------------- | ---------------------------------------------- |
| `Emitter` / `userEmitter`                                 | 类型安全的事件触发器                           |
| `logger` (`debug` / `info` / `warn` / `error` / `filter`) | 统一日志，按 `env` 适配小程序与 Node.js        |
| `query` (`parse` / `stringify` / `join`)                  | query string 解析与拼接                        |
| `env`                                                     | 当前运行环境：`"wx"` / `"donut"` / `"js"`      |
| `MpError`                                                 | 带 `errMsg` 的错误类型，网络与文件包统一抛出它 |
| `type` / `isFunction`                                     | 类型判断工具                                   |
| `wrapFunction`                                            | 包装函数并保留 `this` / 返回值                 |
| `lock` / `once`                                           | 防重入锁与只执行一次                           |
| `Queue` / `funcQueue` / `createQueue`                     | 串行任务队列                                   |
| `encodeBase64` / `decodeBase64`                           | `ArrayBuffer` 与 base64 互转                   |

## 使用

```ts
import { MpError, logger, query } from "@mptool/shared";

logger.warn("something happened");

const queries = query.parse("a=1&b=2"); // { a: "1", b: "2" }

throw new MpError("request failed", { code: 1001 });
```

::: tip

这些工具的实现会随包发布，但**稳定的公共 API 以各功能包（api / net / file / parser 等）为准**；直接依赖 `@mptool/shared` 的内部结构（如 `Stream`、编码表）不在兼容性承诺内。

:::

---
title: "@mptool/shared"
icon: share-nodes
---

Shared foundational utilities used by the `@mptool` packages. In most cases you do not need to install it directly (`@mptool/all` / `@mptool/skyline` already re-export the common members); install it when you want to use it on its own:

```bash
npm i @mptool/shared
```

## Contents

| Export                                                    | Description                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `Emitter` / `userEmitter`                                 | Type-safe event emitter                                               |
| `logger` (`debug` / `info` / `warn` / `error` / `filter`) | Unified logging, adapted to mini-programs and Node.js via `env`       |
| `query` (`parse` / `stringify` / `join`)                  | Query string parsing and joining                                      |
| `env`                                                     | Current runtime environment: `"wx"` / `"donut"` / `"js"`              |
| `MpError`                                                 | Error type carrying `errMsg`, thrown by the network and file packages |
| `type` / `isFunction`                                     | Type checking helpers                                                 |
| `wrapFunction`                                            | Wrap a function while preserving `this` / the return value            |
| `lock` / `once`                                           | Re-entrancy lock and run-once helper                                  |
| `Queue` / `funcQueue` / `createQueue`                     | Serial task queue                                                     |
| `encodeBase64` / `decodeBase64`                           | Convert between `ArrayBuffer` and base64                              |

## Usage

```ts
import { MpError, logger, query } from "@mptool/shared";

logger.warn("something happened");

const queries = query.parse("a=1&b=2"); // { a: "1", b: "2" }

throw new MpError("request failed", { code: 1001 });
```

::: tip

These utilities ship with the packages, but **the stable public API is defined by the feature packages (api / net / file / parser, etc.)**; relying directly on `@mptool/shared` internals (such as `Stream` or the encoding tables) is not covered by compatibility guarantees.

:::

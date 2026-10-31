---
title: "@mptool/shared"
icon: share-nodes
---

Shared foundational utilities used by the `@mptool` packages. In most cases you do not need to install it directly (`@mptool/all` / `@mptool/skyline` already re-export the common members); install it when you want to use it on its own:

```bash
npm i @mptool/shared
```

## Contents

| Export                                                    | Description                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Emitter`                                                 | Type-safe event emitter                                                               |
| `logger` (`debug` / `info` / `warn` / `error` / `filter`) | Unified logging, adapted to mini-programs and Node.js via `env`                       |
| `query` (`parse` / `stringify` / `join`)                  | Query string parsing and joining                                                      |
| `env`                                                     | Current runtime environment: `"wx"` / `"donut"` / `"js"`                              |
| `MpError`                                                 | Error type carrying a `code` and a `message`, thrown by the network and file packages |
| `type` / `isFunction`                                     | Type checking helpers                                                                 |
| `wrapFunction`                                            | Wrap a function while preserving `this` / the return value                            |
| `lock` / `once`                                           | Re-entrancy lock and run-once helper                                                  |
| `Queue` / `funcQueue` / `createQueue`                     | Serial task queue                                                                     |
| `encodeBase64` / `decodeBase64`                           | Convert between `ArrayBuffer` and base64                                              |

## Usage

```ts
import { MpError, logger, query } from "@mptool/shared";

logger.warn("something happened");

const queries = query.parse("a=1&b=2"); // { a: "1", b: "2" }

// The constructor takes a single object argument: { message?, code? }
throw new MpError({ message: "request failed", code: 1001 });
```

::: tip

`@mptool/shared` only exports the `Emitter` factory; the global event bus `userEmitter` used by the framework is exported as `emitter` by `@mptool/enhance` / `@mptool/skyline-enhance`. Import it from one of those packages when you need cross-page/component communication.

:::

::: tip

These utilities ship with the packages, but **the stable public API is defined by the feature packages (api / net / file / parser, etc.)**; relying directly on `@mptool/shared` internals (such as `Stream` or the encoding tables) is not covered by compatibility guarantees.

:::

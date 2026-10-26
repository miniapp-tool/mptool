# @mptool/mock

API mock for WeChat miniapp (`wx` + `Page` / `App` / `Component` / `Behavior` / `getCurrentPages`), for Node.js and vitest.

## Install

```bash
pnpm add -D @mptool/mock
```

## Usage

Import once in your test setup; it installs the global mini-program objects and `wx`:

```ts
import "@mptool/mock";
```

```ts
import { mockWx, wx } from "@mptool/mock";

wx.setStorageSync("token", "abc");
await wx.getStorage({ key: "token" });

mockWx.failNext("request", { type: "timeout" });
mockWx.user({ modal: "cancel" });
mockWx.auth({ "scope.camera": false });
mockWx.reset();
```

- stateful storage / file system / routing / permissions / network / system info;
- `mockWx` for failure injection, response routing, user decisions, presets, call recording, `scope()` / `reset()`;
- full event surface, navigation / lifecycle, selector-query fixtures and manager stubs.

## Docs

See <https://miniapp-tool.github.io/mock/>. API coverage and non-target list live in the docs.

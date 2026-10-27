---
title: MP Tool
icon: home
---

# MP Tool

A lightweight framework for WeChat mini-programs: enhanced app/page/component wrappers, networking, file/storage helpers, HTML/SVG parsing, text encoding, a JavaScript interpreter for hot reload, and a `wx` mock for tests.

- Repository: [miniapp-tool/mptool](https://github.com/miniapp-tool/mptool)
- License: MIT
- Chinese API reference: [中文文档](/)

## Requirements

- WeChat mini-program, base library **3.8.2+** (ES2018 output)
- Build target: ES2018 (do not raise it before checking the mini-program runtime)
- TypeScript types come from `miniprogram-api-typings` (optional peer dependency)

## Install

```bash
pnpm add @mptool/all
```

All workspace packages are bundled into the published entry points; consumers do not install the internal `@mptool/*` dependencies separately.

## Packages

| Package                   | Purpose                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `@mptool/all`             | Full bundle: api + enhance + file + net + parser + selected shared exports + globals |
| `@mptool/skyline`         | Slim bundle for WeChat Skyline: net + skyline-enhance + file + parser + globals      |
| `@mptool/enhance`         | `$App` / `$Page` / `$Component`, extra lifecycles, emitter, navigation, hot reload   |
| `@mptool/skyline-enhance` | Slim variant of `enhance` for WeChat Skyline                                         |
| `@mptool/net`             | Fetch-style `request`, `Headers`, `URLSearchParams`, `CookieStore`                   |
| `@mptool/file`            | File operations and expiring storage                                                 |
| `@mptool/api`             | `wx` API wrappers (clipboard, permissions, media, UI, update, network)               |
| `@mptool/parser`          | HTML → rich-text node parsing, SVG data URI and text helpers                         |
| `@mptool/run`             | JavaScript interpreter used for page hot reload (not bundled into `all`)             |
| `@mptool/encoder`         | UTF-8 / GBK / GB18030 `TextEncoder` / `TextDecoder`                                  |
| `@mptool/shared`          | Shared utilities (emitter, logger, query, env, errors, locks)                        |
| `@mptool/mock`            | `wx` mock for tests (dev dependency, not shipped to production)                      |

## Quick start

```ts
// app.ts
import { $App, $Config } from "@mptool/all";

$Config({
  home: "index",
  pages: {
    index: "/pages/index/index",
    detail: "/pages/detail/detail",
  },
});

$App({
  onLaunch() {
    // ...
  },
});
```

```ts
// pages/index/index.ts
import { $Page } from "@mptool/all";

$Page("index", {
  data: {
    count: 0,
  },
  onLoad() {
    this.setData({ count: this.data.count + 1 });
  },
  onTap() {
    void this.$go("detail?id=1");
  },
});
```

`$Config` must be called before `$App` / `$Page` / `$Component`; registering a page or component before configuration throws `MpError`.

## Networking

```ts
import { request } from "@mptool/net";

const response = await request("https://example.com/api", {
  method: "POST",
  body: { name: "MP Tool" },
  headers: { "Content-Type": "application/json" },
});

// The returned promise also exposes the current RequestTask and abort():
const req = request("https://example.com/large");
req.abort();
```

- Request URLs must be absolute (`https://...` or `//...`) unless a `createRequest({ server })` factory is used.
- Cookies are persisted and attached automatically; `cookieScope` selects the scope.
- `body` accepts this package's `URLSearchParams` only — convert foreign implementations with `toString()` first.

## File and storage

```ts
import { readFile, readJSON, writeFile, writeJSON, set, get } from "@mptool/file";

writeJSON("cache/profile", { name: "MP Tool" });
const profile = readJSON("cache/profile");

set("token", "abc", 3600); // expires in seconds
const token = get("token");
```

- Paths are resolved inside the user data directory; path traversal is rejected.
- `readFile` / `readJSON` return `undefined` for missing files and throw `MpError` for other failures.
- `set` / `setAsync` report failures with `MpError`; storage writes are not atomic (`keep` is documented as non-atomic).

## Enhancements

- `$App` adds `onAwake` and app-level `$on` / `$off` / `$emit` / `$emitAsync`.
- `$Page` adds `onRegister`, `onAppLaunch`, `onNavigate`, `onPreload`, `onAwake`, `$state`, `$refs`, navigation helpers and hot reload.
- `$Component` adds typed props, `$refs` and `$call`.
- `$Config` controls routes, navigation timing, hooks and hot reload.
- Page hot reload is best-effort: it never blocks registration/loading and all fetch/parse/execution failures are silent. Remote code has an execution budget (steps/stack/source length).

## Parser and SVG

```ts
import { getRichTextNodes, getText, convertSVGToDataURI } from "@mptool/parser";

const nodes = getRichTextNodes(html, { ... });
const text = getText(html);
const src = convertSVGToDataURI(svg);
```

The parser is not a sanitizer: only trusted or semi-trusted HTML should be passed. Input length/depth limits are opt-in (`maxInputLength` / `maxDepth`).

## Encoding

```ts
import { TextDecoder, TextEncoder } from "@mptool/encoder";

const bytes = new TextEncoder("gbk").encode("中文");
const text = new TextDecoder("gbk").decode(bytes);
```

`TextEncoder` accepts encoding labels as a non-standard extension; WHATWG only allows UTF-8. Supported labels: UTF-8, GBK, GB18030 (GB2312 is served by GBK labels).

## JavaScript interpreter (`@mptool/run`)

`@mptool/run` replaces the disabled `eval` / `new Function` in mini-program runtimes. It is **not bundled** into `@mptool/all` / `@mptool/skyline`; import it separately when you use page hot reload.

```ts
import { installGlobal, run, runSync, createFunction } from "@mptool/run";

installGlobal(); // mount globalThis.createFunction before pages register
const result = run("1 + 2");
const value = runSync("({ a: 1 }).a");
```

Known limits:

- The interpreter targets WeChat only (minimum base library 3.8.2); QQ is not supported.
- It is **not a security sandbox**: built-ins use the host runtime, so only trusted/semi-trusted code is in scope.
- `eval` / `Function` are not exposed; some modern syntax (class fields, private fields, numeric separators, Unicode escapes in identifiers) is not implemented.
- Resource budgets are opt-in: `maxSourceLength`, `maxParseDepth`, `maxBacktracks`, `maxSteps`, `maxStack`, `maxDuration`.

## Mock (`@mptool/mock`)

```ts
import "@mptool/mock"; // installs globalThis.wx and framework mocks
import { mockWx } from "@mptool/mock";

// configure a user decision / failure, then run the code under test
mockWx.user({ modal: "cancel" });
mockWx.network({ networkType: "wifi" });
```

`@mptool/mock` is a development dependency: it is used by this repository's tests and is not part of a production mini-program bundle. See the [English mock guide](/en/mock/) for failure injection, user decisions, supported scope and DevTools differences.

## Behavior notes

- All packages are ESM-only; `dist/index.js` plus `dist/index.d.ts`.
- `@mptool/all` / `@mptool/skyline` mount `globalThis.mptool` via `installMptoolGlobals()` for hot-reload scripts.
- The published packages inline workspace dependencies, so consumers install nothing extra.
- For the full API, examples and package-specific options, see the Chinese reference pages linked in the navigation.

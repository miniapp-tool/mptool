---
title: "@mptool/all"
icon: box
---

Full bundle: packs `@mptool/api`, `@mptool/enhance`, `@mptool/file`, `@mptool/net`, `@mptool/parser` and the common `@mptool/shared` utilities into a single ESM file, and additionally provides `installMptoolGlobals` / `mptoolGlobals`.

::: tip

`@mptool/run` (the custom JS interpreter) is **not included** in this bundle; when you need hot reload, import it separately and call `installGlobal()`.

:::

## Installation

```bash
npm i @mptool/all
# Equivalent: pnpm add @mptool/all
```

`miniprogram-api-typings` is an optional peer dependency that only provides the global mini-program types (for `.d.ts`); install it yourself when you need type hints.

## Usage

```ts
// app.ts
import { $App, $Config, installMptoolGlobals } from "@mptool/all";

$Config({
  home: "/pages/index/index",
  defaultPage: "/pages/$name",
});

// Call this when hot-reload code needs to access api / file / net / parser through globalThis.mptool
installMptoolGlobals();

$App({});
```

Pages and components use the `$Page` / `$Component` exported by the full bundle. The first argument of `$Page(name, options)` is the page short name; `$Component` declares component properties with `props` (converted to `properties` on registration, overriding any `properties` passed in):

```ts
// pages/index/index.ts
import { $Page } from "@mptool/all";

$Page("index", { data: {} });

// components/card/card.ts
import { $Component } from "@mptool/all";

$Component({
  props: {
    // component properties
  },
});
```

## Included packages

| Package           | Contents                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `@mptool/api`     | Wrappers for wx APIs such as clipboard, permissions, page info, media, network, UI and update |
| `@mptool/enhance` | `$App` / `$Page` / `$Component`, emitter, navigation lock, page hot reload                    |
| `@mptool/file`    | File operations and storage with expiration                                                   |
| `@mptool/net`     | `request` / `createRequest`, `Headers`, `URLSearchParams`, cookies                            |
| `@mptool/parser`  | HTML → rich-text node parsing                                                                 |
| `@mptool/shared`  | `Emitter`, `logger`, `query`, `env`, `MpError`, `lock` and other utilities                    |

## Global namespace

`installMptoolGlobals()` aggregates the exports of `api` / `file` / `net` / `parser` onto a non-enumerable `globalThis.mptool` for code delivered by hot reload:

```ts
import { installMptoolGlobals } from "@mptool/all";

installMptoolGlobals();

// Hot-reload code can then be written like this
// globalThis.mptool.request("https://example.com/api");
```

## WeChat DevTools

The package already declares `"miniprogram": "dist"`, so simply run "Build npm" for it in DevTools; the output is a single ESM file and contains no internal workspace dependencies.

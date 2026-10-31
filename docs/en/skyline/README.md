---
title: "@mptool/skyline"
icon: cubes
---

Full bundle for the WeChat [Skyline rendering engine](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/introduction.html) (base library 3.0+): it combines `@mptool/net`, `@mptool/skyline-enhance`, `@mptool/file` and `@mptool/parser`, and additionally provides `installMptoolGlobals` / `mptoolGlobals`.

Difference from [`@mptool/all`](/en/all/): it uses `skyline-enhance` instead of `enhance` and does **not include** `@mptool/api`. `@mptool/run` is not included either.

::: tip Runtime requirements

Skyline requires WeChat client 8.0.40+ (base library 3.0.2+); when debugging in DevTools, switch the debug base library to 3.0.0+ and configure `"renderer": "skyline"` in `app.json` / `page.json`.

:::

## Installation

```bash
npm i @mptool/skyline
# Equivalent: pnpm add @mptool/skyline
```

## Usage

```ts
// app.ts
import { $App, $Config } from "@mptool/skyline";

$Config({
  home: "/pages/index/index",
});

$App({});
```

```ts
// pages/index/index.ts
import { $Page } from "@mptool/skyline";

$Page("index", { data: {} });
```

## Included packages

| Package                   | Contents                                                                |
| ------------------------- | ----------------------------------------------------------------------- |
| `@mptool/skyline-enhance` | Skyline version of `$App` / `$Page` / `$Component`, emitter, hot reload |
| `@mptool/net`             | `request` / `createRequest`, `Headers`, cookies, etc.                   |
| `@mptool/file`            | File operations and storage with expiration                             |
| `@mptool/parser`          | HTML → rich-text node parsing                                           |
| `@mptool/shared`          | `Emitter`, `logger`, `query`, `MpError`, `lock` and other utilities     |

## Choosing between @mptool/all and @mptool/skyline

| Scenario                                                  | Choice            |
| --------------------------------------------------------- | ----------------- |
| Regular rendering engine, with the `@mptool/api` wrappers | `@mptool/all`     |
| Skyline rendering engine (base library 3.0+)              | `@mptool/skyline` |

See [`@mptool/skyline-enhance`](/en/skyline-enhance/) for differences in lifecycles and navigation.

## Global namespace

`installMptoolGlobals()` aggregates the exports of `file` / `net` / `parser` onto `globalThis.mptool` for code delivered by hot reload.

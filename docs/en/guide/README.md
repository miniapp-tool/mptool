---
title: MP Tool
icon: lightbulb
---

A lightweight enhancement framework for mini-programs.

## Installation

Every package is published as a single ESM file, so just install it with your package manager:

```bash
# Everything (api + enhance + file + net + parser + shared utilities)
npm i @mptool/all

# Skyline rendering engine (base library 3.0+)
npm i @mptool/skyline

# Only the enhancement framework itself
npm i @mptool/enhance
```

You can also use `pnpm add` / `yarn add` instead of `npm i`.

`miniprogram-api-typings` is an optional peer dependency that only provides the global type definitions of the mini-program APIs; install it when you need type hints:

```bash
npm i -D miniprogram-api-typings
```

## Importing in WeChat DevTools

1. Run one of the install commands above in the project root;
2. Open WeChat DevTools and choose "Tools → Build npm";
3. Import packages by name in your code:

```ts
import { $App, $Config, $Page, request } from "@mptool/all";
```

Each package declares `"miniprogram": "dist"`, so building npm bundles the single-file output into `miniprogram_npm`.

## Choosing a package

| Need                                                                | Recommendation                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Every capability at once                                            | [`@mptool/all`](/en/all/)                                                              |
| Skyline rendering engine                                            | [`@mptool/skyline`](/en/skyline/) or [`@mptool/skyline-enhance`](/en/skyline-enhance/) |
| Only the framework (lifecycles, communication, routing, hot reload) | [`@mptool/enhance`](/en/enhance/)                                                      |
| A replacement for `eval` / `new Function`                           | [`@mptool/run`](/en/run/)                                                              |
| Mocking `wx` in tests                                               | [`@mptool/mock`](/en/mock/)                                                            |
| Encoding conversion (GBK / GB18030)                                 | [`@mptool/encoder`](/en/encoder/)                                                      |

## Features

- [x] @mptool/mock: `wx` API mock <Badge text="W.I.P" type="warning" />
- [x] @mptool/enhance: communication framework <Badge text="Stable" />
  - Enables communication between any page and component
  - Extra lifecycles, allowing pages to call each other for preloading
  - Cross references between components and pages
  - Hot reload for page logic (used together with `@mptool/run` and `@mptool/all`)
  - For the Skyline rendering engine, use the slim build: `@mptool/skyline-enhance` (see [docs](/en/skyline-enhance/))

- [x] @mptool/file: file and storage APIs <Badge text="Stable" />
  - Set an expiration time for cached data
  - Node.js-style folder creation
  - Archive extraction API
  - Save online files

- [x] @mptool/api: general API wrappers <Badge text="Stable" />

- [x] @mptool/encoder: encoding support for UTF-8 / GBK / GB18030 <Badge text="Stable" />

- [x] @mptool/net: mini-program networking API <Badge text="Stable" />
  - Headers
  - URLSearchParams
  - Automatic cookie parsing and attachment

- [x] @mptool/parser: HTML parser <Badge text="Stable" />

- [x] @mptool/run: custom JS interpreter replacing the disabled `eval` and `new Function` <Badge text="Stable" />
  - Not included in the `@mptool/all` / `@mptool/skyline` bundles; import it separately

# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.20.0](https://github.com/miniapp-tool/mptool/compare/v0.19.0...v0.20.0) (2026-10-31)

### ⚠ BREAKING CHANGES

- `Env` no longer includes `"qq"` and `env` never evaluates to `"qq"`: a QQ runtime now falls back to `"wx"` or `"js"`, so code branching on the QQ environment has to be removed.
- the QQ-only `Set-Cookie` rewriting in `CookieStore.applyHeader()` is gone; such headers are parsed as-is by `set-cookie-parser`.
- the QQ-only `theme` option is no longer passed to `wx.showModal()` by `showModal()` / `retry()`.

### ✨ Features

- **parser:** add opt-in input length and nesting limits ([#1585](https://github.com/miniapp-tool/mptool/issues/1585)) ([b27fe1b](https://github.com/miniapp-tool/mptool/commit/b27fe1bce4b12d00f0c94f09a45ce6d8bfe5735d))

### 🐛 Bug Fixes

- **deps:** move build-time-inlined dependencies to devDependencies ([#1487](https://github.com/miniapp-tool/mptool/issues/1487)) ([2beef8c](https://github.com/miniapp-tool/mptool/commit/2beef8c115e2e35bdd20b3d245e9a942071fbf18))
- **metadata:** correct skyline package links and add missing miniprogram fields ([#1486](https://github.com/miniapp-tool/mptool/issues/1486)) ([8bab130](https://github.com/miniapp-tool/mptool/commit/8bab13013781f8f1ba1d285e6d6e6058c2131280))
- **metadata:** mark miniprogram-api-typings as an optional peer dependency ([#1512](https://github.com/miniapp-tool/mptool/issues/1512)) ([b242b45](https://github.com/miniapp-tool/mptool/commit/b242b45dbd484ccc239eabbafc29c215c50692de))
- **parser:** bound svg recursion by maxDepth ([#1641](https://github.com/miniapp-tool/mptool/issues/1641)) ([72cf87f](https://github.com/miniapp-tool/mptool/commit/72cf87f587885471989a97e76e8c6a030fb8f421))
- **parser:** encode only URI-significant characters in SVG data URIs ([#1541](https://github.com/miniapp-tool/mptool/issues/1541)) ([c41bbd9](https://github.com/miniapp-tool/mptool/commit/c41bbd9c04c18e9611a04ce8a8ddb671abf26cc5))
- **parser:** keep inline whitespace in rich text conversion ([#1511](https://github.com/miniapp-tool/mptool/issues/1511)) ([5c67497](https://github.com/miniapp-tool/mptool/commit/5c674974b6c54afcb5616e14dd295eea8f264387))
- **parser:** normalize CRLF and CR in rich text nodes to LF ([#1504](https://github.com/miniapp-tool/mptool/issues/1504)) ([7cf24a6](https://github.com/miniapp-tool/mptool/commit/7cf24a6c435e8d0091cf7f48dc9eee715e94e6e7))
- **parser:** preserve text of unknown containers and drop invisible elements ([#1531](https://github.com/miniapp-tool/mptool/issues/1531)) ([d56fb33](https://github.com/miniapp-tool/mptool/commit/d56fb3300d140e015ddea62e144d24ad1a2786e5))
- **parser:** stop mutating caller-provided DOM when converting SVG ([#1584](https://github.com/miniapp-tool/mptool/issues/1584)) ([7d6bbe7](https://github.com/miniapp-tool/mptool/commit/7d6bbe727d290e577f6e350deca99dcc8aa6aa94))
- **parser:** use the converted tag name for html/body class names ([#1540](https://github.com/miniapp-tool/mptool/issues/1540)) ([27e46fd](https://github.com/miniapp-tool/mptool/commit/27e46fd73c64ba10e501adff50eaf6cc2241bcc6))

### Documentation

- sync run/parser package READMEs and known limitations ([#1597](https://github.com/miniapp-tool/mptool/issues/1597)) ([a0c6d30](https://github.com/miniapp-tool/mptool/commit/a0c6d30d858d93935a9bfe7a513fdf71d8590f46))

### Code Refactoring

- drop QQ mini-program support ([#1498](https://github.com/miniapp-tool/mptool/issues/1498)) ([f6e43c1](https://github.com/miniapp-tool/mptool/commit/f6e43c155ed6f1fe7b843d460ba458eef2429981))

### Tests

- **parser:** reach 100% coverage ([#1617](https://github.com/miniapp-tool/mptool/issues/1617)) ([b372a25](https://github.com/miniapp-tool/mptool/commit/b372a25376fa50c0b86585354c19add4f64e7dac))

### Build System

- enable isolatedDeclarations ([a763fc6](https://github.com/miniapp-tool/mptool/commit/a763fc66e994f565fe6b3bdeac0333d025a29ee9))

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

**Note:** Version bump only for package @mptool/parser

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

**Note:** Version bump only for package @mptool/parser

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

**Note:** Version bump only for package @mptool/parser

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

**Note:** Version bump only for package @mptool/parser

## [0.16.1](https://github.com/miniapp-tool/mptool/compare/v0.16.0...v0.16.1) (2026-08-06)

### Code Refactoring

- **parser:** replace cheerio with htmlparser2 and dom-serializer ([#1407](https://github.com/miniapp-tool/mptool/issues/1407)) ([a5a47fa](https://github.com/miniapp-tool/mptool/commit/a5a47fadaa87e572302c4574dadc4d2e94a85d07))

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### ✨ Features

- **parser:** append full links to anchor text ([c089c36](https://github.com/miniapp-tool/mptool/commit/c089c36a63f1a3ea023eb036616796ca1017bc58))
- **parser:** insert line breaks between blocks in getText ([b509a84](https://github.com/miniapp-tool/mptool/commit/b509a84b334d5bf3534a3d33cc56d680dce7e2c3))

### 🐛 Bug Fixes

- **parser:** drop invalid marker camel-case svg attrs ([b5a390b](https://github.com/miniapp-tool/mptool/commit/b5a390b93f683ec84949c44d31ffa20d206a4d5f))
- **parser:** restore svg camel case attrs and fix data uri encoding ([d9c8720](https://github.com/miniapp-tool/mptool/commit/d9c872007ff0ae8af7e6242d2d6371b54a6aa083))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))

### 🐛 Bug Fixes

- **net:** correct cookie scope for repeated labels and bind forEach once ([64f559f](https://github.com/miniapp-tool/mptool/commit/64f559fc2100a08a7a3446742b731b7c55bc8a61))
- **parser:** preserve viewBox casing in svg conversion ([27dfc67](https://github.com/miniapp-tool/mptool/commit/27dfc6726339bbd8064f6a20f3a9976d0d11f0f8))

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Miscellaneous Chores

- **deps:** update dependency miniprogram-api-typings to v5.1.3 ([#1313](https://github.com/miniapp-tool/mptool/issues/1313)) ([2067f41](https://github.com/miniapp-tool/mptool/commit/2067f414e9b742f2661213494f84d902e1519f54))
- **deps:** update dependency miniprogram-api-typings to v5.2.0 ([#1333](https://github.com/miniapp-tool/mptool/issues/1333)) ([66df6b5](https://github.com/miniapp-tool/mptool/commit/66df6b588cc0acce001ee27e59d4124f16cf2273))
- **deps:** update dependency miniprogram-api-typings to v5.2.1 ([#1340](https://github.com/miniapp-tool/mptool/issues/1340)) ([3f9ecf5](https://github.com/miniapp-tool/mptool/commit/3f9ecf5eec8f12772baafddb430a6734f127fe04))
- **deps:** update dependency miniprogram-api-typings to v5.2.2 ([#1397](https://github.com/miniapp-tool/mptool/issues/1397)) ([7a20b1d](https://github.com/miniapp-tool/mptool/commit/7a20b1dd3756157d31871428479cff678506fe72))

### Tests

- fix test pollution and strengthen assertions after review ([f9878f6](https://github.com/miniapp-tool/mptool/commit/f9878f61d32863e478b1e868c2dc26ad0108db74))
- **parser:** add svg conversion tests ([e2a49d7](https://github.com/miniapp-tool/mptool/commit/e2a49d74d97a63d35b6c108963468ba9f104af4e))
- **parser:** add tests for svg, appendClass and tag filter ([6d2f724](https://github.com/miniapp-tool/mptool/commit/6d2f7243e4786de435bb8acb6542860235c43b92))
- **parser:** cover svg sizing, empty text nodes and pre-parsed input ([f4ace92](https://github.com/miniapp-tool/mptool/commit/f4ace9219dacd50a5710028da1867c4463cbaf66))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

**Note:** Version bump only for package @mptool/parser

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

**Note:** Version bump only for package @mptool/parser

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](/github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.1](https://github.com/miniapp-tool/mptool/compare/v0.11.0...v0.11.1) (2025-04-09)

### 🐛 Bug Fixes

- **parser:** avoid Buffer ([22785d5](https://github.com/miniapp-tool/mptool/commit/22785d5b5f1af69e662318db1d3ba5efd9868294))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

### ✨ Features

- **parser:** add support for html ([5698a11](https://github.com/miniapp-tool/mptool/commit/5698a11565dd951163fef5a668be2688eb5dd6cc))

## <small>0.10.14 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/parser

## <small>0.10.13 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/parser

## <small>0.10.11 (2025-02-19)</small>

- chore: tweaks ([b49e7a4](https://github.com/miniapp-tool/mptool/commit/b49e7a4))
- chore: tweaks ([5d6a952](https://github.com/miniapp-tool/mptool/commit/5d6a952))
- chore(deps): update dependency miniprogram-api-typings to v4.0.2 (#863) ([f736bab](https://github.com/miniapp-tool/mptool/commit/f736bab)), closes [#863](https://github.com/miniapp-tool/mptool/issues/863)
- chore(deps): update dependency miniprogram-api-typings to v4.0.4 (#923) ([07e8c42](https://github.com/miniapp-tool/mptool/commit/07e8c42)), closes [#923](https://github.com/miniapp-tool/mptool/issues/923)
- chore(deps): update dependency miniprogram-api-typings to v4.0.5 (#948) ([c7d90f3](https://github.com/miniapp-tool/mptool/commit/c7d90f3)), closes [#948](https://github.com/miniapp-tool/mptool/issues/948)
- feat: update linter ([2d4fefe](https://github.com/miniapp-tool/mptool/commit/2d4fefe))

## <small>0.10.10 (2024-10-12)</small>

- feat: use miniprogram-api-typings v4 ([071d8a5](https://github.com/miniapp-tool/mptool/commit/071d8a5))

## <small>0.10.9 (2024-10-06)</small>

- feat: use miniprogram-api-typings v4 ([10d6856](https://github.com/miniapp-tool/mptool/commit/10d6856))

## <small>0.10.3 (2024-08-29)</small>

**Note:** Version bump only for package @mptool/parser

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

**Note:** Version bump only for package @mptool/parser

## [0.9.1](https://github.com/miniapp-tool/mptool/compare/v0.9.0...v0.9.1) (2024-08-25)

**Note:** Version bump only for package @mptool/parser

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

**Note:** Version bump only for package @mptool/parser

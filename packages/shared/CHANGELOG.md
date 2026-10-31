# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.20.0](https://github.com/miniapp-tool/mptool/compare/v0.19.0...v0.20.0) (2026-10-31)

### ⚠ BREAKING CHANGES

- `Env` no longer includes `"qq"` and `env` never evaluates to `"qq"`: a QQ runtime now falls back to `"wx"` or `"js"`, so code branching on the QQ environment has to be removed.
- the QQ-only `Set-Cookie` rewriting in `CookieStore.applyHeader()` is gone; such headers are parsed as-is by `set-cookie-parser`.
- the QQ-only `theme` option is no longer passed to `wx.showModal()` by `showModal()` / `retry()`.

### 🐛 Bug Fixes

- **metadata:** correct skyline package links and add missing miniprogram fields ([#1486](https://github.com/miniapp-tool/mptool/issues/1486)) ([8bab130](https://github.com/miniapp-tool/mptool/commit/8bab13013781f8f1ba1d285e6d6e6058c2131280))
- **metadata:** mark miniprogram-api-typings as an optional peer dependency ([#1512](https://github.com/miniapp-tool/mptool/issues/1512)) ([b242b45](https://github.com/miniapp-tool/mptool/commit/b242b45dbd484ccc239eabbafc29c215c50692de))
- **shared,mock:** probe realtime log filter and avoid duplicate error output ([#1640](https://github.com/miniapp-tool/mptool/issues/1640)) ([07314ec](https://github.com/miniapp-tool/mptool/commit/07314ecbf2a6eccdaca1e91d6b5dd22914bf7a91))
- **shared:** make queue lifecycle safe and preserve this in once ([#1639](https://github.com/miniapp-tool/mptool/issues/1639)) ([a5c2c58](https://github.com/miniapp-tool/mptool/commit/a5c2c58de399b8f12796dc334e7669393701d58f))

### Documentation

- add sections for all, skyline, encoder and shared plus install steps ([#1566](https://github.com/miniapp-tool/mptool/issues/1566)) ([874308b](https://github.com/miniapp-tool/mptool/commit/874308b69fcb0a50c6cb5c8da68950389ddf34db))
- **shared:** document the logger output policy ([#1554](https://github.com/miniapp-tool/mptool/issues/1554)) ([81d229d](https://github.com/miniapp-tool/mptool/commit/81d229d5b0ca6a4f40f42a59a38be29e9acd2ca7))

### Code Refactoring

- drop QQ mini-program support ([#1498](https://github.com/miniapp-tool/mptool/issues/1498)) ([f6e43c1](https://github.com/miniapp-tool/mptool/commit/f6e43c155ed6f1fe7b843d460ba458eef2429981))

### Tests

- **shared:** raise coverage to 100% ([#1618](https://github.com/miniapp-tool/mptool/issues/1618)) ([af26977](https://github.com/miniapp-tool/mptool/commit/af269776ba2b84ff171bcf4c28cc2cc63e8431e2))

### Build System

- bump deps ([636a113](https://github.com/miniapp-tool/mptool/commit/636a113b6abb011973e599b694d3fc0dc6e50d6c))
- emit single-file ESM bundles for every package ([#1636](https://github.com/miniapp-tool/mptool/issues/1636)) ([a71a78b](https://github.com/miniapp-tool/mptool/commit/a71a78b16a5ac03d03a6d88522d389675ef5a1a8))
- enable isolatedDeclarations ([a763fc6](https://github.com/miniapp-tool/mptool/commit/a763fc66e994f565fe6b3bdeac0333d025a29ee9))

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

### 🐛 Bug Fixes

- **shared:** remove misplaced pure annotation in env ([c35138e](https://github.com/miniapp-tool/mptool/commit/c35138e527e1d1870d21203225acac8299c783ea))

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

**Note:** Version bump only for package @mptool/shared

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

**Note:** Version bump only for package @mptool/shared

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

**Note:** Version bump only for package @mptool/shared

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### 🐛 Bug Fixes

- **shared:** honor DEBUG flag in logger.debug and fix js error level ([2f9c40b](https://github.com/miniapp-tool/mptool/commit/2f9c40bc86d26622bdf123b69adc38e5f5d06c15))
- **shared:** keep emitting when a handler throws or rejects ([9c456ee](https://github.com/miniapp-tool/mptool/commit/9c456ee1b8385be3785a2e9cf174184408340238))
- **shared:** parse valueless query keys and avoid stuck lock/queue ([39677b1](https://github.com/miniapp-tool/mptool/commit/39677b17c2aa825c1ea4ff06a75dc05e4195356a))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))

### 🐛 Bug Fixes

- **shared:** guard wx.env access in logger.debug on js environment ([94faf1d](https://github.com/miniapp-tool/mptool/commit/94faf1d3eb10d3d0d65cd9666fcae0f89628a529))
- **shared:** keep createQueue progressing when a task rejects ([2d191d7](https://github.com/miniapp-tool/mptool/commit/2d191d7636fde6b9bdae7a74eff92fbf7846f4b6))
- **shared:** skip empty segments in query.parse ([afd05c8](https://github.com/miniapp-tool/mptool/commit/afd05c81e860016740590182b52271784108047d))

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Miscellaneous Chores

- **deps:** update dependency miniprogram-api-typings to v5.1.3 ([#1313](https://github.com/miniapp-tool/mptool/issues/1313)) ([2067f41](https://github.com/miniapp-tool/mptool/commit/2067f414e9b742f2661213494f84d902e1519f54))
- **deps:** update dependency miniprogram-api-typings to v5.2.0 ([#1333](https://github.com/miniapp-tool/mptool/issues/1333)) ([66df6b5](https://github.com/miniapp-tool/mptool/commit/66df6b588cc0acce001ee27e59d4124f16cf2273))
- **deps:** update dependency miniprogram-api-typings to v5.2.1 ([#1340](https://github.com/miniapp-tool/mptool/issues/1340)) ([3f9ecf5](https://github.com/miniapp-tool/mptool/commit/3f9ecf5eec8f12772baafddb430a6734f127fe04))
- **deps:** update dependency miniprogram-api-typings to v5.2.2 ([#1397](https://github.com/miniapp-tool/mptool/issues/1397)) ([7a20b1d](https://github.com/miniapp-tool/mptool/commit/7a20b1dd3756157d31871428479cff678506fe72))

### Tests

- fix test pollution and strengthen assertions after review ([f9878f6](https://github.com/miniapp-tool/mptool/commit/f9878f61d32863e478b1e868c2dc26ad0108db74))
- **shared:** add env detection tests ([fd8a135](https://github.com/miniapp-tool/mptool/commit/fd8a135f1a5b4017df303d18f06be95b2e402ff0))
- **shared:** cover emitAsync wildcard ([0d52b00](https://github.com/miniapp-tool/mptool/commit/0d52b00be3282942084ec05c4ad5053e87d884ad))
- **shared:** cover logger in wx environment ([a4bee4e](https://github.com/miniapp-tool/mptool/commit/a4bee4e218bb9f472ecb744d83c8397907454983))
- **shared:** cover logger info, warn, error and filter ([0a09e46](https://github.com/miniapp-tool/mptool/commit/0a09e46b3e1e3032405b025f1270feb621c91541))
- **shared:** reach 100% statement coverage ([5330d14](https://github.com/miniapp-tool/mptool/commit/5330d1447e43f5923f33e89733722217b81242dc))

### Build System

- bump deps ([1a63935](https://github.com/miniapp-tool/mptool/commit/1a63935289b5619265893465c1a21ab6a7ca478d))
- bump deps ([bda0a5a](https://github.com/miniapp-tool/mptool/commit/bda0a5a710587959cf17163bed13a5f9697fcc7a))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

### ✨ Features

- **shared:** add createQueue ([ad2070e](/github.com/miniapp-tool/mptool/commit/ad2070e1d2d9fdd707aee080ceb00ae0df03e54d))

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

**Note:** Version bump only for package @mptool/shared

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](/github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

**Note:** Version bump only for package @mptool/shared

## <small>0.10.14 (2025-03-10)</small>

- fix(shared): fix logger ([46835db](https://github.com/miniapp-tool/mptool/commit/46835db))

## <small>0.10.13 (2025-03-10)</small>

- fix: fix logger ([a2a1052](https://github.com/miniapp-tool/mptool/commit/a2a1052))

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

- feat: improve api ([3cb8dd9](https://github.com/miniapp-tool/mptool/commit/3cb8dd9))

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

### ✨ Features

- add toString() method for MpError ([4ea433c](https://github.com/miniapp-tool/mptool/commit/4ea433cc7b05305f95f4a8b8460fd234a9bc1922))

## [0.9.1](https://github.com/miniapp-tool/mptool/compare/v0.9.0...v0.9.1) (2024-08-25)

**Note:** Version bump only for package @mptool/shared

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

### ✨ Features

- refine project ([de58367](https://github.com/miniapp-tool/mptool/commit/de58367ee7ed52a842db0d1ce31b427fd61cfc34))

# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.20.0](https://github.com/miniapp-tool/mptool/compare/v0.19.0...v0.20.0) (2026-10-31)

### ⚠ BREAKING CHANGES

- `Env` no longer includes `"qq"` and `env` never evaluates to `"qq"`: a QQ runtime now falls back to `"wx"` or `"js"`, so code branching on the QQ environment has to be removed.
- the QQ-only `Set-Cookie` rewriting in `CookieStore.applyHeader()` is gone; such headers are parsed as-is by `set-cookie-parser`.
- the QQ-only `theme` option is no longer passed to `wx.showModal()` by `showModal()` / `retry()`.

### ✨ Features

- **mock:** add a user-decision model for UI and permissions ([#1587](https://github.com/miniapp-tool/mptool/issues/1587)) ([faa81af](https://github.com/miniapp-tool/mptool/commit/faa81af8eb30b059cd737cca50d91a5f2d67e415))
- **mock:** add base64, system-config, performance and page APIs ([#1603](https://github.com/miniapp-tool/mptool/issues/1603)) ([1bacf28](https://github.com/miniapp-tool/mptool/commit/1bacf28b56de841075a63931401edbf292dde95b))
- **mock:** add manager stubs, non-target allowlist and coverage guard ([#1606](https://github.com/miniapp-tool/mptool/issues/1606)) ([06beac7](https://github.com/miniapp-tool/mptool/commit/06beac7691097ae2cceaf32764f09c2280b66819))
- **mock:** add media, share and audio APIs ([#1604](https://github.com/miniapp-tool/mptool/issues/1604)) ([98a1dfd](https://github.com/miniapp-tool/mptool/commit/98a1dfd48974c4adc06f7281e3b621fc4cce7d07)), references [#1603](https://github.com/miniapp-tool/mptool/issues/1603)
- **mock:** add the mockWx control plane ([#1525](https://github.com/miniapp-tool/mptool/issues/1525)) ([147b1f9](https://github.com/miniapp-tool/mptool/commit/147b1f9d9416aebe44079b74d446e5f95d40ba80))
- **mock:** add WXML node fixtures for selector queries ([#1591](https://github.com/miniapp-tool/mptool/issues/1591)) ([69d9e0c](https://github.com/miniapp-tool/mptool/commit/69d9e0c197982d165c8e7fa560ef0feca7654fc1))
- **mock:** align storage semantics with the real runtime ([#1542](https://github.com/miniapp-tool/mptool/issues/1542)) ([802b3fd](https://github.com/miniapp-tool/mptool/commit/802b3fd31d3f8fb492ae013af3abf4a577c48af3))
- **mock:** implement every on/off event pair ([#1601](https://github.com/miniapp-tool/mptool/issues/1601)) ([1b35fc1](https://github.com/miniapp-tool/mptool/commit/1b35fc181475be7d92afa8dc9e0c8c26abcf77f0))
- **mock:** normalise the FileSystemManager and complete its API ([#1586](https://github.com/miniapp-tool/mptool/issues/1586)) ([d9bfc5e](https://github.com/miniapp-tool/mptool/commit/d9bfc5e4f6495de78315e6dba3e27bea98bf95cc))
- **mock:** simulate the page stack and page lifecycles ([#1588](https://github.com/miniapp-tool/mptool/issues/1588)) ([751964c](https://github.com/miniapp-tool/mptool/commit/751964c3ef149eda9b1d44cb3604da42ee096948))
- **mock:** trigger events from real mock behaviour ([#1602](https://github.com/miniapp-tool/mptool/issues/1602)) ([f93f2d9](https://github.com/miniapp-tool/mptool/commit/f93f2d9ea1af4d71d20f12737f5bb7ebab734763))
- **mock:** unify system information, network and env ([#1593](https://github.com/miniapp-tool/mptool/issues/1593)) ([a1cf8d8](https://github.com/miniapp-tool/mptool/commit/a1cf8d897be1582e619a6160aad4ee1a73e9af46))

### 🐛 Bug Fixes

- **mock:** align injection edge cases with the documented contract ([#1533](https://github.com/miniapp-tool/mptool/issues/1533)) ([31a8cf4](https://github.com/miniapp-tool/mptool/commit/31a8cf481bb4968014927dfaf5f0e7bbae2719b7)), references [#1525](https://github.com/miniapp-tool/mptool/issues/1525)
- **mock:** return a real RequestTask from wx.request ([#1518](https://github.com/miniapp-tool/mptool/issues/1518)) ([3550935](https://github.com/miniapp-tool/mptool/commit/3550935d0c39664bcc787d5a5ded15668365a3b9)), references [#1513](https://github.com/miniapp-tool/mptool/issues/1513)
- **mock:** settle rejected async responders, reset route regexps, restore tab pages ([#1642](https://github.com/miniapp-tool/mptool/issues/1642)) ([4037866](https://github.com/miniapp-tool/mptool/commit/4037866b58760c8f45deb9b598b15acea7e537e9))
- **shared,mock:** probe realtime log filter and avoid duplicate error output ([#1640](https://github.com/miniapp-tool/mptool/issues/1640)) ([07314ec](https://github.com/miniapp-tool/mptool/commit/07314ecbf2a6eccdaca1e91d6b5dd22914bf7a91))

### Documentation

- **mock:** close out the mock documentation ([#1625](https://github.com/miniapp-tool/mptool/issues/1625)) ([3d59edd](https://github.com/miniapp-tool/mptool/commit/3d59edd8491940dbb84a9857f76cb26f67ae4df7))

### Code Refactoring

- drop QQ mini-program support ([#1498](https://github.com/miniapp-tool/mptool/issues/1498)) ([f6e43c1](https://github.com/miniapp-tool/mptool/commit/f6e43c155ed6f1fe7b843d460ba458eef2429981))

### Tests

- **mock:** reach 100% coverage ([#1621](https://github.com/miniapp-tool/mptool/issues/1621)) ([4125224](https://github.com/miniapp-tool/mptool/commit/41252249e2db04aba4c2548ad233f343c5260b92))

### Build System

- enable isolatedDeclarations ([a763fc6](https://github.com/miniapp-tool/mptool/commit/a763fc66e994f565fe6b3bdeac0333d025a29ee9))

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

**Note:** Version bump only for package @mptool/mock

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

**Note:** Version bump only for package @mptool/mock

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

**Note:** Version bump only for package @mptool/mock

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

**Note:** Version bump only for package @mptool/mock

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### 🐛 Bug Fixes

- **mock:** make select query exec result match node count ([1fe6f75](https://github.com/miniapp-tool/mptool/commit/1fe6f7574c1e8600e3f1e832dc993977cb91eb22))
- **mock:** trigger complete callback in storage async apis ([3847a18](https://github.com/miniapp-tool/mptool/commit/3847a18e103e19ee86e08c31746c95a94f3ed42e))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))
- **mock:** add new api ([98bdc1f](https://github.com/miniapp-tool/mptool/commit/98bdc1f14b437260909b18fb8afe96c1dd175d88))
- **mock:** cover more common wx apis ([c066bfc](https://github.com/miniapp-tool/mptool/commit/c066bfc4352587f06f088f66ea6cd4b8b4970139))
- **mock:** improve api mock ([93414ae](https://github.com/miniapp-tool/mptool/commit/93414ae41dbd5d0f4db8795037916f5c2a1addef))

### 🐛 Bug Fixes

- **mock:** align FileSystemManager signatures with wx api ([6e1f8df](https://github.com/miniapp-tool/mptool/commit/6e1f8dff6326234576e67a373919c043cad7ebaa))
- **mock:** correct limitSize to 10MB in storage info ([2b635a3](https://github.com/miniapp-tool/mptool/commit/2b635a32aacb90efcfe67776a6d88863f6dca380))
- **mock:** return filePath when downloadFile receives filePath ([eb24b63](https://github.com/miniapp-tool/mptool/commit/eb24b63c8d5eadece02ee6d580c588c31699bf97))
- **mock:** return full WifiInfo in getConnectedWifi ([ea6925d](https://github.com/miniapp-tool/mptool/commit/ea6925d934f49f95af3663bfa91e46bb235ad693))
- **mock:** return singleton FileSystemManager ([ae07258](https://github.com/miniapp-tool/mptool/commit/ae072588654b910249b98075bc542e24224fb72f))

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Tests

- **file:** cover error branches and align mock fs with wx behavior ([68243f7](https://github.com/miniapp-tool/mptool/commit/68243f70827495cfa0b2c3892a331c6ec0be612f))
- fix test pollution and strengthen assertions after review ([f9878f6](https://github.com/miniapp-tool/mptool/commit/f9878f61d32863e478b1e868c2dc26ad0108db74))
- **mock:** add tests for downloadFile ([872e599](https://github.com/miniapp-tool/mptool/commit/872e599023aedcedd1b4a14d379463c6f2139b6a))
- **mock:** add tests for file system, network, ui and framework mocks ([6a1106f](https://github.com/miniapp-tool/mptool/commit/6a1106f2a09f70e7eefa270e7f1a9007f0204c06))
- **mock:** cover more ui apis ([7cc3bb1](https://github.com/miniapp-tool/mptool/commit/7cc3bb160a77a1b541903ddab76b0677de8484af))
- **mock:** cover navigation methods and request callbacks ([15d1644](https://github.com/miniapp-tool/mptool/commit/15d1644fa5003f2979043820c92da876d67e9313))
- **net:** push coverage toward 100% ([0b0036f](https://github.com/miniapp-tool/mptool/commit/0b0036f07fd76e1a212c36fa2bad2d0dd7f521ba))

### Build System

- bump deps ([1a63935](https://github.com/miniapp-tool/mptool/commit/1a63935289b5619265893465c1a21ab6a7ca478d))
- bump deps ([bda0a5a](https://github.com/miniapp-tool/mptool/commit/bda0a5a710587959cf17163bed13a5f9697fcc7a))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

**Note:** Version bump only for package @mptool/mock

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

**Note:** Version bump only for package @mptool/mock

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](/github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

**Note:** Version bump only for package @mptool/mock

## <small>0.10.11 (2025-02-19)</small>

- chore: tweaks ([b49e7a4](https://github.com/miniapp-tool/mptool/commit/b49e7a4))
- chore: tweaks ([5d6a952](https://github.com/miniapp-tool/mptool/commit/5d6a952))
- build: bump deps ([83d6a8b](https://github.com/miniapp-tool/mptool/commit/83d6a8b))
- build: bump deps ([ce3ce42](https://github.com/miniapp-tool/mptool/commit/ce3ce42))
- feat: update linter ([2d4fefe](https://github.com/miniapp-tool/mptool/commit/2d4fefe))

## <small>0.10.10 (2024-10-12)</small>

- feat: use miniprogram-api-typings v4 ([071d8a5](https://github.com/miniapp-tool/mptool/commit/071d8a5))

## <small>0.10.9 (2024-10-06)</small>

- feat: use miniprogram-api-typings v4 ([10d6856](https://github.com/miniapp-tool/mptool/commit/10d6856))

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

**Note:** Version bump only for package @mptool/mock

## [0.9.1](https://github.com/miniapp-tool/mptool/compare/v0.9.0...v0.9.1) (2024-08-25)

**Note:** Version bump only for package @mptool/mock

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

**Note:** Version bump only for package @mptool/mock

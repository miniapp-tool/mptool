# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.20.0](https://github.com/miniapp-tool/mptool/compare/v0.19.0...v0.20.0) (2026-10-31)

### ⚠ BREAKING CHANGES

- `Env` no longer includes `"qq"` and `env` never evaluates to `"qq"`: a QQ runtime now falls back to `"wx"` or `"js"`, so code branching on the QQ environment has to be removed.
- **file:** `saveFile()` now throws `MpError` instead of returning `undefined`
  on failure; `saveOnlineFile()` no longer accepts the `onTask` option — use the
  `task` property on the returned promise instead.
- the QQ-only `Set-Cookie` rewriting in `CookieStore.applyHeader()` is gone; such headers are parsed as-is by `set-cookie-parser`.
- the QQ-only `theme` option is no longer passed to `wx.showModal()` by `showModal()` / `retry()`.

### ✨ Features

- **mock:** align storage semantics with the real runtime ([#1542](https://github.com/miniapp-tool/mptool/issues/1542)) ([802b3fd](https://github.com/miniapp-tool/mptool/commit/802b3fd31d3f8fb492ae013af3abf4a577c48af3))
- **mock:** normalise the FileSystemManager and complete its API ([#1586](https://github.com/miniapp-tool/mptool/issues/1586)) ([d9bfc5e](https://github.com/miniapp-tool/mptool/commit/d9bfc5e4f6495de78315e6dba3e27bea98bf95cc))
- **mock:** unify system information, network and env ([#1593](https://github.com/miniapp-tool/mptool/issues/1593)) ([a1cf8d8](https://github.com/miniapp-tool/mptool/commit/a1cf8d897be1582e619a6160aad4ee1a73e9af46))

### 🐛 Bug Fixes

- **file:** clear the in-memory store when persisted keys are removed ([#1563](https://github.com/miniapp-tool/mptool/issues/1563)) ([1a3302a](https://github.com/miniapp-tool/mptool/commit/1a3302a0ac1c6adb04657b1bddf62593e390f5ca))
- **file:** make storage errors observable and expire once values by session ([#1544](https://github.com/miniapp-tool/mptool/issues/1544)) ([2388c24](https://github.com/miniapp-tool/mptool/commit/2388c24ccb3518dfc18cb0feb2a1dc4c17ad8c6f))
- **file:** reject paths that escape the user data directory ([#1489](https://github.com/miniapp-tool/mptool/issues/1489)) ([23ee3a6](https://github.com/miniapp-tool/mptool/commit/23ee3a65bf544931ccff5e88640ff7e74b28d15f))
- **file:** reject values writeJSON cannot serialize ([#1561](https://github.com/miniapp-tool/mptool/issues/1561)) ([ebc88a6](https://github.com/miniapp-tool/mptool/commit/ebc88a6dd72f138d3dce45214fc635c54f836faf))
- **file:** return save results and expose the download task ([#1545](https://github.com/miniapp-tool/mptool/issues/1545)) ([d37295a](https://github.com/miniapp-tool/mptool/commit/d37295acca344de59c6ff1c2d7f83d0ba56add80))
- **file:** surface read errors instead of reporting missing data ([#1560](https://github.com/miniapp-tool/mptool/issues/1560)) ([7aab403](https://github.com/miniapp-tool/mptool/commit/7aab403fc2ac9e87dcd27ab20cd8ee1a23e193c0))
- **file:** write strings and binary data as-is instead of JSON ([#1482](https://github.com/miniapp-tool/mptool/issues/1482)) ([7c1d420](https://github.com/miniapp-tool/mptool/commit/7c1d4204ae9b7faac44e8daf4c46412593d42aad))
- **metadata:** mark miniprogram-api-typings as an optional peer dependency ([#1512](https://github.com/miniapp-tool/mptool/issues/1512)) ([b242b45](https://github.com/miniapp-tool/mptool/commit/b242b45dbd484ccc239eabbafc29c215c50692de))

### Code Refactoring

- drop QQ mini-program support ([#1498](https://github.com/miniapp-tool/mptool/issues/1498)) ([f6e43c1](https://github.com/miniapp-tool/mptool/commit/f6e43c155ed6f1fe7b843d460ba458eef2429981))

### Tests

- **file:** raise coverage to 100% ([#1612](https://github.com/miniapp-tool/mptool/issues/1612)) ([1b39745](https://github.com/miniapp-tool/mptool/commit/1b3974517cbb740efd0d905b8f72709034a973f5))
- **file:** widen the storage expiry margins against slow CI ([#1555](https://github.com/miniapp-tool/mptool/issues/1555)) ([ef1cc95](https://github.com/miniapp-tool/mptool/commit/ef1cc953c60365fab0585c72e2ae36ae31f540a7))

### Build System

- enable isolatedDeclarations ([a763fc6](https://github.com/miniapp-tool/mptool/commit/a763fc66e994f565fe6b3bdeac0333d025a29ee9))

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

**Note:** Version bump only for package @mptool/file

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

**Note:** Version bump only for package @mptool/file

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

**Note:** Version bump only for package @mptool/file

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

**Note:** Version bump only for package @mptool/file

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### 🐛 Bug Fixes

- **file:** create the parent directory in saveFile ([1c0b812](https://github.com/miniapp-tool/mptool/commit/1c0b8129542696389f63bd1e97a983c2192e292e))
- **file:** log original errors and skip undefined writes ([9aad1bf](https://github.com/miniapp-tool/mptool/commit/9aad1bf5bd0d3d9cb7791887014536b62b9dd8dd))
- **file:** skip undefined writes in setAsync for keep expiry ([93e39e6](https://github.com/miniapp-tool/mptool/commit/93e39e657c10dc97c302a38febb1a20c9486e85a))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))

### 🐛 Bug Fixes

- **file:** correct error log in getAsync ([3dc915f](https://github.com/miniapp-tool/mptool/commit/3dc915fe1ce089a50aa56efdc88131165f63a8bb))
- **file:** keep permanent cache in check() and checkAsync() ([50436a9](https://github.com/miniapp-tool/mptool/commit/50436a96d69c9f5ce90b2e5eecf827250bce5256))
- **file:** lazily initialize file system manager to avoid import crash ([b11bb5b](https://github.com/miniapp-tool/mptool/commit/b11bb5bb40c81973c5ec822ec5043de97a761db4))
- **file:** read filePath result in saveOnlineFile ([ed81140](https://github.com/miniapp-tool/mptool/commit/ed811400e63e7702fd11d9ba992a054d0ebebbce))

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Miscellaneous Chores

- **deps:** update dependency miniprogram-api-typings to v5.1.3 ([#1313](https://github.com/miniapp-tool/mptool/issues/1313)) ([2067f41](https://github.com/miniapp-tool/mptool/commit/2067f414e9b742f2661213494f84d902e1519f54))
- **deps:** update dependency miniprogram-api-typings to v5.2.0 ([#1333](https://github.com/miniapp-tool/mptool/issues/1333)) ([66df6b5](https://github.com/miniapp-tool/mptool/commit/66df6b588cc0acce001ee27e59d4124f16cf2273))
- **deps:** update dependency miniprogram-api-typings to v5.2.1 ([#1340](https://github.com/miniapp-tool/mptool/issues/1340)) ([3f9ecf5](https://github.com/miniapp-tool/mptool/commit/3f9ecf5eec8f12772baafddb430a6734f127fe04))
- **deps:** update dependency miniprogram-api-typings to v5.2.2 ([#1397](https://github.com/miniapp-tool/mptool/issues/1397)) ([7a20b1d](https://github.com/miniapp-tool/mptool/commit/7a20b1dd3756157d31871428479cff678506fe72))

### Tests

- **file:** cover error branches and align mock fs with wx behavior ([68243f7](https://github.com/miniapp-tool/mptool/commit/68243f70827495cfa0b2c3892a331c6ec0be612f))
- **file:** cover put, take, once and remove in storage ([edd4df1](https://github.com/miniapp-tool/mptool/commit/edd4df1d32d6ae8d612ee3ebe985ae83db7956d2))
- **file:** cover save and readJSON edge cases ([f6d485e](https://github.com/miniapp-tool/mptool/commit/f6d485e0222509a03d91724c48a1b4ef7ef555dc))
- fix test pollution and strengthen assertions after review ([f9878f6](https://github.com/miniapp-tool/mptool/commit/f9878f61d32863e478b1e868c2dc26ad0108db74))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

**Note:** Version bump only for package @mptool/file

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

**Note:** Version bump only for package @mptool/file

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](/github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

**Note:** Version bump only for package @mptool/file

## <small>0.10.14 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/file

## <small>0.10.13 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/file

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

## <small>0.10.8 (2024-08-30)</small>

- chore: tweaks ([e4d7727](https://github.com/miniapp-tool/mptool/commit/e4d7727))

## <small>0.10.7 (2024-08-30)</small>

- feat: improve types ([15f355f](https://github.com/miniapp-tool/mptool/commit/15f355f))

## <small>0.10.3 (2024-08-29)</small>

**Note:** Version bump only for package @mptool/file

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

### ✨ Features

- add toString() method for MpError ([4ea433c](https://github.com/miniapp-tool/mptool/commit/4ea433cc7b05305f95f4a8b8460fd234a9bc1922))

## [0.9.1](https://github.com/miniapp-tool/mptool/compare/v0.9.0...v0.9.1) (2024-08-25)

**Note:** Version bump only for package @mptool/file

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

### ✨ Features

- refine project ([de58367](https://github.com/miniapp-tool/mptool/commit/de58367ee7ed52a842db0d1ce31b427fd61cfc34))

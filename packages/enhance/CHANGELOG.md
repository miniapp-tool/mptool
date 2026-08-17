# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.19.0](https://github.com/miniapp-tool/mptool/compare/v0.18.1...v0.19.0) (2026-08-17)

### Styles

- fix linter ([0a59cdd](https://github.com/miniapp-tool/mptool/commit/0a59cdd1a0e7ba763d307986e8e68da3379b1878))

## [0.18.1](https://github.com/miniapp-tool/mptool/compare/v0.18.0...v0.18.1) (2026-08-12)

**Note:** Version bump only for package @mptool/enhance

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

### ✨ Features

- **enhance:** add onHotReload hook to page hot reload ([16a8691](https://github.com/miniapp-tool/mptool/commit/16a86915a57b75a833d280989022ae4cb09c8c1b))

## [0.17.2](https://github.com/miniapp-tool/mptool/compare/v0.17.1...v0.17.2) (2026-08-10)

### 🐛 Bug Fixes

- **enhance:** skip empty hot reload responses ([14cdff7](https://github.com/miniapp-tool/mptool/commit/14cdff74da86258d9a82a6c51c662481feb7e15f))

## [0.17.1](https://github.com/miniapp-tool/mptool/compare/v0.17.0...v0.17.1) (2026-08-10)

**Note:** Version bump only for package @mptool/enhance

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### ✨ Features

- **run:** add @mptool/run package ([#1415](https://github.com/miniapp-tool/mptool/issues/1415)) ([0c284fb](https://github.com/miniapp-tool/mptool/commit/0c284fbe4cc4271c6d6e31d52cb4e3336b6df05c))

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

**Note:** Version bump only for package @mptool/enhance

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

**Note:** Version bump only for package @mptool/enhance

## [0.16.1](https://github.com/miniapp-tool/mptool/compare/v0.16.0...v0.16.1) (2026-08-06)

### Code Refactoring

- **enhance:** stop re-exporting all of shared, keep all's full surface ([#1409](https://github.com/miniapp-tool/mptool/issues/1409)) ([58254ab](https://github.com/miniapp-tool/mptool/commit/58254ab9c9e88f7e599eb36c51408c694854161e))

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### 🐛 Bug Fixes

- **enhance:** hold the navigate lock until the page transition completes ([cadc96a](https://github.com/miniapp-tool/mptool/commit/cadc96a008e3bda7374f80eacaaeb327cf5f516f))
- **enhance:** isolate onAwake listeners per page instance ([7315ce1](https://github.com/miniapp-tool/mptool/commit/7315ce19d7e6260f6eb9bd388022299a17ff12fb))
- **enhance:** normalize page path for onNavigate/onPreload event keys ([27fbd85](https://github.com/miniapp-tool/mptool/commit/27fbd854ebbe2a410931c26f65713fcc85d1fe32))
- **enhance:** skip navigateBack when already at the first page ([3ec5b78](https://github.com/miniapp-tool/mptool/commit/3ec5b785771848f1a49f486fe3c79d1cf2069a83))
- **enhance:** strip query from the wx.switchTab url ([654cc7c](https://github.com/miniapp-tool/mptool/commit/654cc7c9c1ec6e1ad317b0722ea0e624829d822c))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))
- sync enhance ([d071553](https://github.com/miniapp-tool/mptool/commit/d07155340cf7bae6ef3a28431314224c347ef119))

### 🐛 Bug Fixes

- **enhance:** clamp back delta when no home is configured ([47c8e59](https://github.com/miniapp-tool/mptool/commit/47c8e59c9ff9f94ec868308dd4924e978a4bda91))
- **enhance:** release navigation lock when onNavigate handler throws ([c1e6055](https://github.com/miniapp-tool/mptool/commit/c1e60557825dc421379b141ead78a835f0e66796))
- **enhance:** support dynamically setting component ref ([fc29fe4](https://github.com/miniapp-tool/mptool/commit/fc29fe4ab83df51c1f0b3b8d411402563437eb87))
- **enhance:** unregister onAwake listener on page unload ([c418639](https://github.com/miniapp-tool/mptool/commit/c41863997366cc52f5dc43a6ab793f27655378a3))

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Miscellaneous Chores

- **deps:** update dependency miniprogram-api-typings to v5.1.3 ([#1313](https://github.com/miniapp-tool/mptool/issues/1313)) ([2067f41](https://github.com/miniapp-tool/mptool/commit/2067f414e9b742f2661213494f84d902e1519f54))
- **deps:** update dependency miniprogram-api-typings to v5.2.0 ([#1333](https://github.com/miniapp-tool/mptool/issues/1333)) ([66df6b5](https://github.com/miniapp-tool/mptool/commit/66df6b588cc0acce001ee27e59d4124f16cf2273))
- **deps:** update dependency miniprogram-api-typings to v5.2.1 ([#1340](https://github.com/miniapp-tool/mptool/issues/1340)) ([3f9ecf5](https://github.com/miniapp-tool/mptool/commit/3f9ecf5eec8f12772baafddb430a6734f127fe04))
- **deps:** update dependency miniprogram-api-typings to v5.2.2 ([#1397](https://github.com/miniapp-tool/mptool/issues/1397)) ([7a20b1d](https://github.com/miniapp-tool/mptool/commit/7a20b1dd3756157d31871428479cff678506fe72))

### Tests

- **enhance:** cover app show and hide lifecycle ([49cb341](https://github.com/miniapp-tool/mptool/commit/49cb3411c57893f8055c280d5f518cdd265c938a))
- **enhance:** cover bind dispatch and ref attach ([95b1a34](https://github.com/miniapp-tool/mptool/commit/95b1a34af06332b88b96b6c82d807a20e3ed94d9))
- **enhance:** cover bindGo and preload in bridge ([b46f8d1](https://github.com/miniapp-tool/mptool/commit/b46f8d15058dd43c55c60cfacdaa7b0ba598831f))
- **enhance:** cover component lifetimes and methods ([9f012c1](https://github.com/miniapp-tool/mptool/commit/9f012c1ca6592332483b138f24b48b6b07087008))
- **enhance:** cover concurrent navigation lock ([0a37527](https://github.com/miniapp-tool/mptool/commit/0a37527027fa201a70f30425d135be6e600bba12))
- **enhance:** cover maxDelay timeout in navigator ([e510765](https://github.com/miniapp-tool/mptool/commit/e5107655d8abbd089f6addda989289c4c131ee5c))
- **enhance:** cover page lifecycles ([ef766b8](https://github.com/miniapp-tool/mptool/commit/ef766b8e291eb547b4e7461ec83d6c4d4b584c1d))
- **enhance:** fix ready and unload emit assertions ([e9c8d66](https://github.com/miniapp-tool/mptool/commit/e9c8d66a8f67e7ea2036c68d6cfb3c7c5b1a4ee5))

### Build System

- bump deps ([bda0a5a](https://github.com/miniapp-tool/mptool/commit/bda0a5a710587959cf17163bed13a5f9697fcc7a))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

**Note:** Version bump only for package @mptool/enhance

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

**Note:** Version bump only for package @mptool/enhance

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](/github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

**Note:** Version bump only for package @mptool/enhance

## <small>0.10.14 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/enhance

## <small>0.10.13 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/enhance

## <small>0.10.12 (2025-03-03)</small>

- style: update linter ([363173d](https://github.com/miniapp-tool/mptool/commit/363173d))

## <small>0.10.11 (2025-02-19)</small>

- chore: tweaks ([b49e7a4](https://github.com/miniapp-tool/mptool/commit/b49e7a4))
- chore: tweaks ([5d6a952](https://github.com/miniapp-tool/mptool/commit/5d6a952))
- chore(deps): update dependency miniprogram-api-typings to v4.0.2 (#863) ([f736bab](https://github.com/miniapp-tool/mptool/commit/f736bab)), closes [#863](https://github.com/miniapp-tool/mptool/issues/863)
- chore(deps): update dependency miniprogram-api-typings to v4.0.4 (#923) ([07e8c42](https://github.com/miniapp-tool/mptool/commit/07e8c42)), closes [#923](https://github.com/miniapp-tool/mptool/issues/923)
- chore(deps): update dependency miniprogram-api-typings to v4.0.5 (#948) ([c7d90f3](https://github.com/miniapp-tool/mptool/commit/c7d90f3)), closes [#948](https://github.com/miniapp-tool/mptool/issues/948)
- feat: update linter ([2d4fefe](https://github.com/miniapp-tool/mptool/commit/2d4fefe))

## <small>0.10.10 (2024-10-12)</small>

- feat: use miniprogram-api-typings v4 ([071d8a5](https://github.com/miniapp-tool/mptool/commit/071d8a5))
- test: improve types ([e922418](https://github.com/miniapp-tool/mptool/commit/e922418))

## <small>0.10.9 (2024-10-06)</small>

- feat: use miniprogram-api-typings v4 ([10d6856](https://github.com/miniapp-tool/mptool/commit/10d6856))
- test: improve types ([e922418](https://github.com/miniapp-tool/mptool/commit/e922418))

## <small>0.10.7 (2024-08-30)</small>

- chore: update typings ([2e09144](https://github.com/miniapp-tool/mptool/commit/2e09144))
- feat: improve types ([15f355f](https://github.com/miniapp-tool/mptool/commit/15f355f))

## <small>0.10.6 (2024-08-29)</small>

- feat: add correct export ([66ad686](https://github.com/miniapp-tool/mptool/commit/66ad686))

## <small>0.10.5 (2024-08-29)</small>

- feat(enhance): export navigator methods ([d9c9cb5](https://github.com/miniapp-tool/mptool/commit/d9c9cb5))

## <small>0.10.3 (2024-08-29)</small>

**Note:** Version bump only for package @mptool/enhance

## [0.10.0](https://github.com/miniapp-tool/mptool/compare/v0.9.1...v0.10.0) (2024-08-26)

**Note:** Version bump only for package @mptool/enhance

## [0.9.1](https://github.com/miniapp-tool/mptool/compare/v0.9.0...v0.9.1) (2024-08-25)

**Note:** Version bump only for package @mptool/enhance

## [0.9.0](https://github.com/miniapp-tool/mptool/compare/v0.8.6...v0.9.0) (2024-08-03)

### ✨ Features

- refine project ([de58367](https://github.com/miniapp-tool/mptool/commit/de58367ee7ed52a842db0d1ce31b427fd61cfc34))

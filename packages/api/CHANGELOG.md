# Change Log

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.18.0](https://github.com/miniapp-tool/mptool/compare/v0.17.2...v0.18.0) (2026-08-12)

**Note:** Version bump only for package @mptool/api

## [0.17.0](https://github.com/miniapp-tool/mptool/compare/v0.16.3...v0.17.0) (2026-08-10)

### Build System

- bump deps ([66737b6](https://github.com/miniapp-tool/mptool/commit/66737b6c01a164bbf5597cb7a01db44460df20d6))

## [0.16.3](https://github.com/miniapp-tool/mptool/compare/v0.16.2...v0.16.3) (2026-08-06)

**Note:** Version bump only for package @mptool/api

## [0.16.2](https://github.com/miniapp-tool/mptool/compare/v0.16.1...v0.16.2) (2026-08-06)

**Note:** Version bump only for package @mptool/api

## [0.16.1](https://github.com/miniapp-tool/mptool/compare/v0.16.0...v0.16.1) (2026-08-06)

### Code Refactoring

- **api:** extract the shared permission flow into withScope ([#1410](https://github.com/miniapp-tool/mptool/issues/1410)) ([bb9bfd6](https://github.com/miniapp-tool/mptool/commit/bb9bfd653a1067edd6aff262d1aa2ba2b063bff2))

## [0.16.0](https://github.com/miniapp-tool/mptool/compare/v0.15.0...v0.16.0) (2026-08-06)

### 🐛 Bug Fixes

- **api:** avoid duplicating the extension in saveDocument ([f1a4fae](https://github.com/miniapp-tool/mptool/commit/f1a4fae3ea30ff103f80d9092b5eddfe831dfd64))
- **api:** reject on wx api failures in addContact and savePhoto ([d4f670f](https://github.com/miniapp-tool/mptool/commit/d4f670f727b9c83699e819c31345b8876c4192ce))
- **api:** scale wifi signal threshold by platform ([83b6ed0](https://github.com/miniapp-tool/mptool/commit/83b6ed04df52c3a85190291428bda517150c31a9))
- **api:** strip query and hash from the url when deriving the file name ([7da364e](https://github.com/miniapp-tool/mptool/commit/7da364e85639db7f1e93d484efeade12b9ee9583))

### Code Refactoring

- **api:** simplify saveDocument file name derivation ([f68c714](https://github.com/miniapp-tool/mptool/commit/f68c714dead92349bf9d6bf107bd372540fee6b8))

## [0.15.0](https://github.com/miniapp-tool/mptool/compare/v0.14.0...v0.15.0) (2026-08-05)

### ✨ Features

- improve mock ([e2dc48e](https://github.com/miniapp-tool/mptool/commit/e2dc48ed15151c879f247ad089b5e7560e64b27d))

### 🐛 Bug Fixes

- **api:** handle 4g/5g as healthy network in reportNetworkStatus ([9175666](https://github.com/miniapp-tool/mptool/commit/9175666d33cc2b27ff7f3deb8a5aefbf4a6fb492))

### Styles

- update linter ([6fd2652](https://github.com/miniapp-tool/mptool/commit/6fd2652bc5552ea57a5d1bcaa49b6f3067ce9fbb))

### Miscellaneous Chores

- **deps:** update dependency miniprogram-api-typings to v5.1.3 ([#1313](https://github.com/miniapp-tool/mptool/issues/1313)) ([2067f41](https://github.com/miniapp-tool/mptool/commit/2067f414e9b742f2661213494f84d902e1519f54))
- **deps:** update dependency miniprogram-api-typings to v5.2.0 ([#1333](https://github.com/miniapp-tool/mptool/issues/1333)) ([66df6b5](https://github.com/miniapp-tool/mptool/commit/66df6b588cc0acce001ee27e59d4124f16cf2273))
- **deps:** update dependency miniprogram-api-typings to v5.2.1 ([#1340](https://github.com/miniapp-tool/mptool/issues/1340)) ([3f9ecf5](https://github.com/miniapp-tool/mptool/commit/3f9ecf5eec8f12772baafddb430a6734f127fe04))
- **deps:** update dependency miniprogram-api-typings to v5.2.2 ([#1397](https://github.com/miniapp-tool/mptool/issues/1397)) ([7a20b1d](https://github.com/miniapp-tool/mptool/commit/7a20b1dd3756157d31871428479cff678506fe72))

### Tests

- **api:** add confirm test ([4b08479](https://github.com/miniapp-tool/mptool/commit/4b08479f5e219803ddfb637124a09cf96006832a))
- **api:** add tests for update, report and document ([9b71171](https://github.com/miniapp-tool/mptool/commit/9b711711579d10538544622298b0a9044dd7a7a0))
- **api:** cover already-authorized paths for addContact and savePhoto ([d29bdf4](https://github.com/miniapp-tool/mptool/commit/d29bdf40eefd7a3b46c477b23d52b101c5aac634))
- **api:** cover authorization deny paths for addContact and savePhoto ([51a8e4c](https://github.com/miniapp-tool/mptool/commit/51a8e4c21530358b28be1ad5d06c18509432c08e))
- **api:** cover download and showToast failure paths ([bd8a204](https://github.com/miniapp-tool/mptool/commit/bd8a20462f1d56277e36b692df3421f4c5d821d7))
- **api:** cover non-200 download response ([48c0180](https://github.com/miniapp-tool/mptool/commit/48c01808ccff9310f11920c3aefc09280486283b))
- **api:** cover update, confirm, retry and clipboard branches ([3a32a94](https://github.com/miniapp-tool/mptool/commit/3a32a94f292b9d11523e9ff10b4b52970654c34a))
- **api:** rewrite document tests to verify real behavior ([f951f7f](https://github.com/miniapp-tool/mptool/commit/f951f7f043b34f3cab320fffe15e69901e5c3bba))

### Build System

- bump deps ([bda0a5a](https://github.com/miniapp-tool/mptool/commit/bda0a5a710587959cf17163bed13a5f9697fcc7a))

## [0.14.0](/github.com/miniapp-tool/mptool/compare/v0.13.0...v0.14.0) (2026-04-22)

### ⚠ BREAKING CHANGES

- convert to pure esm and add correct polyfill for buffer

### ✨ Features

- convert to pure esm and add correct polyfill for buffer ([2f7d0c3](/github.com/miniapp-tool/mptool/commit/2f7d0c371098fef2161d6ed526200763a04cd828))

## [0.13.0](/github.com/miniapp-tool/mptool/compare/v0.12.2...v0.13.0) (2026-04-16)

**Note:** Version bump only for package @mptool/api

## [0.12.2](/github.com/miniapp-tool/mptool/compare/v0.12.1...v0.12.2) (2026-04-14)

### 🐛 Bug Fixes

- fix confirm api ([688d4e4](/github.com/miniapp-tool/mptool/commit/688d4e404b9e629fc53b91e6f983c7cd45e1e12e))

## [0.12.1](/github.com/miniapp-tool/mptool/compare/v0.12.0...v0.12.1) (2026-04-13)

**Note:** Version bump only for package @mptool/api

## [0.12.0](/github.com/miniapp-tool/mptool/compare/v0.11.1...v0.12.0) (2025-07-27)

### ✨ Features

- bump deps ([3636bdc](/github.com/miniapp-tool/mptool/commit/3636bdcd328ff5453b3b9bfde78a035e3dc6c08a))

## [0.11.0](https://github.com/miniapp-tool/mptool/compare/v0.10.14...v0.11.0) (2025-04-09)

**Note:** Version bump only for package @mptool/api

## <small>0.10.14 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/api

## <small>0.10.13 (2025-03-10)</small>

**Note:** Version bump only for package @mptool/api

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

## <small>0.10.4 (2024-08-29)</small>

- fix(api): fix confirm and retry ([9f93b67](https://github.com/miniapp-tool/mptool/commit/9f93b67))

## <small>0.10.3 (2024-08-29)</small>

- feat: improve api ([3cb8dd9](https://github.com/miniapp-tool/mptool/commit/3cb8dd9))

## <small>0.10.2 (2024-08-28)</small>

- fix(api): fix api name ([eb34e40](https://github.com/miniapp-tool/mptool/commit/eb34e40))

## <small>0.10.1 (2024-08-28)</small>

- feat: add api package ([cff4cf6](https://github.com/miniapp-tool/mptool/commit/cff4cf6))
